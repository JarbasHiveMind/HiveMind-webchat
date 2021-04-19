from hivemind_webchat import WebChat
from ovos_utils import wait_for_exit_signal


def main():
    # TODO pass hivemind options
    # currently defined in hivemind_webchat/static/js/app.js
    port = 9090
    webchat = WebChat(port)
    webchat.start()
    wait_for_exit_signal()

    # stop everything
    webchat.stop()
    webchat.join()