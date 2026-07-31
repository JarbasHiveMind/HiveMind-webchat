"""Headless launcher: serve the webchat UI and (optionally) bridge to a hub.

The legacy launcher bundled a full Mycroft core, message bus and the
``jarbas_hive_mind`` listener in a single process. That hub + skills stack
now lives in separate, modern projects:

  - the hub server: ``hivemind-core`` (https://github.com/JarbasHiveMind/HiveMind-core)
  - the skills/agent: ``ovos-core``

This launcher therefore only starts the webchat HTTP server and, when given
HiveMind credentials, an optional headless ``hivemind-bus-client`` bridge to
an already-running hub. Point a browser at the served page to chat.
"""
import argparse
import time

from ovos_utils import create_daemon
from ovos_utils.log import LOG

from hivemind_webchat import webchat
from hivemind_webchat.bridge import WebchatBridge


def start_webchat(port=9090):
    create_daemon(webchat.main, args=(port,))


def start_bridge(access_key, host, port, password, self_signed):
    bridge = WebchatBridge(access_key=access_key,
                           host=host,
                           port=port,
                           password=password,
                           self_signed=self_signed)
    bridge.start()
    return bridge


def main():
    parser = argparse.ArgumentParser(description="Serve HiveMind WebChat")
    parser.add_argument("--webchat-port", type=int, default=9090,
                        help="port to serve the webchat UI (default 9090)")
    parser.add_argument("--access-key", default=None,
                        help="HiveMind access key for the optional headless bridge")
    parser.add_argument("--host", default="ws://127.0.0.1",
                        help="HiveMind hub host (default ws://127.0.0.1)")
    parser.add_argument("--port", type=int, default=5678,
                        help="HiveMind hub port (default 5678)")
    parser.add_argument("--password", default=None, help="HiveMind password")
    parser.add_argument("--self-signed", action="store_true",
                        help="accept self-signed ssl certificates")
    args = parser.parse_args()

    start_webchat(args.webchat_port)

    if args.access_key:
        LOG.info("starting headless bridge to HiveMind hub")
        start_bridge(args.access_key, args.host, args.port,
                     args.password, args.self_signed)
    else:
        LOG.info("no --access-key given; serving UI only "
                 "(browser connects to the hub directly)")

    # webchat runs in its own thread; block here.
    try:
        while True:
            time.sleep(5)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
