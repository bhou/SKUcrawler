/**
 * crawler task class
 * 
 *
 */

/** constructor
 * options:
 * url - the link to crawler
 * context - the context of this task
 * callback - the function to crawl the page, function(crawler, err, data, params)
 */ 
function Task(option) {
	this.crawler = null;
	this.url = option.url;
	this.context = option.context;
	this.callback = option.callback;

  this.finish = function() {
    if (this.context.async == true){
      this.crawler.async--;
    }
    var next = this.crawler.queue.shift();
    if (next != null) {
      console.log('......');
      console.log('[Base Task] | start crawling: ' + next.url);
      this.crawler.download(next);
    }
  }
}

Task.prototype.setCrawler = function(crawler) {
	this.crawler = crawler;
}

// crawl the url described in this task
Task.prototype.parse = function (url, err, data) {
	if (this.callback != null) {
		this.callback(this.crawler, url, err, data, this.context);
	}

  this.finish();
}



module.exports = Task;