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
const { Barrel } = require('../models/barrel');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', async (req, res) => {
  const { error } = validatePagination(req.query);
  if (error) return res.status(400).send(error.details[0].message);

  const page = parseInt(req.query.pageNumber);
  const limit = parseInt(req.query.pageSize);

  const options = req.query.disabled ? {} : { enabled: true };

  const barrels = await Barrel.find(options)
    .sort('order')
    .limit(limit)
    .skip((page - 1) * limit);

  const totalBarrels = await Barrel.countDocuments();
  const totalPages = Math.ceil(totalBarrels / limit);

  res.send({
    offers: barrels,
    currentPage: page,
    totalPages,
    totalOffers: totalBarrels,
  });
});

router.post(
  '/',
  authorize,
  upload.fields([{ name: 'infoImage' }]),
  async (req, res) => {
    let barrelData = extractRequestBody(req);
    const { error } = validateRequest(barrelData);
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
    if (images?.infoImage) barrelData.infoImage = images.infoImage;

    const barrel = new Barrel(barrelData);
    await barrel.save();
    res.send(barrel);
  }
);

router.put(
  '/:id',
  authorize,
  upload.fields([{ name: 'infoImage' }]),
  async (req, res) => {
    let barrelData = extractRequestBody(req);
    const { error } = validateRequest({ isEdit: true, ...barrelData });
    if (error) return res.status(400).send(error.details[0].message);

    const barrel = await Barrel.findById(req.params.id);

    if (!barrel)
      return res
        .status(404)
        .send('The barrel with the given ID does not exist.');

    let images = {};
    if (req.files) {
      const { error } = validateFileInput(req.files);
      if (error) return res.status(400).send(error.details[0].message);

      for (file in req.files) {
        const imgFile = req.files[file]?.[0];
        if (imgFile) {
          const imageData = await saveImage(
            imgFile,
            barrel[file]?.cloudinaryId
          );
          if (imageData?.error)
            return res
              .status(500)
              .send('An error occurred while processing the images.');

          images[file] = imageData;
        }
      }
    }

    if (images?.infoImage) barrelData.infoImage = images.infoImage;

    const updatedBarrel = await Barrel.findByIdAndUpdate(
      barrel._id,
      barrelData,
      {
        new: true,
      }
    );
    res.send(updatedBarrel);
  }
);

router.delete('/:id', authorize, async (req, res) => {
  const barrel = await Barrel.findById(req.params.id);

  if (!barrel)
    return res.status(404).send('The barrel with the given ID does not exist.');

  Barrel.deleteOne({ _id: barrel.id }).then(() => {
    if (barrel?.infoImage?.cloudinaryId)
      deleteImage(barrel.infoImage.cloudinaryId);
    Barrel.updateMany(
      { order: { $gt: barrel.order } },
      { $inc: { order: -1 } }
    ).then(() => {
      res.send(barrel);
    });
  });
});

router.get('/:id', async (req, res) => {
  const barrel = await Barrel.findById(req.params.id);

  if (!barrel)
    return res.status(404).send('The barrel with the given ID does not exist.');

  res.send(barrel);
});

router.post('/reorder', authorize, async (req, res) => {
  const { error } = validateOrder(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const barrel = await Barrel.findById(req.body.id);

  if (!barrel)
    return res.status(404).send('The barrel with the given ID does not exist.');

  const originalOrder = barrel.order;
  const newOrder = parseInt(req.body.order);

  if (originalOrder !== newOrder) {
    barrel.order = newOrder;
    barrel.save().then(async () => {
      if (newOrder > originalOrder) {
        await Barrel.updateMany(
          {
            order: { $gt: originalOrder, $lte: newOrder },
            _id: { $ne: barrel._id },
          },
          { $inc: { order: -1 } }
        ).then(async () => {
          res.send('Success');
        });
      } else if (newOrder < originalOrder) {
        await Barrel.updateMany(
          {
            order: { $gte: newOrder, $lt: originalOrder },
            _id: { $ne: barrel._id },
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
    console.error('Error processing image and barrel:', error);
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
