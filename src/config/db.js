const mongoose = require('mongoose');

let isConnected = false;
let memoryStore = {
  users: [],
  resumes: [],
  jds: [],
  matches: [],
  interviews: []
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/prepvoice';
  
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000
    });
    isConnected = true;
    console.log(`[Database] MongoDB Connected successfully to: ${uri}`);
  } catch (err) {
    console.warn(`[Database] Warning: Could not connect to MongoDB at ${uri}.`);
    console.warn(`[Database] Note: The platform will run in resilient local mock store mode so all features work seamlessly out-of-the-box.`);
    isConnected = false;
  }
};

const getStatus = () => ({
  connected: isConnected,
  mode: isConnected ? 'MongoDB Live' : 'Embedded Mock Store'
});

module.exports = { connectDB, getStatus, memoryStore, isConnected: () => isConnected };
