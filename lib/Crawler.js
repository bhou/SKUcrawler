var phantom = require('phantom');
var config = require('../config');
var moment = require('moment');

/** 
* class Crawler
*/
function Crawler() {
	// crawler task queue, always get next task from the top
	this.queue =  [];
  this.dynamicTaskQueue = [];   // the task queue for dynamic content page
  this.currentDynamicTask = null;   // the current dynamic task

  this.running = 0;     // the number of running task
  this.ph = null;

  this.checkPoint = moment().milliseconds();

  // read other configurations
  this.endCheckInterval = (config.endCheckInterval == null ||
    typeof config.endCheckInterval == 'undefined') ? 10000 : config.endCheckInterval;

  this.maxRequest = (config.maxRequest == null ||
    typeof config.maxRequest == 'undefined') ? 10 : config.maxRequest;
}

Crawler.prototype.updateCheckPoint = function() {
  this.checkPoint = moment().format('X');
  console.log('[Crawler] | new check point ' + this.checkPoint);
}
// add task
Crawler.prototype.push = function(task) {
  var dynamic = task.context.dynamicpage;

  if (dynamic != true) {
	  this.queue.push(task);
  } else {
    this.dynamicTaskQueue.push(task);
  }
}

// run all the tasks in queue
Crawler.prototype.runTasks = function() {
  var n = this.maxRequest - this.running;

  if (n > 0) {
    var task = this.queue.shift();
    while (task != null && n > 0) {
      task.run();
      n--;
      task = this.queue.shift();
    }
  }

  // guarantee that only one dynamic task running
  if (this.currentDynamicTask == null) {
    this.currentDynamicTask = this.dynamicTaskQueue.shift();

    if (this.currentDynamicTask != null){
      this.currentDynamicTask.run();
    }
  }

  console.log('[Crawler] | status | ' + this.queue.length +' tasks in queue; ' +
    this.dynamicTaskQueue.length+ ' dynamic page tasks in queue; ' +
    this.running + ' tasks running');
}

// start the crawler
Crawler.prototype.start = function() {
  var crawler = this;
  var lastCheckPoint = -1;
  phantom.create(function(ph) {
    console.log('[Crawler] | start crawling ...');
    crawler.ph = ph;

    crawler.runTasks();

    // create timer to check if there is task available
    var interval = setInterval(function(){
      console.log('[Crawler] | check if there is active task');
      if (crawler.queue.length <= 0) {
        if (lastCheckPoint == crawler.checkPoint){
          console.log('[Crawler] | no active task in ' + crawler.endCheckInterval/1000 + ' seconds');
          crawler.ph.exit();
          clearInterval(interval);
          console.log('[Crawler] | crawler stopped');
        } else {
          console.log('[Crawler] | still have active tasks, keep running');
          lastCheckPoint = crawler.checkPoint;
        }
      }
    }, crawler.endCheckInterval );
  });


}

// export the class
module.exports = Crawler;