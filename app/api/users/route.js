export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    await connectDB();
    const users = await User.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(users);
  } catch (err) {
    console.error('[Users GET]', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    const existing = await User.findOne({ email: body.email });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const user = await User.create({
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role || 'sales_member',
      isActive: true,
    });

    return NextResponse.json(user.toSafeObject(), { status: 201 });
  } catch (err) {
    console.error('[Users POST]', err);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
