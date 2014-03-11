// entry point for crawling www.placeDesTendances.com
var Task = require('../../lib/Task');
var cheerio = require('cheerio');
var SKU = require('../../lib/SKU');
var URL = require('url');
var siteConfig = require('./config');
var DBUtils = require('./DBUtils');
var moment = require('moment');

var Logger = require('../../lib/Logger');
var logger = new Logger('PlaceDesTendances');

var saveSKU = function(sku) {
  var logger = new Logger('Save SKU');
  logger.info('processing :' + sku.toString());
  var dbUtils = new DBUtils(siteConfig.uri);

  dbUtils.run(function(db){
    var collection = db.collection(siteConfig.collection);
    collection.find(
    {
      'link' : sku.link,
      'name' : sku.name,
      'category' : sku.category,
      'marque' : sku.marque
    }, {'_id' : 1}).nextObject(function(err, doc){

      if (err != null) {
        logger.error(err.message);
        db.close();
        throw err;
      }

      if (doc == null) {
        // create one
        logger.debug('create sku');
        sku._id = dbUtils.newID();
        collection.insert(sku, function(err, doc) {
          if (err != null) {
            logger.error(err.message);
            db.close();
            throw err;
          }
          logger.debug('finish creating sku');
          db.close();
        });
      } else {
        logger.debug('update sku');
        // update it
        collection.update(
          {
            'link' : sku.link,
            'name' : sku.name,
            'category' : sku.category,
            'marque' : sku.marque
          },
          {
            $set: {
              price: sku.price,
              currency : sku.currency,
              link : sku.link,
              description : sku.description,
              date : moment().format('LLLL'),
              size : sku.size,
              colors : sku.colors,
              originalPhotos : sku.originalPhotos,
              localPhotos : sku.localPhotos
            }
          },
          {multi: true}, function(err) {
            if (err) {
              logger.error(err.message);
            } else {
              logger.debug('successfully updated');
            }

            db.close();
          }
        );
      }

    });

  });
}

var imageCallback = function(task, url, err, data) {
  var logger = new Logger('Image Task');
  logger.info('processing :' + url);

  var sku = task.context.item;

  try {
    var localPhotos = JSON.parse(data);

    sku.localPhotos = [];
    for (var key in localPhotos) {
      if (localPhotos.hasOwnProperty(key)) {
        sku.localPhotos.push(localPhotos[key]);
      }
    }
  }catch(e) {
    logger.error(e.message);
    task.finish();
    return;
  }

  logger.debug('ready to save SKU');
  saveSKU(sku);

  task.finish();
}

var skuCallback = function(task, url, err, data) {
  var logger = new Logger('SKU Task');
  logger.info('processing :' + url);
  if (err != null ) {
    logger.error(err.message);
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
  if (price != null) {
    try {
      price = parseFloat(
        price.substring(0, price.length - ' €'.length).replace(/,/g, '.'));
    } catch(e){
      logger.error(e.message);
    }
  }
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

  var count = 0;
  $('#slider img').each(function(i, e){
    var originLink = $(this).attr('src');

    var i = originLink.lastIndexOf('.');
    var ext = (i < 0) ? '' : originLink.substr(i);

    var prefix = originLink.substring(0, originLink.length - ext.length);
    var j = prefix.lastIndexOf('.');
    var prefix = prefix.substring(0, j);

    originalImages.push(prefix + ext);
    count++;
  });

  sku.link = link;
  sku.marque = marque;
  sku.name = name;
  sku.price = price;
  sku.currency = currency;
  sku.size = size;
  sku.description = description;
  sku.originalPhotos = originalImages;

  logger.notice('Found ' + count + " images for item '" + sku.name + "' in category '" + sku.category + "' for marque '" + sku.marque + "'");

  // create a image task
  var newTask = new Task(task.crawler, {
    'url' : siteConfig.imageserver,
    'method' : 'post',
    'body' : JSON.stringify(originalImages),
    'context' : {'item' : sku},
    'callback' : imageCallback
  });
  logger.debug('New image task | ' + link);
  task.crawler.push(newTask);


  task.finish();
}


var categoryCallback = function(task, url, err, data) {
  var logger = new Logger('Category Task');
  logger.info('processing :' + url);
  if (err != null ) {
    logger.error(err.message);
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
      context : {'item': sku.clone(), 'dynamicpage': true},
      callback : skuCallback
    })

    logger.debug('New SKU task | ' + link);
    crawler.push(newTask);

    count++;
  });

  logger.notice('Found ' + count + " items in category '" + sku.category + "' for marque '" + sku.marque + "'");
  // try next page
  if (count != 0) {
    var urlObj = URL.parse(url, true);
    var newUrl = 'http://' + urlObj.host + urlObj.pathname + '#pgc=' + (page + 1) + ((filterId == null) ? '' : '&cat=' + filterId);
    var newTask = new Task( crawler, {
      url : newUrl,
      context : {'item': sku.clone(), 'dynamicpage': true, 'page' : page+1, 'filterId': filterId},
      callback : categoryCallback
    });

    logger.debug('New category task for next page ' + (page+1) + ' | ' + sku.category + ' @ ' + sku.marque + ': ' + newUrl);
    crawler.push(newTask);
  } else {
    logger.debug('No item found ');
  }

  task.finish();
}

var marqueCallback = function(task, url, err, data) {
  var logger = new Logger('Marque Task');
  logger.info('processing :' + url);
  if (err != null ) {
    logger.error(err.message);
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

      logger.debug('New category task | ' + category + ' @ ' + sku.marque + ': ' + newUrl);
      crawler.push(newTask);
    });
  });

  logger.notice('Found ' + categoryCount + " categories for marque '" + sku.marque + "'");

  // if there is no category, create a task to crawl this page directly
  if (categoryCount==0){
    sku.category = 'default';
    var newTask = new Task( crawler, {
      'url' : url,
      'context' : {'item' : sku.clone(), 'dynamicpage': true, 'page' : 1},
      'callback' : categoryCallback
    });
    logger.debug('New category task | ' +  'default@' + sku.marque + ': ' + url);
    crawler.push(newTask);
  }

  task.finish();
}


var mainCallback = function (task, url, error, data) {
  var logger = new Logger('Main Task');
  logger.info('processing :' + url);

	if (error != null ) {
		logger.error(error.message);
    task.finish();
		return;
	}

  var crawler = task.crawler;
  var context = task.context;

	var $ = cheerio.load(data);

  var count = 0;
	$('.marque').each(function(i, e) {
//    if (i > 2){
//      return;
//    }

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

      count++;
    }
  });

  logger.notice('Found ' + count + ' marques');

  // must call finish when the task is done
  task.finish();
}

function init(crawler){
  var task = new Task(crawler, {
    'url' : 'http://www.placedestendances.com/les-marques,1',
    'context' : {},
    'callback' : mainCallback
  });

  crawler.push(task);

  return {
    "imageCallback" : imageCallback,
    "skuCallback" : skuCallback,
    "categoryCallback" : categoryCallback,
    "marqueCallback" : marqueCallback,
    "mainCallback" : mainCallback
  }
}

// export the main task only
module.exports = init;


