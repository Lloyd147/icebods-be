const mongoose = require('mongoose');

async function connectDb() {
  try {
    await mongoose.connect(process.env.MONGO_DB);
    console.log('Connected to DB');
  } catch (error) {
    console.log('Cannot connect to DB. Error: ', error);
  }
}

module.exports = connectDb;
