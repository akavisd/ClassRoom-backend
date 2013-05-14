//#!/usr/bin/env node

var util	= require('util');
var http	= require('http');
var fs		= require('fs');
var url		= require('url');
var events	= require('events');
var sys		= require("sys");
var stream	= require('stream');

var multipart = require("./node_modules/multipart");

var storage = require("./storage");
var uploader = require("./uploader");

function escapeHtml(value) {
  return value.toString().
    replace('<', '&lt;').
    replace('>', '&gt;').
    replace('"', '&quot;');
}


function createServlet(Class) {
  var servlet = new Class();
  return servlet.handleRequest.bind(servlet);
}

/**
 * An Http server implementation that uses a map of methods to decide
 * action routing.
 *
 * @param {Object} Map of method => Handler function
 */
function HttpServer(handlers) {
  this.handlers = handlers;
  this.server = http.createServer(this.handleRequest_.bind(this));
}

HttpServer.prototype.start = function(port) {
  this.port = port;
  this.server.listen(port);
  util.puts('Http Server running at ' + port + '/');
};


HttpServer.prototype.parseUrl_ = function(urlString) {
  var parsed = url.parse(urlString);
  parsed.pathname = url.resolve('/', parsed.pathname);
  return url.parse(url.format(parsed), true);
};


HttpServer.prototype.handleRequest_ = function(req, res) {
	sys.log("Backend1 handleRequest_ ", req.url);
	util.puts(req.method + ' ' + req.url);
/*
  if (req.url === '/web/integration/mobile/requisition/submit') {
	  res.writeHead(200);
	  res.end();
	  return;
  }
  */
  req.url = this.parseUrl_(req.url);
  var handler = this.handlers[req.method];
  if (!handler) {
    res.writeHead(501);
    res.end();
  } else {
    handler.call(this, req, res);
  }
};

/**
 * Handles static content.
 */
function Servlet() {}

Servlet.MimeMap = {
  'txt': 'text/plain',
  'html': 'text/html',
  'jsp': 'text/html',
  'css': 'text/css',
  'xml': 'application/xml',
  'json': 'application/json',
  'js': 'application/javascript',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'png': 'image/png',
  'svg': 'image/svg+xml',
  "bin" : "application/octet-stream",
  "epub3": "application/epub+zip"
};



Servlet.prototype.sendMetadata = function(req, res){
	var self = this;
	var metadata = JSON.stringify(storage.getData().items);
	res.writeHeader(200, self._getCommonHeaders(req, {"Content-Type":  Servlet.MimeMap['json']}));
	res.write(metadata);
	res.end();
}


Servlet.prototype.sendEpubFile = function(req, res, link, mime){
	var self = this;
	var path = "./epub/"+link;
	
	fs.stat(path, function(err, stat) {
		if (err){
			return self.sendMissing_(req, res, "epub");
		}	
		if (!stat.isDirectory()){
		    return self.sendFile_(req, res, path, mime);
		}else{
		    return self.sendMissing_(req, res, link);
		}
	});
}




Servlet.prototype.sendEpubCover = function(req, res, key){
	var self = this;
	var itm = storage.getItem(key);
	var fileName = (itm)?itm.cover_href :undefined;
	if (fileName){
		var fileLnk = "./epub/"+fileName;
		var arr = fileName.split(".");
		return self.sendFile_(req, res, fileLnk,  arr[1]);
	}else{
		return self.sendMissing_(req, res, key);
	}
}



Servlet.prototype.sendEpubZIP = function(req, res, key){
	var self = this;
	var items = storage.getData().items;
	
	var fileName;
	for (var i = 0; (i < items.length) && !fileName; i++){
		if (items[i].key == key.toString()){
			fileName = items[i].file_name;
		}
	}

	if (fileName){
		var fileLnk = "./epub/"+fileName;
		return self.sendFile_(req, res, fileLnk, 'epub3');
	}else{
		return self.sendMissing_(req, res, link);
	}
}


Servlet.prototype.handleRequest = function(req, res, context) {
	var self = this;

	var path = (context + req.url.pathname).replace('//','/').replace(/%(..)/g, 
		function(match, hex){
		    return String.fromCharCode(parseInt(hex, 16));
  		}
	);
  
	var parts = path.split('/');
	if (parts[parts.length-1].charAt(0) === '.'){
		return self.sendForbidden_(req, res, path);
	}
	var action = req.url.pathname.replace('//','/').split('/')[1];
	
	if (action==="metadata"){
		return self.sendMetadata(req, res);
	} else if (action==="upload"){
		return self.uploadEpub(req, res);
	} else if (action==="remove"){
		var key = req.url.pathname.replace('//','/').split('/')[2];
		return self.removeEpub(req, res, key);
	} else if (action==="epub-file"){
		var key = req.url.pathname.replace('//','/').split('/')[2];
		return self.sendEpubZIP(req, res, key);
	} else if (action==="epub-cover"){
		var key = req.url.pathname.replace('//','/').split('/')[2];
		return self.sendEpubCover(req, res, key);
	}
}


var deleteFolderRecursive = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.statSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

Servlet.prototype.removeEpub = function(req, res, key) {
	sys.log("removeEpub");
	var self = this;
	var path = "./epub/"+key;
	
	deleteFolderRecursive(path);
	
	storage.removeItem(key);
	
	sys.log("remove Epub complete");
   	res.writeHead(200, self._getCommonHeaders(req,{'Content-Type': 'text/html'}));
   	res.end();
}


Servlet.prototype.uploadEpub = function(req, res) {
	sys.log("uploadEpub");
	var self = this;
	
	var _uploadComplete = function () {
		sys.log("Upload complete");
	   	res.writeHead(200, self._getCommonHeaders(req,{'Content-Type': 'text/html'}));
	   	res.end();
	}
	uploader.upload(req, _uploadComplete);
}


Servlet.prototype._getCommonHeaders = function(req, headers){
	headers = headers || {};
	var enableDomain = req.headers["origin"];
	headers["Access-Control-Allow-Origin"] = enableDomain;
	return headers;	
}


Servlet.prototype.sendError_ = function(req, res, error) {
	var self = this;
  res.writeHead(500, self._getCommonHeaders(req,{
      'Content-Type': 'text/html'
  }));
  res.write('<!doctype html>\n');
  res.write('<title>Internal Server Error</title>\n');
  res.write('<h1>Internal Server Error</h1>');
  res.write('<pre>' + escapeHtml(util.inspect(error)) + '</pre>');
  util.puts('500 Internal Server Error');
  util.puts(util.inspect(error));
};

Servlet.prototype.sendMissing_ = function(req, res, path) {
	var self = this;

//  path = path.substring(1);
  res.writeHead(404, self._getCommonHeaders(req,{
      'Content-Type': 'text/html'
  }));
  res.write('<!doctype html>\n');
  res.write('<title>404 Not Found</title>\n');
  res.write('<h1>Not Found</h1>');
  res.write(
    '<p>The requested URL ' +
    escapeHtml(path) +
    ' was not found on this server.</p>'
  );
  res.end();
  util.puts('404 Not Found: ' + path);
};

Servlet.prototype.sendForbidden_ = function(req, res, path) {
	var self = this;
 // path = path.substring(1);
  res.writeHead(403, self._getCommonHeaders(req,{
      'Content-Type': 'text/html'
  }));
  res.write('<!doctype html>\n');
  res.write('<title>403 Forbidden</title>\n');
  res.write('<h1>Forbidden</h1>');
  res.write(
    '<p>You do not have permission to access ' +
    escapeHtml(path) + ' on this server.</p>'
  );
  res.end();
  util.puts('403 Forbidden: ' + path);
};

Servlet.prototype.sendRedirect_ = function(req, res, redirectUrl) {
	var self = this;
  res.writeHead(301, self._getCommonHeaders(req,{
      'Content-Type': 'text/html',
      'Location': redirectUrl
  }));
  res.write('<!doctype html>\n');
  res.write('<title>301 Moved Permanently</title>\n');
  res.write('<h1>Moved Permanently</h1>');
  res.write(
    '<p>The document has moved <a href="' +
    redirectUrl +
    '">here</a>.</p>'
  );
  res.end();
  util.puts('301 Moved Permanently: ' + redirectUrl);
};

Servlet.prototype.sendFile_ = function(req, res, path, mimeType) {
	var self = this;
	fs.readFile(path, function (err, data) {
		if (err) {
//			throw err;
			self.sendError_(req, res, err);
			return;
		}
		res.writeHeader(200, self._getCommonHeaders(req, {"Content-Type":  Servlet.MimeMap[mimeType] || 'text/plain'}));
//	    res.write(data, (mimeType=="epub3")?"binary":undefined);
	    res.write(data);
	    res.end();
	});

};

Servlet.prototype.sendDirectory_ = function(req, res, path) {
  var self = this;
  if (path.match(/[^\/]$/)) {
    req.url.pathname += '/';
    var redirectUrl = url.format(url.parse(url.format(req.url)));
    return self.sendRedirect_(req, res, redirectUrl);
  }
  fs.readdir(path, function(err, files) {
    if (err)
      return self.sendError_(req, res, error);

    if (!files.length)
      return self.writeDirectoryIndex_(req, res, path, []);

    var remaining = files.length;
    files.forEach(function(fileName, index) {
      fs.stat(path + '/' + fileName, function(err, stat) {
        if (err)
          return self.sendError_(req, res, err);
        if (stat.isDirectory()) {
          files[index] = fileName + '/';
        }
        if (!(--remaining))
          return self.writeDirectoryIndex_(req, res, path, files);
      });
    });
  });
};

Servlet.prototype.writeDirectoryIndex_ = function(req, res, path, files) {
	var self = this;
  path = path.substring(1);
  res.writeHead(200, self._getCommonHeaders(req,{
    'Content-Type': 'text/html'
  }));
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.write('<!doctype html>\n');
  res.write('<title>' + escapeHtml(path) + '</title>\n');
  res.write('<style>\n');
  res.write('  ol { list-style-type: none; font-size: 1.2em; }\n');
  res.write('</style>\n');
  res.write('<h1>Directory: ' + escapeHtml(path) + '</h1>');
  res.write('<ol>');
  files.forEach(function(fileName) {
    if (fileName.charAt(0) !== '.') {
      res.write('<li><a href="' +
        escapeHtml(fileName) + '">' +
        escapeHtml(fileName) + '</a></li>');
    }
  });
  res.write('</ol>');
  res.end();
};

exports.HttpServer = HttpServer;
exports.Servlet = Servlet;
exports.createServlet = createServlet;
// Must be last,
//main(process.argv);