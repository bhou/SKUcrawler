/**
 * emit events
 * 1. loaded
 * 2. released
 * 3. error
 * 4. exited
 *
 * @type {exports}
 */

var phantom = require('phantom');
var events = require('events');

var Logger = require('./Logger');
var logger = new Logger('PhantomPool');


/**
 * PhantomPool
 * @param crawler crawler instance
 * @param n     max number of the phantom instance
 * @param waitTime    wait time for dynamic content
 * @constructor
 */
function PhantomPool(crawler, n, waitTime) {
  this.crawler = crawler;
  this.size = n;
  this.waitTime = waitTime;
  this.pool = [];
  this.available = [];
  this.occupied = 0;

  this.basePort = 12345;

  var self = this;
  var count = 0;
  for (var i = 0; i < self.size; i++) {
    phantom.create("--web-security=no", "--ignore-ssl-errors=yes", { port: this.basePort+i }, function(ph) {
      self.pool.push(ph);
      self.available.push(false);
      count++;

      if (count == self.size) {
        self.emit('loaded');
      }
    });
  }
}

PhantomPool.prototype = new events.EventEmitter;

/**
 * detemine if there is phantom instance available
 * @returns {boolean}
 */
PhantomPool.prototype.hasAvailable = function () {
  return this.occupied < this.size;
}

/**
 * Private:
 * get the next available phantom instance
 * @returns {number}  -1 if there is no instance available
 */
PhantomPool.prototype.nextAvailableIndex = function () {
  for (var i = 0; i < this.size; i++ ) {
    if (this.available[i] == false) {
      return i;
    }
  }

  return -1;
}

/**
 * run a task with next available instance, if no instance available emit error
 * @param task
 */
PhantomPool.prototype.run = function (task) {
  var self = this;

  if (!self.hasAvailable()) {
    self.emit('error', 'No phantom instance available');
    return;
  }
  var index = self.nextAvailableIndex();
  if (index == -1) {
    self.emit('error', 'No phantom instance available');
    return;
  }

  self.occupied++;
  self.available[index] = true;
  self.pool[index].createPage(function(page) {
    return page.open(task.url, function(status) {
      task.phantomIndex = index;

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
            try {
              task.parse(result.url, null, result.body);
            } catch (e) {
              logger.error(e.message);
              self.emit('error', e);
            }
            page.close();
            self.emit('released', index);
          });
        }, self.waitTime);
      } else {
        // failed to load page
        logger.error('failed to load page: ' + task.url);
        page.close();
        self.release(index);
      }
    });
  });
}

PhantomPool.prototype.release = function(index) {
  var self = this;

  if (typeof index != 'number') {
    return;
  }
  self.available[index] = false;
  self.occupied--;
}

PhantomPool.prototype.exit = function () {
  if (this.occupied != 0) {
    this.emit('error', 'Could not destroy pool, with task running');
    return;
  }

  for (var i = 0; i < this.size; i++){
    this.pool[i].exit();
  }

  this.emit('exited');
}


module.exports = PhantomPool;