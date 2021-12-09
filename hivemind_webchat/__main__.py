import argparse

from hivemind_webchat import webchat


def main():
    parser = argparse.ArgumentParser(description="Start HiveMind WebChat")
    parser.add_argument("--port", help="port to run webchat (default 9090)", default=9090)
    parser.add_argument("--announce", help="announce HiveMind node in local network", action="store_true")

    args = parser.parse_args()

    presence = None

    if args.announce:
        try:
            from HiveMind_presence import LocalPresence
            presence = LocalPresence(port=9090,
                                     service_type="HiveMind-WebChat")
            # TODO upnp server might be running for hivemind already if on same device
            # TODO scan utils should account for this service_type
            presence.start()
        except ImportError:
            print("Can not announce node in local network")
            print("pip install HiveMind_presence~=0.0.2a2")
        except Exception as e:
            print(f"Failed to announce node: {e}")

    webchat.main(args.port)
    if presence:
        presence.stop()


if __name__ == '__main__':
    main()
