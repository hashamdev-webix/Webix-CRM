import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Role from '@/models/Role';
import User from '@/models/User';
import { withAdmin } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

export const GET = withAdmin(async (req, { params }, session) => {
  await connectDB();
  const role = await Role.findById(params.id).lean();
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

  // Also get users assigned this role
  const users = await User.find({ roles: params.id })
    .select('name email role isActive')
    .lean();

  return NextResponse.json({ ...role, users });
});

export const PATCH = withAdmin(async (req, { params }, session) => {
  await connectDB();
  const body = await req.json();
  const { name, description } = body;

  const role = await Role.findById(params.id);
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  if (role.isSystem) {
    return NextResponse.json({ error: 'System roles cannot be modified' }, { status: 403 });
  }

  if (name) role.name = name.trim();
  if (description !== undefined) role.description = description.trim();
  await role.save();

  await writeAudit({
    event_type: 'role.updated',
    entity_type: 'role',
    entity_id: role._id,
    actor_user_id: session.user.id,
    metadata: { name: role.name },
  });

  return NextResponse.json(role);
});

export const DELETE = withAdmin(async (req, { params }, session) => {
  await connectDB();
  const role = await Role.findById(params.id);
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  if (role.isSystem) {
    return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 403 });
  }

  // Remove role from all users
  await User.updateMany({ roles: params.id }, { $pull: { roles: params.id } });
  await Role.findByIdAndDelete(params.id);

  await writeAudit({
    event_type: 'role.deleted',
    entity_type: 'role',
    entity_id: params.id,
    actor_user_id: session.user.id,
    metadata: { name: role.name },
  });

  return NextResponse.json({ success: true });
});
