const express = require('express');
const authorize = require('../middlewares/authorize');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const {
  validateOrder,
  validatePagination,
  validateRequest,
  extractRequestBody,
  validateFileInput,
} = require('../lib/utils');
const { Portable } = require('../models/portable');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', async (req, res) => {
  const { error } = validatePagination(req.query);
  if (error) return res.status(400).send(error.details[0].message);

  const page = parseInt(req.query.pageNumber);
  const limit = parseInt(req.query.pageSize);

  const options = req.query.disabled ? {} : { enabled: true };

  const portables = await Portable.find(options)
    .sort('order')
    .limit(limit)
    .skip((page - 1) * limit);

  const totalPortables = await Portable.countDocuments();
  const totalPages = Math.ceil(totalPortables / limit);

  res.send({
    offers: portables,
    currentPage: page,
    totalPages,
    totalOffers: totalPortables,
  });
});

router.post(
  '/',
  authorize,
  upload.fields([{ name: 'infoImage' }]),
  async (req, res) => {
    let portableData = extractRequestBody(req);
    const { error } = validateRequest(portableData);
    if (error) return res.status(400).send(error.details[0].message);

    let images = {};

    if (req.files) {
      const { error } = validateFileInput(req.files);
      if (error) return res.status(400).send(error.details[0].message);

      for (file in req.files) {
        const imgFile = req.files[file]?.[0];
        if (imgFile) {
          const imageData = await saveImage(imgFile, null);
          if (imageData?.error)
            return res
              .status(500)
              .send('An error occurred while processing the images.');

          images[file] = imageData;
        }
      }
    }
    if (images?.infoImage) portableData.infoImage = images.infoImage;

    const portable = new Portable(portableData);
    await portable.save();
    res.send(portable);
  }
);

router.put(
  '/:id',
  authorize,
  upload.fields([{ name: 'infoImage' }]),
  async (req, res) => {
    let portableData = extractRequestBody(req);
    const { error } = validateRequest({ isEdit: true, ...portableData });
    if (error) return res.status(400).send(error.details[0].message);

    const portable = await Portable.findById(req.params.id);

    if (!portable)
      return res
        .status(404)
        .send('The portable with the given ID does not exist.');

    let images = {};
    if (req.files) {
      const { error } = validateFileInput(req.files);
      if (error) return res.status(400).send(error.details[0].message);

      for (file in req.files) {
        const imgFile = req.files[file]?.[0];
        if (imgFile) {
          const imageData = await saveImage(
            imgFile,
            portable[file]?.cloudinaryId
          );
          if (imageData?.error)
            return res
              .status(500)
              .send('An error occurred while processing the images.');

          images[file] = imageData;
        }
      }
    }

    if (images?.infoImage) portableData.infoImage = images.infoImage;

    const updatedPortable = await Portable.findByIdAndUpdate(
      portable._id,
      portableData,
      {
        new: true,
      }
    );
    res.send(updatedPortable);
  }
);

router.delete('/:id', authorize, async (req, res) => {
  const portable = await Portable.findById(req.params.id);

  if (!portable)
    return res
      .status(404)
      .send('The portable with the given ID does not exist.');

  Portable.deleteOne({ _id: portable.id }).then(() => {
    if (portable?.infoImage?.cloudinaryId)
      deleteImage(portable.infoImage.cloudinaryId);
    Portable.updateMany(
      { order: { $gt: portable.order } },
      { $inc: { order: -1 } }
    ).then(() => {
      res.send(portable);
    });
  });
});

router.get('/:id', async (req, res) => {
  const portable = await Portable.findById(req.params.id);

  if (!portable)
    return res
      .status(404)
      .send('The portable with the given ID does not exist.');

  res.send(portable);
});

router.post('/reorder', authorize, async (req, res) => {
  const { error } = validateOrder(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const portable = await Portable.findById(req.body.id);

  if (!portable)
    return res
      .status(404)
      .send('The portable with the given ID does not exist.');

  const originalOrder = portable.order;
  const newOrder = parseInt(req.body.order);

  if (originalOrder !== newOrder) {
    portable.order = newOrder;
    portable.save().then(async () => {
      if (newOrder > originalOrder) {
        await Portable.updateMany(
          {
            order: { $gt: originalOrder, $lte: newOrder },
            _id: { $ne: portable._id },
          },
          { $inc: { order: -1 } }
        ).then(async () => {
          res.send('Success');
        });
      } else if (newOrder < originalOrder) {
        await Portable.updateMany(
          {
            order: { $gte: newOrder, $lt: originalOrder },
            _id: { $ne: portable._id },
          },
          { $inc: { order: 1 } }
        ).then(async () => {
          res.send('Success');
        });
      }
    });
  }
});

// Handle multer error with a custom response
router.use((err, req, res, next) => {
  if (
    err instanceof multer.MulterError &&
    err.code === 'LIMIT_UNEXPECTED_FILE'
  ) {
    return res
      .status(400)
      .send(`Invalid file field: '${err.field}'. Only 'infoImage' is allowed.`);
  }
  next(err);
});

async function saveImage(file, cloudinaryId = null) {
  try {
    const encodedImage = file.buffer.toString('base64');
    const dataURI = `data:${file.mimetype};base64,${encodedImage}`;

    const uploadOptions = {
      ...(cloudinaryId && { public_id: cloudinaryId, overwrite: true }),
    };

    const result = await cloudinary.uploader.upload(dataURI, uploadOptions);

    return {
      cloudinaryId: result.public_id,
      imageUrl: result.secure_url,
    };
  } catch (error) {
    console.error('Error processing image and portable:', error);
    return { error: true };
  }
}

async function deleteImage(cloudinaryId) {
  try {
    const result = await cloudinary.uploader.destroy(cloudinaryId);
    if (result.result === 'ok') {
      return true;
    } else {
      throw new Error(result);
    }
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    return false;
  }
}

module.exports = router;
