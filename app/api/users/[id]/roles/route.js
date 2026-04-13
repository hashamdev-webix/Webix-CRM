import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Role from '@/models/Role';
import { withAdmin } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

// GET — list roles assigned to a user
export const GET = withAdmin(async (req, { params }) => {
  await connectDB();
  const user = await User.findById(params.id).populate('roles').lean();
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(user.roles || []);
});

// POST — assign a role to a user
export const POST = withAdmin(async (req, { params }, session) => {
  await connectDB();
  const { roleId } = await req.json();
  if (!roleId) return NextResponse.json({ error: 'roleId is required' }, { status: 400 });

  const [user, role] = await Promise.all([
    User.findById(params.id),
    Role.findById(roleId),
  ]);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

  if (!user.roles.includes(roleId)) {
    user.roles.push(roleId);
    await user.save();
  }

  await writeAudit({
    event_type: 'user.role_assigned',
    entity_type: 'user',
    entity_id: params.id,
    actor_user_id: session.user.id,
    metadata: { roleId, roleName: role.name },
  });

  return NextResponse.json({ success: true });
});
