//#!/usr/bin/env node

var fs		= require('fs');
var sys		= require('sys');
var events = require('events');

var Timers	= require('timers');


require("./node_modules/fullproof/fullproof.js");



require("./node_modules/websql_bridge.js");

var totalCallBack = 0;

function SearchApi() {

	//var PATTERN_DELIMITER = /\s*,\s*/
	
	var PATTERN_WORD = /[^,?.!;:"'()\[\] \f\n\r\t\v]+/gi
	
	var IDX_FILE_NAME = "single.data";

	var parser_for_all = new fullproof.StandardAnalyzer([fullproof.normalizer.to_lowercase_nomark]);
	parser_for_all.sendFalseWhenComplete = true;
   
   
   
	//API


	this.search = function(word, indexDef, callback) {
		indexDef.index.lookup(word, function(data) {
			callback(data.data);
		});
	};
	
	/*   
	this.clear = function(callback){
		under_test.index.clear(callback);
	},
	*/	
		
	this.loadArray = function(indexDef, storeData, filename) {
		if (!storeData){
			return;
		}
	
		var dataItem;
		var anchor;
		for (var i = 0; i < storeData.length; i++) {
			dataItem = storeData[i];
			if (dataItem.trim()){
				anchor = {
						//fileName:filename,
						p: "some[1]/dummy[2]/Path[1]/text()[1]",
						s:i,
						e:i + dataItem.length
					}
				try{
					indexDef.parser.parse(dataItem, function(word) {
						indexDef.index.inject(word, anchor); // the line number is the value stored
					});
				}catch(err){
					console.error(err);
				}
			}
		}
	};


	this.loadArray1 = function(indexDef, storeData, filename, finalCallBack) {
	
	//	var emitter = new events.EventEmitter();
	
		if (!storeData){
			finalCallBack();
			return;
		}
		
	
	
		var dataItem;
		var anchor;
		
		var i = 0;
		var j = 0;
		
		function callBack(){
		
			//console.log("totalCallBack", totalCallBack);
			totalCallBack++;
			
			
			
			if (!storeData || i >= storeData.length){
				
				indexDef.index.commitTran(function(){
					finalCallBack();
				})
				return;
			}
			
			dataItem = storeData[i];
			i++;
			j++;
			
			var trim = dataItem.trim();

			if (trim){
				anchor = {
						//fileName:filename,
						p: "some[1]/dummy[2]/Path[1]/text()[1]",
						s:i,
						e:i + dataItem.length
					}
				try{
					//console.log("dataItem", dataItem);
					indexDef.parser.parse(dataItem, function(word) {
						//console.log("word: ", word);
						/*
						if(word=="weer"){
							console.log("stop");
						}
						
						*/
						if (word){
							indexDef.index.inject(word, JSON.stringify(anchor)); 
						}else{
							//callBack();
						}
					});
				//	console.log("dataItem 1", dataItem);
				//	callBack();
//					 emitter.emit("next");
					
					if  ( j >= 10000){
						j = 0;
						indexDef.index.commitTran(function(){
							indexDef.index.beginTran(function(){
								 Timers.setImmediate(callBack);
							})
							
						})
					}else{
						 Timers.setImmediate(callBack);
					}
					
					
					
				
					
				}catch(err){
					console.error(err);
				}
			}else{
				 //callBack();
				 //emitter.emit("next");
				 Timers.setImmediate(callBack);
			}
		}
		
	/*	
		
		emitter.addListener("next", function(){
			setTimeout(callBack, 0);
		})
		
		
		emitter.emit("next");
	*/	
		
		indexDef.index.beginTran(function(){
			callBack();
		})
		

	};


	
	this.initIndexDef = function(callback){
		var result = 
		    {
	       	    store: new fullproof.store.MemoryStore(),
	       	    //store: new fullproof.store.MySQLStore(),
	       	    parameters: new fullproof.Capabilities(),
	       	    indexName: "mainIdx",
		       	parser: parser_for_all,
			};
	
		var ireq = new fullproof.IndexRequest(result.indexName, result.parameters);
		
		result.store.open(result.parameters, [ireq], function() {
			result.index = result.store.getIndex(result.indexName);
			callback(result);
		});
		
	};
	
	
	function getStoredata(data){
		var result = {};
		for (var key in data){
			result[key] = {c:data[key].data}; //ref copy!
		}
		return result;
	}


	function setStoredata(storedData, indexData){
		for (var key in storedData){
			if (!indexData[key]){
				indexData[key] = new fullproof.ResultSet();
			}
			indexData[key].data = indexData[key].data.concat(storedData[key].c);//ref copy!
		}
	}

/*

	function setStoredata(storedData, indexData){
		var result = {};
		for (var key in storedData){
			if (!indexData[key]){
				indexData[key] = new fullproof.ResultSet();
			}
			indexData[key].data = indexData[key].data.concat(storedData[key].c);//ref copy!
		}
		return result;
	}

*/
	
	
	function saveIndexData(strData, filename){

	    /*
	    var fileStream = fs.createWriteStream(filename);
        fileStream.write(strData);
        fileStream.end();
        fileStream.close();
*/

		fs.writeFileSync(filename, strData);
       // console.log("file is saved: ", filename);
	};
	
	this.loadFileData = function(data, filename, indexDef, finalCallBack){
		console.log(filename);
		var indexDef = indexDef || this.initIndexDef(filename);
		//var arr = data.split(PATTERN_DELIMITER);
		var arr = data.match(PATTERN_WORD);
		
		
		this.loadArray1(indexDef, arr, filename, finalCallBack);
		
		//finalCallBack();
		
/*
		var sd = getStoredata(indexDef.index.data);
		
		sd.fileName = filename;
		var strData = JSON.stringify(sd);
		saveIndexData(strData, filename+".idx.json");
		//console.log(indexDef.index.data);
		*/
	};


	this.prepareSingle = function(fileName){
		//this.writeStream = fs.createWriteStream(fileName || "single.data");
		
			 
		if (fs.existsSync(IDX_FILE_NAME)){
			fs.unlinkSync(IDX_FILE_NAME)
		}
		
	
	}

	this.closeSingle  = function(){
		sys.log("closeSingle");

		
	/*
		var fstr = this.writeStream;
	
		this.writeStream.on("drain", function() {
			sys.log("fileStream end drain");
		    fstr.close();
		});
	
		this.writeStream.end();
		//this.writeStream.close();
		*/
	
	}






		function readLines(input, func, endCallback) {
		  var remaining = '';
		
		  input.on('data', function(data) {
		    remaining += data;
		    var index = remaining.indexOf('\n');
		    while (index > -1) {
		      var line = remaining.substring(0, index);
		      remaining = remaining.substring(index + 1);
		      func(line);
		      index = remaining.indexOf('\n');
		    }
		  });
		
		  input.on('end', function() {
		  	console.log("END");
		    if (remaining.length > 0) {
		    	func(remaining);
		    }
			endCallback();
		  });
		}

/*
		function func(data) {
		 // console.log('Line: ' + data);
		}
*/



	this.loadSingleIndexFile = function(callBack){
		var input = fs.createReadStream(IDX_FILE_NAME);
		var res = [];
		var i = 0;
		
		readLines(input, function (data){
			
			var obj = JSON.parse(data);
			
			if (obj.k == "baha"){
				console.log(i++);
				res.push(data);
			}
		
		}, function(){
		
			callBack(res);
		});
		
	}



	this.loadFileDataToSingle = function(data, filename){
	
		
		var indexDef =  this.initIndexDef(filename);
		var arr = data.match(PATTERN_WORD);
		this.loadArray(indexDef, arr, filename);
		
		if (!indexDef.index){
			return;
		}
		var sd = getStoredata(indexDef.index.data);
		
		for (var i in sd){
			var strData = JSON.stringify({k:i, f:filename, d:sd[i]});
			//console.log(strData);
			
			//this.writeStream.write(strData+"\n", undefined,  callback);
			
			fs.appendFileSync(IDX_FILE_NAME, strData+"\n")
			
		}
		
		/*
		sd.fileName = filename;
		var strData = JSON.stringify(sd);
		saveIndexData(strData, filename+".idx.json");
		//console.log(indexDef.index.data);
		*/
	};




	this.loadFileDataToSingle1 = function(data, filename, exitCallback){
		console.log("precessing:", filename);
	
		var indexDef =  this.initIndexDef(filename);
		var arr = data.match(PATTERN_WORD);
		
		var that = this;
		this.loadArray(indexDef, arr, filename);
		
		if (!indexDef.index){
			return;
		}
		var sd = getStoredata(indexDef.index.data);
	
		arr = [];
	
		for (var i in sd){
			arr.push(JSON.stringify({k:i, f:filename, d:sd[i]}));
		}
	
	
		var i = 0;
		
		function callBack (){
			if (i >= arr.length){
				exitCallback();
				return;
			}
			var strData = arr[i];
			i++;
			that.writeStream.write(strData+"\n", undefined,  callBack);
		}
	
		callBack();
	};


	
	
	this.loadIndexData = function(filename){
		var indexDef = this.initIndexDef();
		return this.mergeIndexData(indexDef, filename);
	};
	
	
	this.mergeIndexData = function(indexDef, filename){
		var data = fs.readFileSync(filename, 'utf8');
		var sd = JSON.parse(data);
		setStoredata(sd, indexDef.index.data)
		return indexDef;
	}
	
		
}


module.exports = new SearchApi();

