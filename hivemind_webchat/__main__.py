import argparse

from hivemind_webchat import webchat


def main():
    parser = argparse.ArgumentParser(description="Start HiveMind WebChat")
    parser.add_argument("--port", help="port to run webchat (default 9090)", default=9090)

    args = parser.parse_args()

    webchat.main(args.port)


if __name__ == '__main__':
    main()
