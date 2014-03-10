// entry point for crawling www.placeDesTendances.com
var Task = require('../../lib/Task');
var cheerio = require('cheerio');
var SKU = require('../../lib/SKU');
var db = require('mongodb');
var URL = require('url');

var skuCallback = function(crawler, url, err, data, context) {

}


var categoryCallback = function(crawler, url, err, data, context) {
  if (err != null ) {
    console.log(err.message);
    return;
  }

  // get variable from the context
  var page = context.page;
  if (page == null || typeof(page) == 'undefined'){
    page = 1;
  }

  var filterId = context.filterId;
  if (filterId == null || typeof(filterId) == 'undefined'){
    filterId = null;
  }

  var category = context.category;
  if (category == null || typeof(category) == 'undefined'){
    category = 'default';
  }

  var brand = context.brand;
  if (brand == null || typeof(brand) == 'undefined'){
    console.error('No brand information for category url: ' + url);
    return;
  }

  // start analysing the page
  var $ = cheerio.load(data);
  var count = 0;
  $('.item').each(function(i, e){
    console.log('===> SKU');
    var title = $(e).attr(title);
    var link = $('a', this).attr('href');
    var image = $('img', this).attr('src');
    var price = $('.px_actuel', this).text();

    console.log(price);

    count++;
  });

  // try next page
  if (count != 0) {
    var urlObj = URL.parse(url, true);
    var newUrl = 'http://' + urlObj.host + urlObj.pathname + '#pgc=' + (page + 1) + ((filterId == null) ? '' : '&cat=' + filterId);
    var newTask = new Task( {
      url : newUrl,
      context : {'brand' : brand, 'category':category, 'async': true, 'page' : page+1, 'filterId': filterId},
      callback : categoryCallback
    });

    console.log('[Category task] | New category task for next page ' + (page+1) + ' | ' + category + ' @ ' + brand + ': ' + newUrl);
    crawler.push(newTask);
  } else {
    console.log('[Category task] | No item found ');
  }
}

var marqueCallback = function(crawler, url, err, data, context) {
  if (err != null ) {
    console.error(err.message);
    return;
  }

  var brand = context.brand;

  var $ = cheerio.load(data);

  var categoryCount = 0;
  $('#filtre_category, #filtre_subcategory').each(function(i, e) {

    $('li[class!="all hidden"]', this).each(function(i, e){
      categoryCount++;

      var category = $('label', this).text();
      var filterId = $('input', this).attr('filter_id');

      var newUrl = url;
      if (url.slice(-6) == '#pgc=1') {
        newUrl += '&cat=' + filterId;
      } else {
        newUrl += '#pgc=1&cat=' + filterId;
      }

      var newTask = new Task( {
        url : newUrl,
        context : {'brand' : brand, 'category':category, 'async': true, 'page' : 1, 'filterId' : filterId},
        callback : categoryCallback
      });

      console.log('[Marque task] | New category task | ' + category + ' @ ' + brand + ': ' + newUrl);
      crawler.push(newTask);
    });
  });

  // if there is no category, create a task to crawl this page directly
  if (categoryCount==0){
    var newTask = new Task( {
      'url' : url,
      context : {'brand' : brand, 'category': 'default', 'async': true, 'page' : 1},
      callback : categoryCallback
    });
    console.log('[Marque task] | New category task | ' +  'default@' + brand + ': ' + url);
    crawler.push(newTask);
  }
}


var mainCallback = function (crawler, url, error, data, context) {
	if (error != null ) {
		console.error(error.message);
		return;
	} 
	
	var $ = cheerio.load(data);
	
	$('.marque').each(function(i, e) {
    if (i > 2){
      return;
    }

		var marque = $('a', this).text();
		var link = $('a', this).attr('href');

		if (link != null) {
			var newLink = link
			if (link.substring(0, 4) != 'http') {
				// TODO: append root to the link
			} 
			
			// create a new task and put in queue
			var newTask = new Task( {
			  url : newLink,
        context : {'brand' : marque},
        callback : marqueCallback
});

crawler.push(newTask);
}
});
}

var mainTask = new Task({
	url : 'http://www.placedestendances.com/les-marques,1',
	context : {},
	callback : mainCallback
});

// export the main task only
module.exports = mainTask;


