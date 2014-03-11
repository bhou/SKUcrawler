var fs = require('fs');
var config = require('../config');
var Crawler = require('../lib/Crawler');
var Task = require('../lib/Task');
var SKU = require('../lib/SKU');

var crawler = new Crawler();

var callbacks = require('../sites/placedestendances/main')(crawler);

// remove the default task
crawler.queue.shift();

var sku = new SKU();
sku.category = "Jean";
// create a category task
var newTask = new Task( crawler, {
  url : 'http://acquaverde.placedestendances.com/pret-a-porter-mode-femme-fashion/carrousel-marque,12,4,232#pgc=1&cat=429',
  context : {'item': sku.clone(), 'dynamicpage': true, 'page' : 1, 'filterId': 429},
  callback : callbacks.categoryCallback
});

crawler.push(newTask);

// start the crawler
crawler.start();