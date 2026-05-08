// config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // If process.env.MONGO_URI is undefined, it defaults to your local MongoDB instance
    const dbURL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/support-central';
    
    const conn = await mongoose.connect(dbURL);
    console.log(`🟢 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`🔴 Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;