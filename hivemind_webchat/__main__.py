import argparse
import os

from hivemind_webchat import webchat


def main():
    parser = argparse.ArgumentParser(description="Start HiveMind WebChat")
    parser.add_argument("--port", type=int, default=9090,
                        help="HTTP port to serve the webchat on (default 9090)")
    parser.add_argument("--host", default=os.environ.get("WEBCHAT_HOST") or "127.0.0.1",
                        help="address to bind the HTTP server to (default "
                             "$WEBCHAT_HOST when set, else 127.0.0.1; "
                             "use 0.0.0.0 to serve on all interfaces)")

    args = parser.parse_args()

    webchat.main(args.port, args.host)


if __name__ == '__main__':
    main()
