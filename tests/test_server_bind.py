"""The HTTP server binds to 127.0.0.1 by default, takes a --host option, and
parses --port as an int."""
import sys
import threading
import urllib.request
import socket
from unittest.mock import patch


def _free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def test_default_host_is_loopback():
    from hivemind_webchat import WebChat
    server = WebChat(port="9090")
    assert server.host == "127.0.0.1"
    assert server.port == 9090


def test_listen_uses_host_and_int_port():
    from hivemind_webchat import WebChat
    captured = {}

    class FakeServer:
        def __init__(self, app):
            pass

        def listen(self, port, address=""):
            captured["port"] = port
            captured["address"] = address

    with patch("tornado.httpserver.HTTPServer", FakeServer), \
            patch("tornado.ioloop.IOLoop.instance") as loop:
        WebChat(port="9091").run()
        assert captured == {"port": 9091, "address": "127.0.0.1"}
        WebChat(port=9092, host="0.0.0.0").run()
        assert captured == {"port": 9092, "address": "0.0.0.0"}
        assert loop.return_value.start.call_count == 2


def test_cli_parses_host_and_int_port():
    from hivemind_webchat import __main__ as cli
    with patch.object(cli.webchat, "main") as main:
        with patch.object(sys, "argv", ["hivemind-webchat", "--port", "8080"]):
            cli.main()
        main.assert_called_with(8080, "127.0.0.1")
        with patch.object(sys, "argv", ["hivemind-webchat", "--port", "8081", "--host", "0.0.0.0"]):
            cli.main()
        main.assert_called_with(8081, "0.0.0.0")


def test_server_serves_page_on_loopback():
    from hivemind_webchat import WebChat
    port = _free_port()
    server = WebChat(port=str(port), daemon=True)
    server.start()
    try:
        for _ in range(50):
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=1) as r:
                    assert r.status == 200
                    break
            except OSError:
                threading.Event().wait(0.1)
        else:
            raise AssertionError("server did not answer on 127.0.0.1")
    finally:
        server.stop()
