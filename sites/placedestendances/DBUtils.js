var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;


function DBUtils(uri) {
  this.uri = uri;
}

DBUtils.prototype.newID = function() {
  return new ObjectID();
}

DBUtils.prototype.run = function(callback) {
  MongoClient.connect(this.uri, function(err, db) {
    if(err) throw err;

    callback(db);
  });
}

module.exports = DBUtils;