/**
 * crawler task class
 *
 *
 */
var request = require('request');
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

  this.dynamicWaitTime = (config.dynamicWait == null ||
    typeof config.dynamicWait == 'undefined') ? 3000 : config.dynamicWait;


}

// privileged method, download data
Task.prototype.run = function() {
  logger.info('running task: ' + this.url);
  var task = this;

  this.crawler.running++;
  this.crawler.updateCheckPoint();

  if (task.context.dynamicpage == true) {
    logger.info('start crawling dynamic page');
    this.crawler.ph.createPage(function(page) {
      return page.open(task.url, function(status) {

        if (status == "success") {
          // successfully load page
          // wait 5 seconds to wait for dynamical content loaded
          setTimeout(function() {
            page.evaluate(function() {
              //NOTE: this will be logged by the virtual page,
              //i.e. in order to see it you need to set onConsoleMessage
              var url = document.URL;
              var body = document.documentElement.outerHTML;
              return {
                'url' : url,
                'body' : body
              };

            }, function(result){
              task.parse(result.url, null, result.body);
              page.close();
            });
          }, task.dynamicWaitTime);
        } else {
          // failed to load page
          logger.error('failed to load page: ' + task.url);
        }

      });
    });
  } else {
    if (task.method == 'post') {
      logger.debug('send POST request');
      var r = request.post({
        'uri' : task.url,
        'headers' :{'content-type': 'application/x-www-form-urlencoded'},
        'body' : task.body
      },function(err,response,body){
        var url = r.uri.href;
        task.parse(url, err, body);
      });
    } else {
      logger.debug('send GET request');
      var r = request.get({uri: task.url, encoding: 'binary'}, function(error, response, body) {
        var url = r.uri.href;
        task.parse(url, error, body);
      });
    }
  }
}

// crawl the url described in this task
Task.prototype.parse = function (url, err, data) {
	if (this.callback != null) {
		this.callback(this, url, err, data);
	}
}


// this must be called when a task finished its work
Task.prototype.finish = function() {
  this.crawler.running--;
  this.crawler.updateCheckPoint();

  var dynamicpage = ( this.context.dynamicpage == null
    || typeof this.context.dynamicpage == 'undefined') ? null : this.context.dynamicpage;
  if (dynamicpage == true) {
    this.crawler.currentDynamicTask = null;
  }
  // run other tasks in queue
  this.crawler.runTasks();
}



module.exports = Task;