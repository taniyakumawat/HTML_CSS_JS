import mongoose from 'mongoose';
import env from './env.js';

/**
 * Connect to MongoDB.
 * In development the server keeps running without a DB connection so the
 * API skeleton can be tested before MongoDB is installed/running.
 */
const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.mongoUri);
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    if (env.nodeEnv === 'production') {
      process.exit(1);
    }
    console.warn('⚠️  Continuing without database (development mode). Start MongoDB and restart the server.');
  }
};

export default connectDB;
