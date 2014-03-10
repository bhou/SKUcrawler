// entry point for crawling www.placeDesTendances.com
var Task = require('../../lib/Task');
var cheerio = require('cheerio');
var SKU = require('../../lib/SKU');
var db = require('mongodb');
var URL = require('url');

var imageCallback = function(task, url, err, data) {
  console.log('[Image Task] | saving images ' + data);

  var sku = task.context.item;

  try {
    sku.localPhotos = JSON.parse(data);
  }catch(e) {
    console.error(e);
  }

  console.log('[Image Task] | complete SKU: ' + sku);

  task.finish();
}

var skuCallback = function(task, url, err, data) {
  if (err != null ) {
    console.log(err.message);
    task.finish();
    return;
  }

  var context = task.context;
  var sku = context.item;

  // start analysing the page
  var $ = cheerio.load(data);

  var link = url;
  var marque = $('h2#marque a').text();
  var name = $('#blocAchat h1').text();
  var price = $('.price span.px_boutique').text();
  var currency = 'euro';
  var size = [];
  $('.size .label').each(function(i, e){
    size.push($(this).text());
  });

  var description = '';
  $('.desc .contents li').each(function(i, e){
    description += $(this).text() + '\n';
  });

  var originalImages = [];

  $('#slider img').each(function(i, e){
    var originLink = $(this).attr('src');

    var i = originLink.lastIndexOf('.');
    var ext = (i < 0) ? '' : originLink.substr(i);

    var prefix = originLink.substring(0, originLink.length - ext.length);
    var j = prefix.lastIndexOf('.');
    var prefix = prefix.substring(0, j);

    originalImages.push(prefix + ext);
  });

//  console.log('[SKU Task] | SKU | marque: ' + marque
//    + '; name: ' + name
//    + '; price: ' + price
//    + '; size:' + size
//    + '; description: ' + description
//    + '; original images: ' + originalImages);

  // create a image task
  var newTask = new Task(task.crawler, {
    'url' : 'http://localhost:1337',
    'method' : 'post',
    'body' : JSON.stringify(originalImages),
    'context' : {'item' : sku},
    'callback' : imageCallback
  });
  console.log('[SKU task] | New image task | ' + link);
  task.crawler.push(newTask);


  task.finish();
}


var categoryCallback = function(task, url, err, data) {
  if (err != null ) {
    console.log(err.message);
    task.finish();
    return;
  }

  var crawler = task.crawler;
  var context = task.context;

  // get variable from the context
  var page = context.page;
  if (page == null || typeof(page) == 'undefined'){
    page = 1;
  }

  var filterId = context.filterId;
  if (filterId == null || typeof(filterId) == 'undefined'){
    filterId = null;
  }

  var sku = context.item;

  // start analysing the page
  var $ = cheerio.load(data);
  var count = 0;
  $('.item').each(function(i, e){
    var link = $('a', this).attr('href');

    var newTask = new Task(crawler, {
      'url' : link,
      context : {'item': sku.clone(), 'dynamicpage': false},
      callback : skuCallback
    })

    console.log('[Category task] | New SKU task | ' + link);
    crawler.push(newTask);

    count++;
  });

  // try next page
  if (count != 0) {
    var urlObj = URL.parse(url, true);
    var newUrl = 'http://' + urlObj.host + urlObj.pathname + '#pgc=' + (page + 1) + ((filterId == null) ? '' : '&cat=' + filterId);
    var newTask = new Task( crawler, {
      url : newUrl,
      context : {'item': sku.clone(), 'dynamicpage': true, 'page' : page+1, 'filterId': filterId},
      callback : categoryCallback
    });

    console.log('[Category task] | New category task for next page ' + (page+1) + ' | ' + sku.category + ' @ ' + sku.marque + ': ' + newUrl);
    crawler.push(newTask);
  } else {
    console.log('[Category task] | No item found ');
  }

  task.finish();
}

var marqueCallback = function(task, url, err, data) {
  if (err != null ) {
    console.error(err.message);
    task.finish();
    return;
  }

  var crawler = task.crawler;
  var context = task.context;

  var sku = context.item;

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

      sku.category = category;
      var newTask = new Task( crawler, {
        'url' : newUrl,
        'context' : {'item': sku.clone(), 'dynamicpage': true, 'page' : 1, 'filterId' : filterId},
        'callback' : categoryCallback
      });

      console.log('[Marque task] | New category task | ' + category + ' @ ' + sku.marque + ': ' + newUrl);
      crawler.push(newTask);
    });
  });

  // if there is no category, create a task to crawl this page directly
  if (categoryCount==0){
    sku.category = 'default';
    var newTask = new Task( crawler, {
      'url' : url,
      'context' : {'item' : sku.clone(), 'dynamicpage': true, 'page' : 1},
      'callback' : categoryCallback
    });
    console.log('[Marque task] | New category task | ' +  'default@' + sku.marque + ': ' + url);
    crawler.push(newTask);
  }

  task.finish();
}


var mainCallback = function (task, url, error, data) {
	if (error != null ) {
		console.error(error.message);
    task.finish();
		return;
	}

  var crawler = task.crawler;
  var context = task.context;

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

      var sku = new SKU();  // this sku is only a template
      sku.marque = marque;
			// create a new task and put in queue
			var newTask = new Task(crawler, {
			  'url' : newLink,
        'context' : {'item' : sku.clone()},
        'callback' : marqueCallback
      });

      crawler.push(newTask);
    }
  });

  // must call finish when the task is done
  task.finish();
}

function init(crawler){
  return new Task(crawler, {
    'url' : 'http://www.placedestendances.com/les-marques,1',
    'context' : {},
    'callback' : mainCallback
  });
}

// export the main task only
module.exports = init;


