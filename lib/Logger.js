var winston = require('winston');
var winston = require('winston');

var customLevels = {
  levels: {
    debug: 0,
    info: 1,
    routine: 2,
    notice: 3,
    warn: 4,
    error: 5
  },
  colors: {
    debug: 'blue',
    info: 'green',
    routine : 'cyan',
    notice: 'magenta',
    warn: 'yellow',
    error: 'red'
  }
};

var logger = new (winston.Logger)({
  levels : customLevels.levels,
  colors : customLevels.colors,

  transports: [
    new (winston.transports.Console)({
      'level': 'routine',
      'timestamp':true,
      'colorize' : true})
  ]
});

function Logger(name) {
  this.name = name;
}

Logger.prototype.debug = function (message) {
  logger.debug('['+ this.name +'] ' + message );
}

Logger.prototype.info = function (message) {
  logger.info('['+ this.name +'] ' + message );
}

Logger.prototype.routine = function (message) {
  logger.routine('['+ this.name +'] ' + message);
}

Logger.prototype.notice = function (message) {
  logger.notice('['+ this.name +'] ' + message);
}

Logger.prototype.warn = function (message) {
  logger.warn('['+ this.name +'] ' + message );
}

Logger.prototype.error = function (message) {
  logger.error('['+ this.name +'] ' + message );
}

Logger.prototype.log = function (level, message) {
  logger.log(level, '['+ this.name +']' + message );
}


module.exports = Logger;