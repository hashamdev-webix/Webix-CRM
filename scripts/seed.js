#!/usr/bin/env node
/**
 * Seed script — creates an initial admin user
 * Usage: node scripts/seed.js
 *
 * Set MONGODB_URI in .env.local before running.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/webix-crm';

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  isActive: Boolean,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB:', MONGODB_URI);

  const existing = await User.findOne({ email: 'admin@webixsolutions.com' });
  if (existing) {
    console.log('Admin user already exists:', existing.email);
    process.exit(0);
  }

  const hashed = await bcrypt.hash('Admin@123', 12);
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@webixsolutions.com',
    password: hashed,
    role: 'admin',
    isActive: true,
  });

  console.log('Admin user created:');
  console.log('  Email:', admin.email);
  console.log('  Password: Admin@123');
  console.log('\nChange the password after first login!');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
