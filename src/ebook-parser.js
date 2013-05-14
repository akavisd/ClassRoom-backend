//#!/usr/bin/env node

var htmlparser = new require('./node_modules/node-htmlparser');

var AdmZip = require('./node_modules/adm-zip');
var zip = new require('./node_modules/node-zip');

var sys		= require("sys");
var url		= require("url");
var fs		= require('fs');


function Parser(){
	that = this;
	// Constants
	 
	this.MIMETYPE		= "mimetype";
	this.CONTAINER		= "META-INF/container.xml";
	this.EPUB3_MIMETYPE	= "application/epub+zip";
	this.DISPLAY_OPTIONS ="META-INF/com.apple.ibooks.display-options.xml";

	this.defaults =  {
		task_size: 100,
		progress: 1,
		extracting: false,
		log_message: "Fetching epub file"
	};

	
	var _map = {};
	this.set = function(key, value){
		_map[key] = value;
	};

	this.get = function(key){
		return _map[key];
	};


	this.parseContainerRoot = function(content) {
		
		var handler = new htmlparser.HtmlBuilder(function (error, dom) {
			    if (error){
			    	console.error(error);
			    }
			    else{
			    	console.log("parsing done, do something");
			    }
			}, { verbose: false, ignoreWhitespace: true });
		
		var parser = new htmlparser.Parser(handler);
		parser.parseComplete(content);
		
		
		console.log(handler.dom);
	
		var package = that.find(handler.dom, function(x){
			return x.name ==="package";
		})
	
		var metadata = that.find(package.children, function(x){
			return x.name ==="metadata";
		})


		var date =  that.find(metadata.children, function(x){
			return x.name ==="dc:date";
		})
		
		var dateVal = (date)?date.children[0].data:"";


		var manifest = that.find(package.children, function(x){
			return x.name ==="manifest"
		})

		var coverImage = that.find(manifest.children, function(x){
			if (x.attributes){
				console.log(x.attributes["id"]);
			}
			return  x.attributes && (x.attributes["id"] ==="cover-image" || x.attributes["id"] === "book-cover")
		});
		
		if (coverImage){
			that.set("coverImage", coverImage.attributes.href);
		}
		
		var title =  that.find(metadata.children, function(x){
			return x.name ==="dc:title";
		}).children[0].data;

		var creatorTag =  that.find(metadata.children, function(x){
			return x.name ==="dc:creator";
		});

		var creator = (creatorTag)?creatorTag.children[0].data:"";

		console.log("title: ", title, "creator", creator);
		
		var metaData = {
			created_at: dateVal,
			package_doc_path : "",
			title:title,
			author:creator,
			publisher:"",
			description:"",
			pubdate:"",
			layout:"",
			spread:"",
			orientation:"",
			ncx:""
		}
		that.set("bookMetaData", metaData);
	},


	this.parseMetaInfo = function(content) {	
		console.error("parseMetaInfo");

		var handler = new htmlparser.HtmlBuilder(function (error, dom) {
			    if (error){
			    	console.error(error);
			    }
			    else{
			    	console.log("parsing done, do something");
			
			    }
			}, { verbose: false, ignoreWhitespace: true });
		
		var parser = new htmlparser.Parser(handler);
		parser.parseComplete(content);
		//sys.puts(sys.inspect(handler.dom, false, null));
		
		var container = that.find(handler.dom, 
			function(x){
				return x.name ==="container";
			});
		
		var rootFiles = that.find(container.children, 
			function(x){
				return x.name ==="rootfiles";
			});
	
		if(rootFiles.children.length < 1) {
			this.set("error", "This epub is not valid. The rootfile could not be located.");
		}
		else {
			if (rootFiles.children[0].attributes.hasOwnProperty("full-path")) {
				var rootFilePath = rootFiles.children[0].attributes["full-path"];
				this.set("root_file_path", rootFilePath);
				var arr = rootFilePath.split("/");
				var rootFileDir = rootFilePath.replace(arr[arr.length - 1], "");
				this.set("root_dir", rootFileDir);

				this.extractContainerRoot();
			
			} else {
				this.set("error", "Error: could not find package rootfile");
			}				
		}
		
	};

	this.validateMimetype = function(content) {
		console.error("validateMimetype");
		if(content.trim() === this.EPUB3_MIMETYPE) {
			this.extractMetaInfo();
		} else {
			this.set("error", "Invalid mimetype discovered. Progress cancelled.");
		}
		
	},

	this.extractEntryByName = function(name, callback, isBinary) {
		var entry = this.find(this.entries, function(x) {
			return x.name === name;
		});
		if(entry) {
			if (isBinary){
				callback(entry.data);
			}else{
				callback(entry.asText());
			}
		}
		else {
			throw ("asked to extract non-existent zip-entry: " + name);
		}
		
	};
	
	this.extractContainerRoot = function() {
		var path = this.get("root_file_path");
		this.extractEntryByName(path, function(content) {
			console.log(content);
			that.parseContainerRoot(content);
		});				
	};
	
	
	this.extractMetaInfo = function() {
		var that = this;
		//try {
			this.extractEntryByName(this.CONTAINER, function(content) {
				that.parseMetaInfo(content);
			});
			/*
		} catch (e) {
			this.set("error", e);
		}
		*/
	};
		
	this.extractMimetype = function() {
		var that = this;
		this.set("log_message", "Verifying mimetype");
		//try {
			this.extractEntryByName(this.MIMETYPE, function(content) {
				that.validateMimetype(content);
			});			
		/*
		} catch (e) {
			this.set("error", e);
		}
		*/

	};
	
	
	
	this.any = function(collection, callback){
		for (var key in collection){
			if (callback(collection[key])){
				return true;
			}
		}
		return false;
	};
	

	this.find = function(collection, callback){
		for (var key in collection){
			if (callback(collection[key])){
				return collection[key];
			}
		}
		return undefined;
	};
	
	
	
	this.validateZip = function() {
		// set the task
		// weak test, just make sure MIMETYPE and CONTAINER files are where expected	
		var that = this;
		this.set("log_message", "Validating zip file");
		var has_mime = that.any(this.entries, function(x){
			return x.name === that.MIMETYPE
		});
		var has_container = that.any(this.entries, function(x){
			return x.name === that.CONTAINER
		});
		if(has_mime && has_container) {
//			this.trigger("validated:zip");
			this.extractMimetype();
		}
		else {
			this.set("error", "File does not appear to be a valid EPUB. Progress cancelled."); 
		}
		
	};


	this.extractEntry = function(entry) {
		var that = this;
		//var writer = new zip.BlobWriter();
		entry.getData(writer, function(content) {
			that.writeFile(entry.name, content, function() {
				that.available_workers += 1;
				that.set("zip_position", that.get("zip_position") + 1);
			});
		});
	};
	

	this.checkCompletion = function() {
		var pos = this.get("zip_position");
		if(pos === this.entries.length) {
			this.set("log_message", "All files unzipped successfully!");
			this.set("patch_position", 0);
		}
		else {
			// this isn't exactly accurate but it will signal the user
			// that we are still doing work
			this.set("log_message", chrome.i18n.getMessage("i18n_extracting") + this.entries[pos].name);
		}
	};

	this.beginUnpacking = function() {		
		var manifest = [];
		var entry;
		for(var i = 0; i < this.entries.length; i++) {
			entry = this.entries[i];
			if( entry.name.substr(-1) !== "/" ) {
				manifest.push(entry.name);
			}
		}
		this.set("manifest", manifest);
		// just set the first position
		this.set("zip_position", 0);
	};
	
	this.update_progress = function() {
		var zip = this.get("zip_position") || 0;
		var patch = this.get("patch_position") || 0;
		var x = Math.floor( (zip + patch + 3) * 100 / this.get("task_size") );
		this.set("progress", x );
	};


	this.checkFile = function(srcFileName){
	
		var fileData = fs.readFileSync(srcFileName, 'binary');
		var file = new JSZip(fileData, {base64: false, checkCRC32: true, binary:true});
   	
   	/*
		var zip = new AdmZip(srcFileName);
		var zipEntries = zip.getEntries(); // an array of ZipEntry records

		zipEntries.forEach(function(zipEntry) {
        	sys.log(zipEntry.toString()); // outputs zip entries information
		});
      
      */
      
      /*
      	var fileData = fs.readFileSync(srcFileName, 'binary');
		var ZIP = require("./node_modules/zip");
		var data = fileData;//new Buffer(fileData);
		var reader = ZIP.Reader(data);
		reader.toObject();
		reader.forEach(function (zipEntry) {
			sys.log(zipEntry.toString()); 
		});
		//reader.iterator();
      	
      	return;
      	*/
  		this.entries = file.files;
		this.validateZip();
	};

}


exports.Parser  = Parser;

