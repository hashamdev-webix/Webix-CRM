 /**
 * Seed script — creates the initial admin user
 * Usage: node scripts/seed.mjs
 *
 * Requires MONGODB_URI in .env.local
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Manually load .env.local
try {
  const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  env.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx < 0) return;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
} catch {}

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not set in .env.local');
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    role: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const existing = await User.findOne({ email: 'admin@webixsolutions.com' });
  if (existing) {
    console.log('✓ Admin user already exists:', existing.email);
    await mongoose.disconnect();
    process.exit(0);
  }

  const hashed = await bcrypt.hash('Admin@123', 12);
  await User.create({
    name: 'Admin',
    email: 'admin@webixsolutions.com',
    password: hashed,
    role: 'admin',
    isActive: true,
  });

  console.log('');
  console.log('✓ Admin user created!');
  console.log('  Email   : admin@webixsolutions.com');
  console.log('  Password: Admin@123');
  console.log('');
  console.log('⚠  Change the password after first login via Settings.');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
