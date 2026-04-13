import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Role from '@/models/Role';
import { withAdmin } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

export const GET = withAdmin(async (req, _ctx, session) => {
  await connectDB();
  const roles = await Role.find().sort({ name: 1 }).lean();
  return NextResponse.json(roles);
});

export const POST = withAdmin(async (req, _ctx, session) => {
  await connectDB();
  const body = await req.json();
  const { name, description } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
  }
  const existing = await Role.findOne({ name: name.trim() });
  if (existing) {
    return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 });
  }
  const role = await Role.create({ name: name.trim(), description: description?.trim() || '' });
  await writeAudit({
    event_type: 'role.created',
    entity_type: 'role',
    entity_id: role._id,
    actor_user_id: session.user.id,
    metadata: { name: role.name },
  });
  return NextResponse.json(role, { status: 201 });
});
