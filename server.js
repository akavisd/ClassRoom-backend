//var http = require('http');

var HttpServer = require('./src/web-server').HttpServer;
var Servlet = require('./src/web-server').Servlet;
var createServlet = require('./src/web-server').createServlet;

var StaticHttpServer = require('./src/web-server-static').HttpServer;
var StaticServlet = require('./src/web-server-static').Servlet;
var createStaticServlet = require('./src/web-server-static').createServlet;


(new HttpServer({
    'GET': createServlet(Servlet),
    'POST':createServlet(Servlet)
  }, '/home/bookreader/ClassRoom-backend')).start(8020);

(new StaticHttpServer({
    'GET': createStaticServlet(StaticServlet),
    'POST':createStaticServlet(StaticServlet)
  }, '/home/bookreader/ClassRoom')).start(8023);


/*
(new HttpServer({
    'GET': createServlet(Servlet),
    'POST':createServlet(Servlet)
  })).start(8020);

(new StaticHttpServer({
    'GET': createStaticServlet(StaticServlet),
    'POST':createStaticServlet(StaticServlet)
  }, '../ClassRoom')).start(8023);

*/