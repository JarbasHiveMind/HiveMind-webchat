import time
from hivemind_webchat import WebChat


def main(port=9090, host="127.0.0.1"):
    webchat = WebChat(port, host)
    webchat.start()

    while True:
        try:
            time.sleep(5)
        except KeyboardInterrupt:
            break

    # stop everything
    webchat.stop()
    webchat.join()
