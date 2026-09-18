"""Smoke tests: import the package and construct the server / bridge without
binding a socket or connecting to a hub."""
from unittest.mock import patch


def test_version():
    from hivemind_webchat.version import __version__
    assert isinstance(__version__, str)
    assert __version__[0].isdigit()


def test_import_package():
    import hivemind_webchat
    from hivemind_webchat import WebChat
    assert WebChat is not None


def test_construct_webchat_server_no_listen():
    """The tornado server is a thread; constructing it must not bind a port."""
    from hivemind_webchat import WebChat
    server = WebChat(port=9090)
    assert server.port == 9090
    # the constructor must not have started the thread or bound a socket
    assert not server.is_alive()


def test_get_ip_returns_string():
    from hivemind_webchat import get_ip
    ip = get_ip()
    assert isinstance(ip, str)
    assert ip


def test_construct_bridge_without_connecting():
    """The hivemind-bus-client bridge must construct without connecting when
    handed a pre-built (mocked) client bus."""
    from hivemind_webchat.bridge import WebchatBridge

    fake_bus = type("FakeBus", (), {})()
    fake_bus.on_mycroft = lambda *a, **k: None
    emitted = []
    fake_bus.emit = lambda msg, *a, **k: emitted.append(msg)

    bridge = WebchatBridge(bus=fake_bus)
    assert bridge.platform == "HivemindWebChatBridge"

    bridge.say("hello world")
    assert len(emitted) == 1


def test_bridge_connects_via_client_when_no_bus():
    """Without a supplied bus, the bridge builds a HiveMessageBusClient and
    calls connect() exactly once. The client is mocked so no socket is opened."""
    with patch("hivemind_webchat.bridge.HiveMessageBusClient") as MockClient:
        instance = MockClient.return_value
        from hivemind_webchat.bridge import WebchatBridge
        bridge = WebchatBridge(access_key="key", host="ws://127.0.0.1", port=5678)
        MockClient.assert_called_once()
        instance.connect.assert_called_once()
        instance.on_mycroft.assert_called_once()
        assert bridge.bus is instance
