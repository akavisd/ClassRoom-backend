

var fs		= require('fs');
var sys		= require("sys");
var stream	= require('stream');
var path 	= require("path");
var util	= require('util');

var Timers	= require('timers');



//var searchEngine = require("./src/search.js");
require("./src/node_modules/fullproof/fullproof.js");
require("./src/node_modules/websql_bridge.js");



var parser_for_all = new fullproof.StandardAnalyzer([fullproof.normalizer.to_lowercase_nomark]);
parser_for_all.sendFalseWhenComplete = true;



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


var loadDir = function(dir, finalCallBack) {
	var arr = [];
	scanDir(dir, arr);
	
	var i = 0;
	
	var that = this;
	var filename;
	
	
	var strData = JSON.stringify(arr);
	
	fs.writeFileSync( "mainIndex.fs.json", strData);

	
	
	function callBack(){
		if (i >= arr.length){
			finalCallBack();
			return;
		}
	
		filename = arr[i];
		var data = fs.readFileSync(filename, 'utf8');
		i++;
		console.log(filename);
		//searchEngine.loadFileData(data, filename, self.indexDef, callBack);
		// Timers.setImmediate(callBack);
		
//		initIndexDef(filename, function(indexDef){
		loadArray2(_indexDef, data, filename, callBack, i);
				
			
//		})
		
		
	}
	callBack();
};


var initIndexDef = function(callback){
	var result = 
	    {
//	   	    store: new fullproof.store.WebSQLStore(),
     	    store: new fullproof.store.MemoryStore(),
//       	    store: new fullproof.store.MySQLStore(),
       	    parameters: new fullproof.Capabilities().setDbName("common_strorage"),
       	    indexName: "mainIdx",
	       	parser: parser_for_all,
		};

	var ireq = new fullproof.IndexRequest(result.indexName, result.parameters);
	
	result.store.open(result.parameters, [ireq], function() {
		result.index = result.store.getIndex(result.indexName);
		callback(result);
	});
	
};



var loadArray1 = function(indexDef, fileData, filename, finalCallBack) {
	
	if (!fileData){
		finalCallBack();
		return;
	}
	

	var storeData = [];
	var map = {};
	
	indexDef.parser.parse(fileData, function(word) {
		if (word && !map[word]){
			storeData.push(word);
			map[word] = {
					fileName:filename,
					p: "some[1]/dummy[2]/Path[1]/text()[1]"
//					s:i,
//					e:i + dataItem.length
			};
		}
	});

	
	

	var dataItem;
	var anchor;
	
	var i = 0;
	var j = 0;
	
	function callBack(){
		
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
				indexDef.index.inject(trim, JSON.stringify(map[dataItem])); 
				if  ( j >= 5000){
					j = 0;
					indexDef.index.commitTran(function(){
						indexDef.index.beginTran(function(){
							 Timers.setImmediate(callBack);
						})
						
					})
				}else{
					Timers.setImmediate(callBack);
				}
				
		}else{
			 Timers.setImmediate(callBack);
		}
	}
	
	indexDef.index.beginTran(function(){
		callBack();
	})
		

};



var loadArray2 = function(indexDef, fileData, filename, finalCallBack, currFileIDX) {
	
	if (!fileData){
		finalCallBack();
		return;
	}
	

	var storeData = [];
	var map = {};
	
	indexDef.parser.parse(fileData, function(word) {
		if (word && !map[word]){
			storeData.push(word);
			map[word] = {
					idx: currFileIDX
//					fileName:filename,
//					p: "some[1]/dummy[2]/Path[1]/text()[1]"
//					s:i,
//					e:i + dataItem.length
			};
		}
	});

	
	var dataItem;
	
	var i = 0;
	var j = 0;
	
	function callBack(){
		
		if (!storeData || i >= storeData.length){
			finalCallBack();
			return;
		}
		
		dataItem = storeData[i];
		i++;
		j++;
		
		var trim = dataItem.trim();

		if (trim){
			indexDef.index.inject(trim, JSON.stringify(map[dataItem])); 
		}
		Timers.setImmediate(callBack);

	}
	
	callBack();

};



	
	function getStoredata(data){
		var result = {};
		for (var key in data){
			result[key] = {c:data[key].data}; //ref copy!
		}
		return result;
	}

	

	var _indexDef = {};

	
	var start = new Date();
	
	sys.debug("Start at " + start);	

	
	initIndexDef(function(indexDef){
		_indexDef = indexDef;
		//loadDir("./2/", function(){
		loadDir("./Library/", function(){
			
			var sd = getStoredata(indexDef.index.data);
			
			var strData = JSON.stringify(sd);
			
			fs.writeFileSync( "mainIndex.idx.json", strData);
			
			
			var finish = new Date();
			sys.debug("Finish at " + finish);
			sys.debug("Duration "+((finish-start)/1000)+" sec");	

		})
	})
	
	





