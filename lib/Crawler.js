var request = require('request');
var phantom = require('phantom');

/** 
* class Crawler
*/
function Crawler() {
	// crawler task queue, always get next task from the top
	this.queue =  [];
  this.async = 0;

	// privileged method, download data
	this.download = function(task) {
    if (task.context.async == true) {
      console.log('[Crawler] | start async crawling');
      this.async++;
      this.ph.createPage(function(page) {
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
            }, 5000);
          } else {
            // failed to load page
            console.error('failed to load page: ' + task.url);
          }

        });
      });
    } else {
      request(task.url, function(error, response, body) {
        var url = response.request.uri.href;
        task.parse(url, error, body);

      });
    }
	}
}

// add task
Crawler.prototype.push = function(task) {
	this.queue.push(task);
	
	task.setCrawler(this);
}

// start the crawler
Crawler.prototype.start = function() {
  var crawler = this;
  phantom.create(function(ph) {
    console.time('crawling');
    console.log('[Crawler] | start crawling ...');
    crawler.ph = ph;

    //while (crawler.queue.length > 0) {
    var task = crawler.queue.shift();
    if (task != null) {
      crawler.download(task);
    }
    //}

    // create timer to check if there is task available
    crawler.lastQueueLen = crawler.queue.length;
    crawler.lastAsyncCount = crawler.async;
    var interval = setInterval(function(){
      if (crawler.queue.length <= 0) {
        if (crawler.lastQueueLen == crawler.queue.length
          && crawler.lastAsyncCount == crawler.async){
          console.timeEnd('crawling');
          crawler.ph.exit();
          clearInterval(interval);
        } else {
          crawler.lastQueueLen = crawler.queue.length;
          crawler.lastAsyncCount = crawler.async;
        }
      }
    }, 10000);
  });
}

// export the class
module.exports = Crawler;