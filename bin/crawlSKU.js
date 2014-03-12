var fs = require('fs');
var config = require('../config');
var Crawler = require('../lib/Crawler');
var Logger = require('../lib/Logger');
var logger = new Logger('Main');

var crawler = new Crawler();

process.once('uncaughtException', function(err) {
  logger.error(err.stack);
});

// load all the sites tasks from the sites folder
logger.info('loading sites from: ' + config.home);
var files = fs.readdirSync(config.home + '/sites');

for ( var i = 0; i < files.length; i++ ) {
	if ( fs.statSync( config.home + '/sites/' + files[i] ).isDirectory() ) {
		logger.info('add site "' + files[i] + '" to the task queue');
		var callbacks = require('../sites/'+files[i]+'/main')(crawler);
	}
}

// start the crawler
crawler.start();

