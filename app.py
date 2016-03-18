#!/usr/bin/env python

import tornado.ioloop
import tornado.web

from tornado.options import options
from tornado.httpserver import HTTPServer

import psycopg2


class BaseHandler(tornado.web.RequestHandler):

    def prepare(self):
        self.connection = psycopg2.connect(
            host='*',
            port='*',
            user='*',
            database='*',
            password='*')
        self.cursor = self.connection.cursor()


class MainHandler(BaseHandler):

    def prepare(self):
        pass

    @tornado.gen.coroutine
    def get(self):
        self.render('assets/templates/index.html')


class DataHandler(BaseHandler):

    @tornado.gen.coroutine
    def get(self, date=None):

        self.cursor.execute('''
            select  cloudname,
                    corecount,
                    launchtime
            from dupa
            where CAST(launchtime as DATE) = %s
            order by launchtime
        ''', (date,))

        instances = self.cursor.fetchall()

        output = {}
        for instance in instances:
            (cloud, coresonline, launchtime) = instance

            if cloud not in output:
                output[cloud] = []

            output[cloud].append({
                'y': coresonline,
                'x': launchtime.isoformat()
            })
        output = output.values()

        self.set_header('Content-type', 'application/json')
        self.write({'instances': output})


settings = {
    'debug': True,
    'static_path': 'assets'
}


if __name__ == '__main__':
    options.parse_command_line()

    application = tornado.web.Application([
        (r'/', MainHandler),
        (r'/data/([0-9-]+)', DataHandler)
    ], **settings)

    server = HTTPServer(application)
    server.listen(8585)
    tornado.ioloop.IOLoop.current().start()
