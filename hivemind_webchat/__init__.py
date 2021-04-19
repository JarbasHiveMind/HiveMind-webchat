import tornado.httpserver
import tornado.ioloop
import tornado.web
import os.path
import os
import tornado.websocket
import tornado.options
import threading
import asyncio


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render('index.html')


class StaticFileHandler(tornado.web.RequestHandler):
    def get(self):
        self.render('js/app.js')


class WebChat(threading.Thread):
    def __init__(self, port, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.port = port

    def run(self):
        asyncio.set_event_loop(asyncio.new_event_loop())

        routes = [
            tornado.web.url(r"/", MainHandler, name="main"),
            tornado.web.url(r"/static/(.*)", tornado.web.StaticFileHandler,
                            {'path': './'})
        ]

        settings = {
            "debug": True,
            "template_path": os.path.join(os.path.dirname(__file__),
                                          "templates"),
            "static_path": os.path.join(os.path.dirname(__file__), "static"),
        }

        application = tornado.web.Application(routes, **settings)
        httpServer = tornado.httpserver.HTTPServer(application)

        httpServer.listen(self.port)
        tornado.ioloop.IOLoop.instance().start()

    def stop(self):
        tornado.ioloop.IOLoop.instance().stop()
