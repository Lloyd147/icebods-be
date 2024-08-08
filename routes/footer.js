const express = require('express');
const {
  Footer,
  FollowUs,
  PageLinks,
  Accordians,
  OtherText,
  validateFooter,
  validateFollowUs,
  validateOtherText,
  validatePageLinks,
  validateAccordians,
  validateStatusUpdate
} = require('../models/footer'); // Adjust the path as necessary
const authorize = require('../middlewares/authorize');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs-extra');
const path = require('path');
const imageQueue = require('../queues/imageQueue');
router.use(express.json());
router.get('/', async (req, res) => {
  try {
    const footers = await Footer.find({}, 'name status');
    res.send(footers);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'An error occurred while fetching footer names and statuses' });
  }
});
// CREATE a new Footer
router.post('/', authorize, upload.any(), async (req, res) => {
  try {
    const { error } = validateFooter(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    let { followUs, pageLinks, accordians, otherText, ...footerData } = req.body;
    // Helper function to process items with images
    const processItems = async (items, model, fieldName) => {
      if (items && items.length > 0) {
        const processedItems = await Promise.all(
          items.map(async (item, index) => {
            if (fieldName) {
              const file = req.files.find((f) => f.fieldname === `${fieldName}[${index}][icon]`);
              if (file) {
                const imageData = await saveImage(file);
                if (imageData?.error) throw new Error(`Error processing icon`);
                item.icon = {
                  cloudinaryId: imageData.cloudinaryId,
                  imageUrl: imageData.imageUrl
                };
              }
            }
            return item;
          })
        );
        const docs = await model.insertMany(processedItems);
        return docs.map((doc) => doc._id);
      }
      return [];
    };
    // Process followUs, pageLinks, and otherText
    const [processedFollowUs, processedPageLinks, processedOtherText] = await Promise.all([
      processItems(followUs, FollowUs, 'followUs'),
      processItems(pageLinks, PageLinks),
      processItems(otherText, OtherText, 'otherText')
    ]);
    // Process accordians
    let processedAccordians = [];
    if (accordians && accordians.mainTitle && accordians.items && accordians.items.length > 0) {
      const { error } = validateAccordians(accordians);
      if (error) throw new Error(`Validation error: ${error.details[0].message}`);
      const accordianDoc = new Accordians({
        mainTitle: accordians.mainTitle,
        items: accordians.items
      });
      await accordianDoc.save();
      processedAccordians = [accordianDoc._id];
    }
    const footer = new Footer({
      ...footerData,
      followUs: processedFollowUs,
      pageLinks: processedPageLinks,
      accordians: processedAccordians,
      otherText: processedOtherText
    });
    await footer.save();
    res.status(201).json(footer);
  } catch (err) {
    console.error('Error creating footer:', err);
    res.status(500).json({ error: 'An error occurred while creating the footer' });
  }
});
// GET all Footers
router.get('/footers', async (req, res) => {
  try {
    const footers = await Footer.find().populate('followUs').populate('pageLinks').populate('accordians').populate('otherText');
    console.log(footers);
    res.send(footers);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});
// GET a specific Footer with associated details
router.get('/:id', authorize, async (req, res) => {
  try {
    const footer = await Footer.findById(req.params.id).populate('followUs').populate('pageLinks').populate('accordians').populate('otherText');
    if (!footer) return res.status(404).send('Footer not found');
    res.send(footer);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});
// UPDATE a specific Footer and its details
router.put('/:id', authorize, upload.any(), async (req, res) => {
  try {
    const footerId = req.params.id;
    const { error } = validateFooter(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    let { followUs, otherText, accordianMainTitle, accordians, pageLinks, ...footerData } = req.body;
    const footer = await Footer.findById(footerId).populate('followUs').populate('otherText').populate('accordians').populate('pageLinks');
    if (!footer) return res.status(404).json({ error: 'Footer not found' });
    // Helper function to process items with icons
    const processItems = async (items, existingItems, model, fieldName) => {
      if (items && items.length > 0) {
        const processedItems = await Promise.all(
          items.map(async (item, index) => {
            if (fieldName) {
              const file = req.files.find((f) => f.fieldname === `${fieldName}[${index}][icon]`);
              if (file) {
                const imageData = await saveImage(file);
                if (imageData?.error) throw new Error(`Error processing icon`);
                item.icon = {
                  cloudinaryId: imageData.cloudinaryId,
                  imageUrl: imageData.imageUrl
                };
              } else if (existingItems[index] && existingItems[index].icon) {
                item.icon = existingItems[index].icon;
              }
            }
            return item;
          })
        );
        const docs = await model.insertMany(processedItems);
        return docs.map((doc) => doc._id);
      }
      return existingItems.map((item) => item._id);
    };
    // Process followUs, otherText, and pageLinks sections
    const [processedFollowUs, processedOtherText, processedPageLinks] = await Promise.all([
      processItems(followUs, footer.followUs, FollowUs, 'followUs'),
      processItems(otherText, footer.otherText, OtherText, 'otherText'),
      processItems(pageLinks, footer.pageLinks, PageLinks)
    ]);
    // Process accordians
    let processedAccordians;
    if (accordians && accordians.mainTitle && accordians.items && accordians.items.length > 0) {
      const { error } = validateAccordians(accordians);
      if (error) throw new Error(`Validation error: ${error.details[0].message}`);
      const accordianDoc = await Accordians.findOneAndUpdate(
        { _id: { $in: footer.accordians } },
        {
          mainTitle: accordians.mainTitle,
          items: accordians.items
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      processedAccordians = [accordianDoc._id];
    } else {
      processedAccordians = footer.accordians;
    }
    // Update footer with processed data and remaining data
    const updatedFooter = await Footer.findByIdAndUpdate(
      footerId,
      {
        ...footerData,
        followUs: processedFollowUs,
        otherText: processedOtherText,
        accordians: processedAccordians,
        pageLinks: processedPageLinks
      },
      { new: true, runValidators: true }
    );
    res.json(updatedFooter);
  } catch (err) {
    console.error('Error updating footer:', err);
    res.status(500).json({ error: 'An error occurred while updating the footer' });
  }
});
// DELETE a specific Footer and its associated details
router.delete('/:id', authorize, async (req, res) => {
  try {
    const footer = await Footer.findById(req.params.id);
    if (!footer) return res.status(404).send('Footer not found');
    // Delete associated images
    const followUs = await FollowUs.find({ _id: { $in: footer.followUs } });
    for (const item of followUs) {
      if (item.icon && item.icon.cloudinaryId) {
        await deleteImage(item.icon.cloudinaryId);
      }
    }
    const otherText = await OtherText.find({ _id: { $in: footer.otherText } });
    for (const item of otherText) {
      if (item.icon && item.icon.cloudinaryId) {
        await deleteImage(item.icon.cloudinaryId);
      }
    }
    await FollowUs.deleteMany({ _id: { $in: footer.followUs } });
    await PageLinks.deleteMany({ _id: { $in: footer.pageLinks } });
    await Accordians.deleteMany({ _id: { $in: footer.accordians } });
    await OtherText.deleteMany({ _id: { $in: footer.otherText } });
    await footer.deleteOne();
    res.send(footer);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
});
// UPDATE Footer Status
router.put('/:id/status', authorize, async (req, res) => {
  const { error } = validateStatusUpdate(req.body);
  if (error) return res.status(400).send({ error: error.details[0].message });
  try {
    const footerId = req.params.id;
    const { status } = req.body;
    const footer = await Footer.findById(footerId);
    if (!footer) return res.status(404).send('Footer not found');
    if (status === 'active') {
      if (footer.name === 'Set All Footers') {
        // Set all other footers to inactive
        await Footer.updateMany({ _id: { $ne: footerId } }, { $set: { status: 'inactive' } });
      } else {
        // Make 'Set All Footers' inactive
        await Footer.updateMany({ name: 'Set All Footers' }, { $set: { status: 'inactive' } });
      }
    }
    footer.status = status;
    await footer.save();
    res.send(footer);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});
async function saveImage(file, cloudinaryId = null, isLogo = false) {
  try {
    const encodedImage = file.buffer.toString('base64');
    const dataURI = `data:${file.mimetype};base64,${encodedImage}`;
    const transformation = isLogo
      ? [
          {
            width: 300,
            crop: 'scale'
          }
        ]
      : [];
    const uploadOptions = {
      ...(cloudinaryId && { public_id: cloudinaryId, overwrite: true }),
      transformation
    };
    const result = await cloudinary.uploader.upload(dataURI, uploadOptions);
    return {
      cloudinaryId: result.public_id,
      imageUrl: result.secure_url
    };
  } catch (error) {
    console.error('Error processing image and offer:', error);
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
