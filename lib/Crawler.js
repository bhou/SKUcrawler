var phantom = require('phantom');
var request = require('request');
var config = require('../config');
var moment = require('moment');

var PhantomPool = require('./PhantomPool');
var Logger = require('./Logger');
var logger = new Logger('Crawler');

/** 
* class Crawler
*/
function Crawler() {
	// crawler static page task queue, always get next static page task from the top
	this.queue =  [];
  this.running = 0;     // the number of running static page task

  // crawler dynamic content task queue
  this.dynamicTaskQueue = [];
  this.phantoms = null; // this will be init in start method

  this.checkPoint = moment().format('X');

  // read other configurations
  this.endCheckInterval = (config.endCheckInterval == null ||
    typeof config.endCheckInterval == 'undefined') ? 10000 : config.endCheckInterval;

  this.maxRequest = (config.maxRequest == null ||
    typeof config.maxRequest == 'undefined') ? 10 : config.maxRequest;

  this.maxPhantom = (config.maxPhantom == null
    || typeof config.maxPhantom == 'undefined') ? 1 : config.maxPhantom;

  this.dynamicWait = (config.dynamicWait == null
    || typeof config.dynamicWait == 'undefined') ? 3000 : config.dynamicWait;
}

Crawler.prototype.updateCheckPoint = function() {
  this.checkPoint = moment().format('X');
  logger.debug('new check point ' + this.checkPoint);
}

// add task
Crawler.prototype.push = function(task) {
  var self = this;

  // clean up the task
  task.once('error', function(e) {
    self.taskEnd(this);
  }).once('done', function() {
    self.taskEnd(this);
  });

  var dynamic = task.context.dynamicpage;
  if (dynamic != true) {
	  this.queue.push(task);
  } else {
    this.dynamicTaskQueue.push(task);
  }
}

/**
 * run tasks in queue according to current capability
 */
Crawler.prototype.runTasks = function() {
  var self = this;
  // run non-dynamic task
  var n = self.maxRequest - self.running;
  if (n > 0) {
    var task = this.queue.shift();
    while (task != null && n > 0) {
      try {
        self.run(task);
      } catch (e) {
        logger.error(e.message);
      }
      n--;
      task = self.queue.shift();
    }
  }

  // run dynamic content task
  while (self.phantoms.hasAvailable() && self.dynamicTaskQueue.length != 0) {
    var task = this.dynamicTaskQueue.shift();
    if (task != null) {
      self.phantoms.run(task);
    }
  }
}

/**
 * run static page task. dynamic page task is handled by phantom pool
 * @param task  static page task
 */
Crawler.prototype.run = function(task) {
  logger.info('running task: ' + task.url);
  var self = this;

  self.running++;
  self.updateCheckPoint();

  if (task.method == 'post') {
    logger.debug('send POST request');
    var r = request.post({
      'uri' : task.url,
      'headers' :{'content-type': 'application/x-www-form-urlencoded'},
      'body' : task.body
    },function(err,response,body){
      var url = r.uri.href;
      try {
        task.parse(url, err, body);
      }catch(e) {
        logger.error(e.stack);
        throw e;
      }
    });
  } else {
    logger.debug('send GET request');
    var r = request.get({uri: task.url, encoding: 'binary'}, function(error, response, body) {
      var url = r.uri.href;
      try {
        task.parse(url, error, body);
      } catch (e) {
        logger.error(e.stack);
        throw e;
      }
    });
  }
}

/**
 * must be called when task is finished, to release resources
 * @param task
 */
Crawler.prototype.taskEnd = function (task) {
  var dynamic = task.context.dynamicpage;

  if (dynamic != true) {
    this.running--;
  } else {
    this.phantoms.release(task.phantomIndex);
  }

  this.updateCheckPoint();

  task.removeAllListeners('error');
  task.removeAllListeners('done');

  // run other tasks in queue
  this.runTasks();
}

/**
 * entry point of the crawler
 * start to crawl!
 */
Crawler.prototype.start = function() {
  var self = this;

  self.phantoms = new PhantomPool(self, self.maxPhantom, self.dynamicWait);   // the phantom pool
  self.phantoms.on('exited', function() {
    logger.notice('phantom pool exited')
  }).on('error', function(e){
    logger.error(e.message);
  }).on('loaded', function(){
    self.runTasks();
  });

  var lastCheckPoint = '';
  var interval = setInterval(function(){
    logger.routine(self.running + '/' + (self.queue.length + self.running) +' non dynamic tasks running; '
      + self.phantoms.occupied + '/' + (self.dynamicTaskQueue.length + self.phantoms.occupied) + ' dynamic page tasks running');

    if (lastCheckPoint == self.checkPoint){
      logger.routine('no active task in ' + self.endCheckInterval/1000 + ' seconds');
      self.phantoms.exit();
      clearInterval(interval);
      logger.notice('crawler stopped');
    } else {
      logger.routine('still have active tasks, keep running');
      lastCheckPoint = self.checkPoint;
    }
  }, self.endCheckInterval );
}

// export the class
module.exports = Crawler;