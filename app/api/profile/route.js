export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// PATCH /api/profile — update own name and/or password
export async function PATCH(req) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (body.name?.trim()) user.name = body.name.trim();
    if (body.newPassword) {
      if (body.newPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      }
      user.password = body.newPassword; // hashed by pre-save hook
    }

    await user.save();
    return NextResponse.json(user.toSafeObject());
  } catch (err) {
    console.error('[Profile PATCH]', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
