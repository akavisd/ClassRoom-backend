//#!/usr/bin/env node

var util	= require('util');
var http	= require('http');
var fs		= require('fs');
var url		= require('url');
var events	= require('events');
var sys		= require("sys");
var stream	= require('stream');

var storage = require("./storage");
var multipart = require("./node_modules/multipart");
var parser = new require('./ebook-parser');





function Uploader(){

	var self = this;
	
	function unpack(srcFileName, unpackComplete){

      	var pars = new parser.Parser();
      	pars.checkFile(srcFileName);
	

 		var metaData = pars.get("bookMetaData");
		var storageData = storage.getData();


		var arr = srcFileName.split("/");
		metaData.file_name = storageData.lastId+"/"+arr[arr.length - 1];

		if (pars.get("coverImage")){
			var coverPath =   pars.get("root_dir") + pars.get("coverImage");
			var destDir = "./epub/"+storageData.lastId;
//			var destDir = storageData.lastId;
			var parsPath = coverPath.split("/");
			metaData.cover_href =  storageData.lastId+"/"+parsPath[parsPath.length - 1];;
			var destFileName =  destDir+"/"+parsPath[parsPath.length - 1];;
			pars.extractEntryByName(coverPath, function(content) {
				sys.log("coverImage extracted");
				var fileStream = fs.createWriteStream(destFileName);
	    	    fileStream.write(content, "binary");
	    	  fileStream.end();
	    	  fileStream.close();
			}, true);				
		}

		metaData.package_doc_path = storageData.lastId+"/"+pars.get("root_file_path");
		
		metaData.key = storageData.lastId.toString();
		
		storageData.items.push(metaData);
		storage.setData(storageData);
		unpackComplete();
	}



	this.upload = function(req, uploadComplete){
		
		var storageData = storage.getData();
		storageData.lastId +=1; 
		//storage.setData(storageData);
		
		var destDir = "./epub/"+storageData.lastId;

		if (!fs.existsSync(destDir)){
			fs.mkdirSync(destDir);
		}        

		var fileName = null;
		var fileStream = null;
		var parser = null;
		var isEmpty = true;

		    req.setEncoding("binary");
		    parser = multipart.parser();
		    parser.headers = req.headers;

		    parser.onPartBegin = function(part) {
				sys.log("Started part, name = " + part.name + ", filename = " + part.filename);
		    	fileName = destDir +"/"+parser.part.filename; 
			    
				sys.log("initFileStream");
				fileStream = fs.createWriteStream(fileName);
				
				parser.onData = function(chunk) {
				 	//req.pause();
				 	sys.log("Writing chunk");
					isEmpty = fileStream.write(chunk, "binary");
				};
		
				fileStream.addListener("drain", function() {
					sys.log("fileStream drain");
		            //req.resume();
		            
		        });

				fileStream.addListener("drain", function() {
					sys.log("fileStream drain");
					isEmpty = true;
		        });


		
				parser.onEnd = function() {
					sys.log("parser.onEnd");
					if (isEmpty){
						sys.log("fileStream empty");
						fileStream.end();
					    fileStream.close();
					    unpack(fileName, uploadComplete);
					}else{
						fileStream.on("drain", function() {
							sys.log("fileStream end drain");
							fileStream.end();
						    fileStream.close();
						    unpack(fileName, uploadComplete);
						});
					}
					
					//fileStream.write();
				};
		    	sys.log("onPartBegin end");
		    };
		
			req.on("data", function(chunk) {
		    	sys.log("==req data");
		        parser.write(chunk);
		    });
		
		    req.on("end", function() {
		    	sys.log("===req end");
		        parser.close();
		    });
		   
	}
}

exports.instance  = new Uploader();
exports.upload = exports.instance.upload;