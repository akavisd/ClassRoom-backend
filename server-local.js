//var http = require('http');

var HttpServer = require('./src/web-server').HttpServer;
var Servlet = require('./src/web-server').Servlet;
var createServlet = require('./src/web-server').createServlet;

(new HttpServer({
    'GET': createServlet(Servlet),
    'POST':createServlet(Servlet)
  })).start(8000);

