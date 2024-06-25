const express = require('express');
const Joi = require('joi');
const { PriceRange } = require('../models/priceRange');
const authorize = require('../middlewares/authorize');
const router = express.Router();

router.put('/', authorize, async (req, res) => {
  const { error } = validate(req.body);
  if (error) res.status(400).send(error.details[0].message);

  const priceRanges = await PriceRange.findOne();
  if (!priceRanges) {
    const newPriceRanges = new PriceRange(req.body);
    await newPriceRanges.save();
    return res.status(201).send(newPriceRanges);
  }

  priceRanges.barrels = req.body.barrels ?? priceRanges.barrels;
  priceRanges.tubs = req.body.tubs ?? priceRanges.tubs;
  priceRanges.portables = req.body.portables ?? priceRanges.portables;

  await priceRanges.save();
  res.send(priceRanges);
});

router.get('/', async (req, res) => {
  const priceRanges = await PriceRange.findOne();
  if (!priceRanges) {
    const newPriceRanges = new PriceRange();
    await newPriceRanges.save();
    return res.status(201).send(newPriceRanges);
  }
  res.send(priceRanges);
});

function validate(req) {
  const schema = Joi.object({
    barrels: Joi.string(),
    tubs: Joi.string(),
    portables: Joi.string(),
  });

  return schema.validate(req);
}

module.exports = router;
