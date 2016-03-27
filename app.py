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
            host='grzegraph.ckseu9rplkxc.us-west-1.rds.amazonaws.com',
            port='5432',
            user='ashamblin',
            database='ashamblin',
            password='zoomzoom')
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
        datet = datetime.strptime(date,"%Y-%m-%d");
        enddatetime = datet + timedelta(days=-2)
        enddate = enddatetime.strftime("%Y-%m-%d")
        print "%s %s" % (date,enddate)

        query = '''
            SELECT SUM(corecount),launchtime,cloudname FROM (
                SELECT a.launchtime as launchtime, b.cloudname as cloudname,
                        CASE WHEN (a.corecount IS NULL OR a.cloudname != b.cloudname ) THEN 0 ELSE a.corecount END AS corecount
                        FROM ( SELECT DISTINCT(cloudname) FROM dupa WHERE CAST(launchtime as DATE) < %s ) as b, dupa as a
                WHERE CAST(launchtime as DATE) < %s
                AND CAST(launchtime as DATE) > %s
                ORDER BY launchtime,cloudname,corecount DESC 
            ) as result
            GROUP BY result.launchtime, result.cloudname;
        '''
        query = '''
        SELECT SUM(corecount), hour, cloudname FROM (
            SELECT a.launchtime as launchtime, EXTRACT(hour from launchtime) as hour, b.cloud as cloudname,
                    CASE WHEN (a.corecount IS NULL OR a.cloud != b.cloud ) THEN 0 ELSE a.corecount END AS corecount
            FROM 
                ( SELECT DISTINCT(cloud) FROM instancehistory WHERE CAST(launchtime as DATE) = %s ) as b, instancehistory as a
            WHERE CAST(launchtime as TIMESTAMP) < %s 
            AND CAST(launchtime as TIMESTAMP) >= %s  ORDER BY launchtime,cloudname,corecount DESC 
        ) as result
        GROUP BY result.hour, cloudname
        ORDER BY result.hour
        '''
        query = '''
SELECT SUM(corecount), bucket, cloudname FROM (
    SELECT a.launchtime as launchtime, 
            EXTRACT(hour from launchtime) as hour, 
            EXTRACT(minute from launchtime) as minute, 
            trunc((EXTRACT(hour from launchtime)*60+EXTRACT(minutes from launchtime)) / 6) as bucket, 
            b.cloud as cloudname,
            CASE WHEN (a.corecount IS NULL OR a.cloud != b.cloud ) THEN 0 ELSE a.corecount END AS corecount
    FROM 
        ( SELECT DISTINCT(cloud) FROM instancehistory WHERE CAST(launchtime as DATE) = '2014-04-01' ) as b, instancehistory as a
    WHERE CAST(launchtime as TIMESTAMP) < '2014-04-01 23:59:00' 
    AND CAST(launchtime as TIMESTAMP) >= '2014-03-31 00:00:00'  ORDER BY launchtime,cloudname,corecount DESC 
) as result
GROUP BY result.bucket, cloudname
ORDER BY cloudname, result.bucket
        '''
        print query
        self.cursor.execute(query, (date,date,enddate,))
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
        (r'/data/([0-9-]+)', DataHandler)
    ], **settings)

    server = HTTPServer(application)
    server.listen(8585)
    tornado.ioloop.IOLoop.current().start()
