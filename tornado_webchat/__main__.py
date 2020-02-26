import socket
import sys
from time import sleep
from tornado_webchat import WebChat


def get_ip():
    return [l for l in (
        [ip for ip in socket.gethostbyname_ex(socket.gethostname())[2] if
         not ip.startswith("127.")][:1], [
            [(s.connect(('8.8.8.8', 53)), s.getsockname()[0], s.close()) for s
             in
             [socket.socket(socket.AF_INET, socket.SOCK_DGRAM)]][0][1]]) if l][
        0][0]


if __name__ == "__main__":
    # TODO argpase

    import tornado.options

    tornado.options.parse_command_line()
    port = 9090

    # TODO pass hivemind options
    # currently defined in tornado_webchat/static/js/app.js
    webchat = WebChat(port)

    try:
        webchat.start()

        ip = get_ip()
        url = "http://" + str(ip) + ":" + str(port)
        print("*********************************************************")
        print("*   HiveMind WebChat Client ")
        print("*")
        print("*   Access from web browser " + url)
        print("*********************************************************")

        while True:
            sleep(5)
    except KeyboardInterrupt:
        webchat.stop()
        webchat.join()
        sys.exit()
