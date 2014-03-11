var config = {
	'home' : 'P:/Dropbox/Biz/SKUcrawler',   // where to find the scrawler program
  'maxRequest' : 5,    // max request number
  'dynamicWait' : 2000,   // milliseconds, how long will the crawler wait for dynamic page loading
  'endCheckInterval' : 60000   // milliseconds, how often will the crawler check if there is still task alive
}

module.exports = config;