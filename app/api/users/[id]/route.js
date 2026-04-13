export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import '@/models/Role'; // register Role model for populate

export async function PATCH(req, { params }) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    const user = await User.findById(params.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (body.isActive !== undefined) user.isActive = body.isActive;
    if (body.role !== undefined) user.role = body.role;
    if (body.name !== undefined) user.name = body.name;
    if (body.password) user.password = body.password; // will be hashed by pre-save hook

    await user.save();
    return NextResponse.json(user.toSafeObject());
  } catch (err) {
    console.error('[User PATCH]', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { error, session } = await requireAdmin(req);
  if (error) return error;

  if (session.user.id === params.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  try {
    await connectDB();
    await User.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[User DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
