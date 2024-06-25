const Joi = require('joi');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    minLength: 3,
    maxLength: 255,
    required: true,
  },
  email: {
    type: String,
    minLength: 3,
    maxLength: 255,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    minLength: 8,
    maxLength: 1024,
    required: true,
  },
});

userSchema.methods.generateAuthToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_KEY);
};

const User = mongoose.model('User', userSchema);

function validateUser(req) {
  const schema = Joi.object({
    name: Joi.string().min(3).max(255).required(),
    email: Joi.string().email().min(3).max(255).required(),
    password: Joi.string().min(8).max(255).required(),
  });

  return schema.validate(req);
}

module.exports.User = User;
module.exports.validateUser = validateUser;
