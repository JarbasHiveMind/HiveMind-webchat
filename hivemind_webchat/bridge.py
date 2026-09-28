"""Optional headless bridge to a HiveMind hub.

The browser UI (``static/js/app.js`` + HiveMind-js) connects to the hub
directly, so the webchat HTTP server itself does not need a Python hub
connection. This module provides an optional server-side bridge built on
``hivemind-bus-client`` for headless relay / testing — e.g. forwarding
utterances to a hub and logging ``speak`` responses without a browser.
"""
from threading import Thread

from hivemind_bus_client import HiveMessageBusClient, HiveMessage, HiveMessageType
from ovos_bus_client import Message
from ovos_utils.log import LOG


class WebchatBridge(Thread):
    """Connect to a HiveMind hub as a client and relay utterances."""

    platform = "HivemindWebChatBridge"

    def __init__(self, access_key=None,
                 host="ws://127.0.0.1",
                 port=5678,
                 password=None,
                 self_signed=False,
                 lang="en-us",
                 bus=None):
        super().__init__()
        self.lang = lang
        if bus is not None:
            # caller supplied an already-connected client
            self.bus = bus
        else:
            self.bus = HiveMessageBusClient(access_key,
                                            host=host,
                                            port=port,
                                            password=password,
                                            self_signed=self_signed)
            self.bus.connect()
        self.bus.on_mycroft("speak", self.handle_speak)

    def say(self, utterance):
        """Forward a user utterance to the hub."""
        msg = Message("recognizer_loop:utterance",
                      {"utterances": [utterance], "lang": self.lang},
                      {"destination": "hive"})
        # a bare MycroftMessage is wrapped into a HiveMessageType.BUS message
        # by the client; wrap explicitly to keep the intent obvious.
        self.bus.emit(HiveMessage(HiveMessageType.BUS, payload=msg))

    def handle_speak(self, message):
        """Log a ``speak`` response coming back from the hub."""
        utterance = message.data.get("utterance", "")
        LOG.info(f"HiveMind: {utterance}")
        return utterance

    def run(self):
        # placeholder loop for use as a daemon thread; the browser UI is the
        # primary input path, this only keeps a headless connection alive.
        self.bus.run_forever()
