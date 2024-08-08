const Joi = require('joi');
const mongoose = require('mongoose');
const logoSchema = new mongoose.Schema({
  cloudinaryId: { type: String, required: true },
  imageUrl: { type: String, required: true }
});
// Define Mongoose Schemas
const followUsSchema = new mongoose.Schema({
  link: { type: String, required: true },
  icon: logoSchema
});
const pageLinksSchema = new mongoose.Schema({
  name: { type: String, required: true },
  link: { type: String, required: true }
});
const accordionItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  text: { type: String, required: true }
});
const accordiansSchema = new mongoose.Schema({
  mainTitle: { type: String, required: true },
  items: [accordionItemSchema]
});
const otherTextSchema = new mongoose.Schema({
  title: { type: String, required: true },
  icon: logoSchema,
  text: { type: String, required: true }
});
const footerSchema = new mongoose.Schema({
  status: { type: String, required: true, enum: ['active', 'inactive'] },
  name: { type: String, required: true },
  followUs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FollowUs' }],
  pageLinks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PageLinks' }],
  accordians: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Accordians' }],
  otherText: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OtherText' }]
});
const FollowUs = mongoose.model('FollowUs', followUsSchema);
const PageLinks = mongoose.model('PageLinks', pageLinksSchema);
const Accordians = mongoose.model('Accordians', accordiansSchema);
const OtherText = mongoose.model('OtherText', otherTextSchema);
const Footer = mongoose.model('Footer', footerSchema);
// Joi Validation Schemas
const validateFollowUs = (req) => {
  const schema = Joi.object({
    link: Joi.string().uri().required(),
    icon: Joi.array().items(
      Joi.object({
        fieldname: Joi.string().valid('logo').required(),
        mimetype: Joi.string().valid('image/png', 'image/jpg', 'image/jpeg').required()
      }).unknown()
    )
  });
  return schema.validate(req);
};
const validatePageLinks = (req) => {
  const schema = Joi.object({
    name: Joi.string().uri().required(),
    link: Joi.string().uri().required()
  });
  return schema.validate(req);
};
const validateAccordians = (req) => {
  const schema = Joi.object({
    mainTitle: Joi.string().required(),
    items: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().required(),
          text: Joi.string().required()
        })
      )
      .required()
  });
  return schema.validate(req);
};
const validateOtherText = (req) => {
  const schema = Joi.object({
    title: Joi.string().required(),
    icon: Joi.array().items(
      Joi.object({
        fieldname: Joi.string().valid('logo').required(),
        mimetype: Joi.string().valid('image/png', 'image/jpg', 'image/jpeg').required()
      }).unknown()
    ),
    text: Joi.string().required()
  });
  return schema.validate(req);
};
const validateStatusUpdate = (req) => {
  const schema = Joi.object({
    status: Joi.string().valid('active', 'inactive').required()
  });
  return schema.validate(req);
};
const validateFooter = (req) => {
  const schema = Joi.object({
    status: Joi.string().valid('active', 'inactive').required(),
    name: Joi.string().required(),
    followUs: Joi.array(),
    pageLinks: Joi.array(),
    accordians: Joi.object({
      mainTitle: Joi.string().required(),
      items: Joi.array()
        .items(
          Joi.object({
            title: Joi.string().required(),
            text: Joi.string().required()
          })
        )
        .required()
    }),
    otherText: Joi.array()
  });
  return schema.validate(req);
};
module.exports = {
  Footer,
  FollowUs,
  PageLinks,
  Accordians,
  OtherText,
  validateFollowUs,
  validatePageLinks,
  validateAccordians,
  validateOtherText,
  validateFooter,
  validateStatusUpdate
};
