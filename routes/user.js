const express = require('express');
const { User, validateUser } = require('../models/user');
const bcrypt = require('bcrypt');

const router = express.Router();

router.post('/', async (req, res) => {
  const { error } = validateUser(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ email: req.body.email });

  if (user) return res.status(400).send('User already registered.');

  user = new User({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
  });

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(req.body.password, salt);

  user.password = hash;

  await user.save();

  const token = user.generateAuthToken();

  res
    .header('x-auth-token', token)
    .send({ _id: user._id, name: user.name, email: user.email });
});

module.exports = router;
