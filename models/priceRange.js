const mongoose = require('mongoose');

const priceRangeSchema = new mongoose.Schema({
  portables: { type: String, default: '70-100' },
  barrels: { type: String, default: '500-1500' },
  tubs: { type: String, default: '1000-20,000' },
});

const PriceRange = mongoose.model('PriceRange', priceRangeSchema);

module.exports.PriceRange = PriceRange;
