const mongoose = require('mongoose');

const portableSchema = new mongoose.Schema({
  buyLink1: {
    name: { type: String },
    price: { type: Number },
    link: { type: String },
  },
  buyLink2: {
    name: { type: String },
    price: { type: Number },
    link: { type: String },
  },
  cons: { type: String },
  deliveryTime: { type: String },
  dimensions: { type: String },
  enabled: { type: Boolean },
  infoImage: {
    cloudinaryId: { type: String },
    imageUrl: { type: String },
  },
  name: { type: String },
  order: { type: Number, min: 1 },
  overview: { type: String },
  promoInfo: { type: String },
  pros: { type: String },
  rating: { type: Number, min: 0, max: 5 },
  review: { type: String },
  terms: { type: String },
  category: { type: String },
});

portableSchema.pre('save', async function (next) {
  if (!this.order) {
    const totalPortables = await Portable.countDocuments();
    this.order = totalPortables + 1;
  }
  next();
});

const Portable = mongoose.model('Portable', portableSchema);

module.exports.Portable = Portable;
