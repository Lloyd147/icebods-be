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
const { Tub } = require('../models/tub');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', async (req, res) => {
  const { error } = validatePagination(req.query);
  if (error) return res.status(400).send(error.details[0].message);

  const page = parseInt(req.query.pageNumber);
  const limit = parseInt(req.query.pageSize);

  const options = req.query.disabled ? {} : { enabled: true };

  const tubs = await Tub.find(options)
    .sort('order')
    .limit(limit)
    .skip((page - 1) * limit);

  const totalTubs = await Tub.countDocuments();
  const totalPages = Math.ceil(totalTubs / limit);

  res.send({
    offers: tubs,
    currentPage: page,
    totalPages,
    totalOffers: totalTubs,
  });
});

router.post(
  '/',
  authorize,
  upload.fields([{ name: 'infoImage' }]),
  async (req, res) => {
    let tubData = extractRequestBody(req);
    const { error } = validateRequest(tubData);
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
    if (images?.infoImage) tubData.infoImage = images.infoImage;

    const tub = new Tub(tubData);
    await tub.save();
    res.send(tub);
  }
);

router.put(
  '/:id',
  authorize,
  upload.fields([{ name: 'infoImage' }]),
  async (req, res) => {
    let tubData = extractRequestBody(req);
    const { error } = validateRequest({ isEdit: true, ...tubData });
    if (error) return res.status(400).send(error.details[0].message);

    const tub = await Tub.findById(req.params.id);

    if (!tub)
      return res.status(404).send('The tub with the given ID does not exist.');

    let images = {};
    if (req.files) {
      const { error } = validateFileInput(req.files);
      if (error) return res.status(400).send(error.details[0].message);

      for (file in req.files) {
        const imgFile = req.files[file]?.[0];
        if (imgFile) {
          const imageData = await saveImage(imgFile, tub[file]?.cloudinaryId);
          if (imageData?.error)
            return res
              .status(500)
              .send('An error occurred while processing the images.');

          images[file] = imageData;
        }
      }
    }

    if (images?.infoImage) tubData.infoImage = images.infoImage;

    const updatedTub = await Tub.findByIdAndUpdate(tub._id, tubData, {
      new: true,
    });
    res.send(updatedTub);
  }
);

router.delete('/:id', authorize, async (req, res) => {
  const tub = await Tub.findById(req.params.id);

  if (!tub)
    return res.status(404).send('The tub with the given ID does not exist.');

  Tub.deleteOne({ _id: tub.id }).then(() => {
    if (tub?.infoImage?.cloudinaryId) deleteImage(tub.infoImage.cloudinaryId);
    Tub.updateMany({ order: { $gt: tub.order } }, { $inc: { order: -1 } }).then(
      () => {
        res.send(tub);
      }
    );
  });
});

router.get('/:id', async (req, res) => {
  const tub = await Tub.findById(req.params.id);

  if (!tub)
    return res.status(404).send('The tub with the given ID does not exist.');

  res.send(tub);
});

router.post('/reorder', authorize, async (req, res) => {
  const { error } = validateOrder(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const tub = await Tub.findById(req.body.id);

  if (!tub)
    return res.status(404).send('The tub with the given ID does not exist.');

  const originalOrder = tub.order;
  const newOrder = parseInt(req.body.order);

  if (originalOrder !== newOrder) {
    tub.order = newOrder;
    tub.save().then(async () => {
      if (newOrder > originalOrder) {
        await Tub.updateMany(
          {
            order: { $gt: originalOrder, $lte: newOrder },
            _id: { $ne: tub._id },
          },
          { $inc: { order: -1 } }
        ).then(async () => {
          res.send('Success');
        });
      } else if (newOrder < originalOrder) {
        await Tub.updateMany(
          {
            order: { $gte: newOrder, $lt: originalOrder },
            _id: { $ne: tub._id },
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
    console.error('Error processing image and tub:', error);
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
