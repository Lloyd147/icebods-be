const Joi = require('joi');

function validateOrder(req) {
  const schema = Joi.object({
    id: Joi.string().required(),
    order: Joi.number().min(1).required(),
  });

  return schema.validate(req);
}

function validatePagination(req) {
  const schema = Joi.object({
    pageNumber: Joi.number().min(1).required(),
    pageSize: Joi.number().min(1).required(),
    disabled: Joi.boolean(),
  });

  return schema.validate(req);
}

function validateRequest(req) {
  const schema = Joi.object({
    isEdit: Joi.boolean().optional(),
    buyLink1: Joi.object({
      name: Joi.string().when('isEdit', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required(),
      }),
      link: Joi.string().when('isEdit', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required(),
      }),
      price: Joi.number().when('isEdit', {
        is: Joi.exist(),
        then: Joi.optional(),
        otherwise: Joi.required(),
      }),
    }).when('isEdit', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    buyLink2: Joi.object({
      name: Joi.string().optional().allow(''),
      link: Joi.string().optional().allow(''),
      price: Joi.number().optional().allow(null),
    }),
    cons: Joi.string(),
    deliveryTime: Joi.string(),
    dimensions: Joi.string(),
    enabled: Joi.boolean(),
    name: Joi.string().when('isEdit', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    overview: Joi.string(),
    promoInfo: Joi.string().max(20).when('isEdit', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    pros: Joi.string(),
    rating: Joi.number().min(0).max(5),
    review: Joi.string(),
    terms: Joi.string(),
  });

  return schema.validate(req);
}

const validateFileInput = (req) => {
  const schema = Joi.object({
    infoImage: Joi.array().items(
      Joi.object({
        fieldname: Joi.string().valid('infoImage').required(),
        mimetype: Joi.string()
          .valid('image/png', 'image/jpg', 'image/jpeg')
          .required(),
      }).unknown()
    ),
  });

  return schema.validate(req);
};

function extractRequestBody(req) {
  return {
    buyLink1: req.body.buyLink1 && JSON.parse(req.body.buyLink1),
    buyLink2: req.body.buyLink2 && JSON.parse(req.body.buyLink2),
    cons: req.body.cons,
    deliveryTime: req.body.deliveryTime,
    dimensions: req.body.dimensions,
    enabled: req.body.enabled,
    name: req.body.name,
    overview: req.body.overview,
    promoInfo: req.body.promoInfo,
    pros: req.body.pros,
    rating: req.body.rating,
    review: req.body.review,
    terms: req.body.terms,
  };
}

module.exports.validateOrder = validateOrder;
module.exports.validatePagination = validatePagination;
module.exports.validateRequest = validateRequest;
module.exports.validateFileInput = validateFileInput;
module.exports.extractRequestBody = extractRequestBody;
