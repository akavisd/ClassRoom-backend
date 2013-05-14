//#!/usr/bin/env node

var fs		= require('fs');
var sys		= require("sys");
var stream	= require('stream');


var STORAGE_FILE_NAME = "data.json";


Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};



function Storage() {
	var self = this;
	var _data = {lastId:0, items:[]};
	var path = "./"+STORAGE_FILE_NAME;
	
	fs.readFile(path, function (err, data) {
		if (err) {
			console.error(err);
		}else{
			try{
				_data = JSON.parse(data);
			}catch(err){
				sys.error(err);
			}
		}		
		console.log("data:", self.getData());
	});


	this.save = function (){
        var fileStream = fs.createWriteStream(path);
        var str = JSON.stringify(self.getData());
        fileStream.write(str);
        fileStream.end();
        fileStream.close();
        console.log("storage save: ", str);
	}
	
	this.getData = function(){
		return _data;
	}
	
	this.setData = function(data){
		_data = data;
		self.save();
	}
	
	
	this.getItem = function(key){
		var items = this.getData().items;
		var result = undefined;
		for (var i = 0; (i < items.length) && !result; i++){
			if (items[i].key == key.toString()){
				result = items[i];
			}
		}
		return result;
	}
	
	this.removeItem = function(key){
		var item = this.getItem(key);
		if (item){
			_data.items.remove(item);
			self.save();
		}
		return item;
	}
}



exports.instance =  new Storage();
exports.getData = exports.instance.getData;
exports.setData = exports.instance.setData;

exports.getItem = exports.instance.getItem;
exports.removeItem = exports.instance.removeItem;
