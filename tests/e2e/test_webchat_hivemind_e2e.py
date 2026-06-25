"""REAL end-to-end tests for HiveMind WebChat's Python backend.

These exercise the webchat's **real** ``WebchatBridge`` (the server-side
``hivemind-bus-client`` client that the page's browser frontend mirrors) against
a **real** hivemind-core hub over a localhost WebSocket:

    browser text input  (mocked frontend surface)
        -> real WebchatBridge.say()
        -> HiveMessageType.BUS / recognizer_loop:utterance on the bridge's REAL
           HiveMessageBusClient
        -> real WebSocket -> real hivemind-core hub -> agent bus injection

and the reverse ``speak`` leg:

    hub agent emits `speak` routed to the webchat peer
        -> real WebSocket -> bridge's REAL HiveMessageBusClient
        -> real WebchatBridge.handle_speak
        -> rendered back to the (mocked) browser chat log

Everything between the webchat backend and the hub is the genuine production
``HiveMessageBusClient`` + hivemind-core stack over a localhost WebSocket
(hivescope's loopback hub). Only the *browser/websocket frontend* is mocked: the
browser does not run here, so user input is injected by calling the bridge's
``say()`` (exactly what ``static/js/app.js`` does on the wire), and rendered
``speak`` replies are captured from ``handle_speak`` instead of being painted
into the DOM. There is no importorskip / skipif — the full 2.x stack is a hard
``[e2e]`` dependency.
"""
import time
from unittest.mock import patch

import pytest
from ovos_bus_client.message import Message
from hivemind_bus_client import HiveMessageBusClient

from hivescope.topology import TopologyBuilder

from hivemind_webchat.bridge import WebchatBridge


pytestmark = pytest.mark.timeout(60)

SAT_KEY = "webchat-sat"
SAT_PASSWORD = "webchat-pass"


# ---------------------------------------------------------------------------
# Loopback hub + real webchat bridge helpers.
# ---------------------------------------------------------------------------

def _hub_with_satellite(allowed_types):
    """Boot a real loopback hub and pre-register one webchat satellite key."""
    b = TopologyBuilder()
    m = b.add_master("M0", use_loopback=True)
    m.register_satellite(SAT_KEY, password=SAT_PASSWORD,
                         allowed_types=allowed_types)
    b.start_all()
    return b, m


def _host_port(url):
    bare = url.replace("ws://", "").replace("wss://", "").rstrip("/")
    host, port = bare.split(":")
    return "ws://" + host, int(port)


def _make_bridge(url, rendered=None):
    """Construct the REAL WebchatBridge against the loopback hub.

    The bridge builds a genuine HiveMessageBusClient and completes a real
    handshake. The browser frontend is mocked by wrapping ``handle_speak`` so
    rendered replies land in ``rendered`` (a stand-in for the browser chat log)
    instead of a DOM.
    """
    host, port = _host_port(url)
    bridge = WebchatBridge(
        access_key=SAT_KEY,
        host=host,
        port=port,
        password=SAT_PASSWORD,
        self_signed=False,
    )
    if rendered is not None:
        real_handle = bridge.handle_speak

        def _render(message):
            utt = real_handle(message)
            rendered.append(utt)
            return utt

        bridge.bus.on_mycroft("speak", _render)

    deadline = time.time() + 15
    while time.time() < deadline and not bridge.bus.handshake_event.is_set():
        time.sleep(0.1)
    assert bridge.bus.handshake_event.is_set(), \
        "webchat bridge handshake did not complete"
    return bridge


# ---------------------------------------------------------------------------
# Inbound: real browser text -> real bridge -> hub agent bus injection.
# ---------------------------------------------------------------------------

def test_chat_message_reaches_hub_as_utterance():
    """A chat message typed in the (mocked) browser, relayed by the real
    WebchatBridge.say(), is decrypted by the real hub and injected on the agent
    bus as a recognizer_loop:utterance.

    Only the browser frontend is faked; the bridge, encryption,
    HiveMessageBusClient and hub bus protocol are all production code.
    """
    b, m = _hub_with_satellite(["recognizer_loop:utterance", "speak"])
    bridge = None
    try:
        bridge = _make_bridge(m.network_protocol.url)
        time.sleep(1)  # let the encrypted HELLO register the peer
        assert len(m.connected_peers()) == 1, \
            f"expected 1 connected peer, got {m.connected_peers()}"

        bridge.say("what time is it")

        deadline = time.time() + 10
        while time.time() < deadline and not m.agent_protocol.last_injected(
                "recognizer_loop:utterance"):
            time.sleep(0.05)

        injected = m.agent_protocol.last_injected("recognizer_loop:utterance")
        assert injected is not None, \
            "no recognizer_loop:utterance reached the hub agent bus"
        assert injected.data["utterances"] == ["what time is it"]
    finally:
        if bridge is not None:
            bridge.bus.close()
        b.stop_all()


def test_bridge_constructs_with_real_handshake():
    """The REAL WebchatBridge constructs against the real HiveMind bus, binds its
    speak handler, and the bus completes a real handshake with the hub.

    Proves the webchat backend works on the 2.x stack without a browser.
    """
    b, m = _hub_with_satellite(["recognizer_loop:utterance"])
    bridge = None
    try:
        bridge = _make_bridge(m.network_protocol.url)
        time.sleep(1)
        assert len(m.connected_peers()) == 1
        assert isinstance(bridge.bus, HiveMessageBusClient)
        assert bridge.bus.handshake_event.is_set()
    finally:
        if bridge is not None:
            bridge.bus.close()
        b.stop_all()


# ---------------------------------------------------------------------------
# Round-trip: chat message -> hub -> speak response routed back to the webchat.
# ---------------------------------------------------------------------------

def test_speak_response_routed_back_to_webchat():
    """A `speak` emitted by the hub agent and routed to the webchat peer arrives
    on the bridge's real bus and the real handle_speak renders it back to the
    (mocked) browser chat log.

    This is the hub -> webchat backend -> browser leg, all production code apart
    from the mocked browser surface (the rendered text is captured instead of
    painted into the DOM).
    """
    b, m = _hub_with_satellite(["recognizer_loop:utterance", "speak"])
    bridge = None
    try:
        rendered = []
        bridge = _make_bridge(m.network_protocol.url, rendered=rendered)
        time.sleep(1)
        assert len(m.connected_peers()) == 1
        peer = m.connected_peers()[0]

        m.emit_on_bus(Message(
            "speak",
            {"utterance": "the time is noon", "lang": "en-US"},
            {"destination": [peer]},
        ))

        deadline = time.time() + 10
        while time.time() < deadline and not rendered:
            time.sleep(0.05)

        assert rendered, "the hub speak was never rendered back to the webchat"
        assert rendered[0] == "the time is noon"
    finally:
        if bridge is not None:
            bridge.bus.close()
        b.stop_all()


def test_full_chat_roundtrip():
    """End-to-end chat: a message goes browser -> bridge -> hub, the hub agent
    answers with a `speak` routed back -> bridge -> browser.

    The complete loop over the real HiveMessageBusClient + real hub, with only
    the browser frontend mocked (text injected via say(), reply captured from
    the rendered chat log).
    """
    b, m = _hub_with_satellite(["recognizer_loop:utterance", "speak"])
    bridge = None
    try:
        rendered = []
        bridge = _make_bridge(m.network_protocol.url, rendered=rendered)
        time.sleep(1)
        peer = m.connected_peers()[0]

        # the hub agent answers any incoming utterance with a canned speak
        def _answer(msg):
            m.emit_on_bus(Message(
                "speak",
                {"utterance": "hello from the hive", "lang": "en-US"},
                {"destination": [peer]},
            ))

        m.agent_protocol.bus.on("recognizer_loop:utterance", _answer)

        bridge.say("hello there")

        deadline = time.time() + 10
        while time.time() < deadline and not rendered:
            time.sleep(0.05)

        # forward leg landed on the hub
        injected = m.agent_protocol.last_injected("recognizer_loop:utterance")
        assert injected is not None
        assert injected.data["utterances"] == ["hello there"]
        # reverse leg rendered back in the (mocked) browser chat log
        assert rendered and rendered[0] == "hello from the hive"
    finally:
        if bridge is not None:
            bridge.bus.close()
        b.stop_all()
