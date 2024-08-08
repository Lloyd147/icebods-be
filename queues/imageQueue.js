const Queue = require('bull');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs-extra');
const path = require('path');
const imageQueue = new Queue('imageQueue');
async function saveImage(file, cloudinaryId = null, isLogo = false) {
  if (!file) {
    console.log('No file provided to saveImage function');
    return null;
  }
  try {
    const filePath = path.join(__dirname, '..', file.path);
    const fileBuffer = await fs.readFile(filePath);
    const encodedImage = fileBuffer.toString('base64');
    const dataURI = `data:${file.mimetype};base64,${encodedImage}`;
    const uploadOptions = {
      transformation: isLogo ? [{ width: 300, crop: 'scale' }] : [],
      ...(cloudinaryId && { public_id: cloudinaryId, overwrite: true })
    };
    const result = await cloudinary.uploader.upload(dataURI, uploadOptions);
    console.log('Result', result);
    await fs.unlink(filePath);
    return {
      cloudinaryId: result.public_id,
      imageUrl: result.secure_url
    };
  } catch (error) {
    console.error('Error processing image:', error);
    return { error: true };
  }
}
imageQueue.process(async (job) => {
  const { file, cloudinaryId, isLogo } = job.data;
  return await saveImage(file, cloudinaryId, isLogo);
});
module.exports = imageQueue;
