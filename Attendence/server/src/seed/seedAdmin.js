/**
 * Seeds the default administrator account.
 * Run: npm run seed   (from server/ - requires MONGO_URI in .env)
 */
import mongoose from 'mongoose';
import env from '../config/env.js';
import User from '../models/User.js';

const ADMIN = {
  name: 'Administrator',
  email: 'admin@college.edu',
  password: 'Admin@123',
  role: 'admin',
};

const run = async () => {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log(`✅ Connected: ${mongoose.connection.name}`);

  const existing = await User.findOne({ email: ADMIN.email });
  if (existing) {
    console.log('ℹ️  Admin already exists - nothing to do.');
    console.log(`   email:    ${ADMIN.email}`);
    console.log('   password: (unchanged)');
  } else {
    await User.create(ADMIN);
    console.log('✅ Default admin created:');
    console.log(`   email:    ${ADMIN.email}`);
    console.log(`   password: ${ADMIN.password}`);
    console.log('   ⚠️  Change this password after first login.');
  }

  await mongoose.disconnect();
  console.log('Done.');
};

run().catch((error) => {
  console.error('❌ Seed failed:', error.message);
  process.exit(1);
});
