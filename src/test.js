//#!/usr/bin/env node


var fs		= require('fs');
var sys		= require("sys");
var stream	= require('stream');
var path = require("path");
var util	= require('util');

var Timers	= require('timers');



var searchEngine = require("./search.js");

//var winston = require('./node_modules/winston');

var STORAGE_FILE_NAME = "data.json";





/*
//var fs = require('fs');
var sqlite3 = require('./node_modules/sqlite3').verbose();
 
fs.exists('database', function (exists) {
  db = new sqlite3.Database('database');
 
  if (!exists) {
    console.info('Creating database. This may take a while...');
    fs.readFile('create.sql', 'utf8', function (err, data) {
      if (err) throw err;
      db.exec(data, function (err) {
        if (err) throw err;
        console.info('Done.');
      });
    });
  }
});


*/











function Test() {
	var self = this;
	
/*	
var logger = new (winston.Logger)({
  transports: [
   // new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: 'somefile.log' })
     
  ]
});
	*/
	
	this.indexDef = undefined;
	
	this.loadDir = function(dir) {
		var list = fs.readdirSync(dir);
		var totalArr = [];
		for(var i = 0; i < list.length; i++) {
			
			var filename = path.join(dir, list[i]);
			
			var ext = path.extname(list[i] ||'').split('.');
			
			var stat = fs.statSync(filename);
			
			if(filename == "." || filename == "..") {
			} else if(stat.isDirectory()) {
				self.loadDir(filename);
			} else if (ext[1] == "txt"){
				var data = fs.readFileSync(filename, 'utf8');
				searchEngine.loadFileData(data, filename);
//				searchEngine.loadFileDataToSingle(data, filename);

	
	
				
				//searchEngine.loadIndexData(filename);
//				searchEngine.mergeIndexData(this.indexDef, filename);
				
			}
		}
	};


/*
	this.loadDir2 = function(dir, finalCallBack) {
		var list = fs.readdirSync(dir);



		for(var i = 0; i < list.length; i++) {
			
			var filename = path.join(dir, list[i]);
			
			var ext = path.extname(list[i] ||'').split('.');
			
			var stat = fs.statSync(filename);
			
			if(filename == "." || filename == "..") {
			} else if(stat.isDirectory()) {
				self.loadDir2(filename);
			} else if (ext[1] == "txt"){
				var data = fs.readFileSync(filename, 'utf8');
				searchEngine.loadFileData(data, filename, self.indexDef);
			}
		}
	};

*/


	this.loadDir2 = function(dir, finalCallBack) {
		
		var arr = [];
		scanDir(dir, arr);
		//console.log(arr);
		
		
		var i = 0;
		
		var that = this;
		var filename;
		
		function callBack(){
			if (i >= arr.length){
				finalCallBack();
				return;
			}
		
			filename = arr[i];
			var data = fs.readFileSync(filename, 'utf8');
			i++;
			searchEngine.loadFileData(data, filename, self.indexDef, callBack);
		}
		
		
		callBack();
		
		//this.loadFileDataToSingle(callBack);
		
		/*
		var that =this;
		this.loadFileDataToSingle(function callback() {
			that.loadFileDataToSingle(callback);
		});
		*/
		
		
	};






	function scanDir(currDir, arr){
		var list = fs.readdirSync(currDir);
		for(var i = 0; i < list.length; i++) {
			var filename = path.join(currDir, list[i]);
			var ext = path.extname(list[i] ||'').split('.');
			var stat = fs.statSync(filename);
			if(filename == "." || filename == "..") {
				// pass these files
			} else if(stat.isDirectory()) {
				scanDir(filename, arr);
			} else if (ext[1] == "txt"){
				arr.push(filename);
			}
		}
	}


	this.loadDir1 = function(dir, finalCallBack) {
		
		var arr = [];
		scanDir(dir, arr);
		//console.log(arr);
		
		
		var i = 0;
		
		var that = this;
		var filename;
		
		function callBack(){
			if (i >= arr.length){
				finalCallBack();
				return;
			}
		
			filename = arr[i];
			var data = fs.readFileSync(filename, 'utf8');
			i++;
			searchEngine.loadFileDataToSingle1(data, filename, function(){
				 Timers.setImmediate(callBack);
			});
		}
		
		
		callBack();
		
		//this.loadFileDataToSingle(callBack);
		
		/*
		var that =this;
		this.loadFileDataToSingle(function callback() {
			that.loadFileDataToSingle(callback);
		});
		*/
		
		
	};



	
/*	
	this.loadStoredData = function(fileName){
		this.indexDef = searchEngine.loadIndexData(fileName);
	}
	
	*/
	
	
	this.execute = function(req, resp){
		
		return;
		
		var that = this;
		var start = new Date();
		
		sys.debug("Start at " + start);	
	
	
/*		
		searchEngine.initIndexDef(function(index){
			self.indexDef = index;
			self.loadDir2("./1/", function(){
				var finish = new Date();
				sys.debug("Finish at " + finish);
				sys.debug("Duration "+((finish-start)/1000)+" sec");	
			});
		});
	*/	
		
	//	self.loadDir("./Library/Dutch/");
		
		
		
		searchEngine.initIndexDef(function(indexDef){
			self.indexDef = indexDef;
			searchEngine.mergeIndexData(indexDef, "./mainIndex.idx.json")
			var loaded = new Date();
			sys.debug("loaded at " + loaded);
			sys.debug("Duration "+((loaded-start)/1000)+" sec");
			
			var searchValue = "god";
			searchEngine.search(searchValue, indexDef, function(data){
				console.log("Search result for"+searchValue+":", data.length);
				data.forEach(function(val){
					console.log(val);
				});
				var finish = new Date();
				sys.debug("Finish at " + finish);
				sys.debug("Duration "+((finish-start)/1000)+" sec");	
			})

			
		});
		

		
		/*
		
		
		var res = searchEngine.loadSingleIndexFile(function(res){
			console.log(res.length)
			var finish = new Date();
			sys.debug("Finish at " + finish);
			sys.debug("Duration "+((finish-start)/1000)+" sec");	
		});
		
		*/
		
		/*
		searchEngine.prepareSingle();
		
		
		self.loadDir1("./Library/", function(){
			searchEngine.closeSingle();

			sys.debug("test complete");
			var finish = new Date();
			sys.debug("Finish at " + finish);
			sys.debug("Duration "+((finish-start)/1000)+" sec");	
		});
		*/
		

		/*
		searchEngine.initIndexDef(function(index){
			self.indexDef = index;
			searchEngine.search("god", self.indexDef, function(data){
				console.log("Search result:", data.length);
				var finish = new Date();
				sys.debug("Finish at " + finish);
				sys.debug("Duration "+((finish-start)/1000)+" sec");	
			})
		});
*/
		



		
	
	}
	
	
	
	
	
}


module.exports = new Test();

