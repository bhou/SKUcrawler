var Crawler = require('../lib/Crawler');
var Task = require('../lib/Task');

var crawler = new Crawler();
var task = new Task({
	'url' : 'http://www.google.fr',
	'context' : {'msg':'Hello World'},
	'callback' : function(crawler, url, error, data, context) {
		console.log(data);
	}	
});

crawler.push(task);


crawler.start();