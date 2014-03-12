/**
 * crawler task class
 *
 *
 */
var events = require('events');
var config = require('../config');
var Logger = require('./Logger');
var logger = new Logger('Task');

/** constructor
 * options:
 * url - the link to crawler
 * context - the context of this task
 * callback - the function to crawl the page, function(crawler, err, data, params)
 */ 
function Task(crawler, option) {
	this.crawler = crawler;
	this.url = option.url;
  this.method = option.method;
  this.body = option.body;

  if (this.method == null || typeof this.method == 'undefined') {
    this.method = 'get';
  }

  if (this.body == null || typeof this.body == 'undefined') {
    this.body = '';
  }

	this.context = option.context;
	this.callback = option.callback;
}

Task.prototype = Object.create(events.EventEmitter.prototype);

// crawl the url described in this task
Task.prototype.parse = function (url, err, data) {
	if (this.callback != null) {
		this.callback(this, url, err, data);
	}
}

/**
 * emit error events
 * @param e
 */
Task.prototype.error = function(e) {
  this.emit('error', e);
}

/**
 * emit done event
 */
Task.prototype.done = function() {
  this.emit('done');
}

module.exports = Task;