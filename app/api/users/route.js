export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import '@/models/Role';
import '@/models/Company';

export async function GET(req) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    await connectDB();
    const users = await User.find()
      .populate({ path: 'roles', select: 'name description', strictPopulate: false })
      .populate({ path: 'company_id', select: 'name', strictPopulate: false })
      .sort({ createdAt: -1 })
      .lean();
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
    const { name, email, password, roleValue, company_id } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const isAdmin = roleValue === 'admin';
    const user = await User.create({
      name,
      email,
      password,
      role: isAdmin ? 'admin' : 'sales_member',
      roles: isAdmin || !roleValue ? [] : [roleValue],
      company_id: company_id || null,
      isActive: true,
    });

    await user.populate([
      { path: 'roles', select: 'name description', strictPopulate: false },
      { path: 'company_id', select: 'name', strictPopulate: false },
    ]);
    return NextResponse.json(user.toSafeObject(), { status: 201 });
  } catch (err) {
    console.error('[Users POST]', err);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
