#!/usr/bin/env python

import tornado.ioloop
import tornado.web
from datetime import date, timedelta, datetime


from tornado.options import options
from tornado.httpserver import HTTPServer

import psycopg2


class BaseHandler(tornado.web.RequestHandler):

    def prepare(self):
        self.connection = psycopg2.connect(
            host='your.url.goes.here',
            port='5432',
            user='USERCHANGEMENAME',
            database='DATABASECHANGEMENAME',
            password='PASSCHANGEMEWORD')
        self.cursor = self.connection.cursor()


class MainHandler(BaseHandler):

    def prepare(self):
        pass

    @tornado.gen.coroutine
    def get(self):
        self.render('assets/templates/index.html')


class DataHandler(BaseHandler):

    @tornado.gen.coroutine
    def get(self, endDate=None, date=None):
        datet = datetime.strptime(date,"%Y-%m-%d");
        enddate = datetime.strptime(endDate,"%Y-%m-%d");
        print "%s %s" % (date,enddate)
        query = '''
SELECT SUM(corecount) as corecount, bucket, cloudname FROM (
                                                SELECT a.launchtime as launchtime,
                                                       EXTRACT(hour from launchtime) as hour,
                                                       EXTRACT(minute from launchtime) as minute,
                                                       trunc((EXTRACT(hour from launchtime)*60+EXTRACT(minutes from launchtime)) / 120) as bucket,
                                                       b.cloudname as cloudname,
                                                       CASE WHEN (a.corecount IS NULL OR a.cloud != b.cloudname ) THEN 0 ELSE a.corecount END AS corecount
                                                FROM
                                                  ( SELECT DISTINCT(cloudname) FROM dupa ) as b, instancehistory as a
                                                WHERE CAST(launchtime as TIMESTAMP) < %s
                                                      AND CAST(launchtime as TIMESTAMP) >= %s
                                                ORDER BY launchtime,corecount,cloudname DESC
                                              ) as result
GROUP BY result.bucket, cloudname
ORDER BY result.bucket, cloudname, corecount
                '''
#        print query
        self.cursor.execute(query, (date,enddate,))
        instances = self.cursor.fetchall()

        output = {}
        for instance in instances:
            (coresonline, launchtime, cloud) = instance

            if cloud not in output:
                output[cloud] = []

            newval = {
                'y': coresonline,
                'x': launchtime.isoformat() if not launchtime.is_integer() else launchtime
            }
            print "%s %s" % (cloud,newval)
            output[cloud].append(newval)

        # output = output.values()

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
        (r'/data/([0-9-]+)/([0-9-]+)', DataHandler)
    ], **settings)

    server = HTTPServer(application)
    server.listen(8585)
    tornado.ioloop.IOLoop.current().start()
