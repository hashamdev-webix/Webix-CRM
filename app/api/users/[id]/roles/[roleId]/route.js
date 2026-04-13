import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Role from '@/models/Role';
import { withAdmin } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

// DELETE — revoke a role from a user
export const DELETE = withAdmin(async (req, { params }, session) => {
  await connectDB();
  const user = await User.findById(params.id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  user.roles = user.roles.filter((r) => r.toString() !== params.roleId);
  await user.save();

  const role = await Role.findById(params.roleId).lean();

  await writeAudit({
    event_type: 'user.role_revoked',
    entity_type: 'user',
    entity_id: params.id,
    actor_user_id: session.user.id,
    metadata: { roleId: params.roleId, roleName: role?.name },
  });

  return NextResponse.json({ success: true });
});
