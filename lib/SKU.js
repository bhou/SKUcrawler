/**
 * SKU class
 * 
 * a representation of a product
 */

function SKU() {
	this._id = null;
	this.marque = null;
	this.category = null;
  this.name = null;
	this.price = null;
	this.currency = null;
	this.link = null;
  this.description = null;
  this.date = null;
  this.size = [];
  this.colors = [];
	this.originalPhotos = [];
  this.localPhotos = [];
}

SKU.prototype.clone = function() {
  var inst = new SKU();

  inst._id = this._id;
  inst.marque = this.marque;
  inst.category = this.category;
  inst.name = this.name;
  inst.price = this.price;
  inst.currency = this.currency;
  inst.link = this.link;
  inst.description = this.description;
  inst.size = this.size;
  for (var i = 0; i < this.size.length; i++) {
    inst.size.push(this.size[i]);
  }

  inst.colors = [];
  for (var i = 0; i < this.colors.length; i++) {
    inst.colors.push(this.colors[i]);
  }

  inst.originalPhotos = [];
  for (var i = 0; i < this.originalPhotos.length; i++) {
    inst.originalPhotos.push(this.originalPhotos[i]);
  }

  inst.localPhotos = [];
  for (var i = 0; i < this.localPhotos.length; i++) {
    inst.localPhotos.push(this.originalPhotos[i]);
  }

  return inst;
}


module.exports = SKU;