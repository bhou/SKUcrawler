var fs = require('fs');
var config = require('../config');
var Crawler = require('../lib/Crawler');


var crawler = new Crawler();

// load all the sites tasks from the sites folder
console.log('loading sites from: ' + config.home);
var files = fs.readdirSync(config.home + '/sites');

for ( var i = 0; i < files.length; i++ ) {
	if ( fs.statSync( config.home + '/sites/' + files[i] ).isDirectory() ) {
		console.log('[MAIN] | add site "' + files[i] + '" to the task queue');
		var task = require('../sites/'+files[i]+'/main')(crawler);
		crawler.push(task);
	}
}

// start the crawler
crawler.start();

