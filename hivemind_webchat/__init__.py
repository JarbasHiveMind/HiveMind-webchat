import asyncio
import os
import os.path
import socket
import threading

import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket


def get_ip():
    # taken from https://stackoverflow.com/a/28950776/13703283
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render('index.html')


class WebChat(threading.Thread):
    def __init__(self, port, host="127.0.0.1", *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.port = int(port)
        self.host = host

    def run(self):
        asyncio.set_event_loop(asyncio.new_event_loop())

        # /static/ is served by Tornado from settings["static_path"].
        routes = [
            tornado.web.url(r"/", MainHandler, name="main"),
        ]

        settings = {
            "debug": False,
            "template_path": os.path.join(os.path.dirname(__file__), "templates"),
            "static_path": os.path.join(os.path.dirname(__file__), "static"),
        }

        application = tornado.web.Application(routes, **settings)
        httpServer = tornado.httpserver.HTTPServer(application)

        httpServer.listen(self.port, address=self.host)
        shown = get_ip() if self.host in ("0.0.0.0", "") else self.host
        print(f"Starting WebChat: {shown}:{self.port}")
        tornado.ioloop.IOLoop.instance().start()

    def stop(self):
        tornado.ioloop.IOLoop.instance().stop()
