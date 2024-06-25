const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const { User } = require('../models/user');
const router = express.Router();

router.post('/', async (req, res) => {
  const { error } = validate(req.body);
  if (error) res.status(400).send(error.details[0].message);

  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send('Invalid email or password.');

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) return res.status(400).send('Invalid email or password.');

  const token = user.generateAuthToken();

  res.send(token);
});

function validate(req) {
  const schema = Joi.object({
    email: Joi.string().email().min(3).max(255).required(),
    password: Joi.string().required(),
  });

  return schema.validate(req);
}

module.exports = router;
