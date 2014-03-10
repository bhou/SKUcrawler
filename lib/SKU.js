/**
 * SKU class
 * 
 * a representation of a product
 */
 
function SKU() {
	this.id = null;
	this.brand = null;
	this.category = null;
	this.price = null;
	this.currency = null;
	this.source = null;
	this.photos = [];
}

SKU.prototype.save = function() {

}



module.exports = SKU;