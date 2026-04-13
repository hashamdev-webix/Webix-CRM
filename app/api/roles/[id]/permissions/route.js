import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Role from '@/models/Role';
import { withAdmin } from '@/lib/permissions';
import { PERMISSION_CATALOG } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

// GET — return the role's current permission keys alongside full catalog
export const GET = withAdmin(async (req, { params }) => {
  await connectDB();
  const role = await Role.findById(params.id).lean();
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  return NextResponse.json({
    rolePermissions: role.permissionKeys || [],
    catalog: PERMISSION_CATALOG,
  });
});

// PUT — replace the full set of permission keys for a role
export const PUT = withAdmin(async (req, { params }, session) => {
  await connectDB();
  const { permissionKeys } = await req.json();
  if (!Array.isArray(permissionKeys)) {
    return NextResponse.json({ error: 'permissionKeys must be an array' }, { status: 400 });
  }

  const validKeys = PERMISSION_CATALOG.map((p) => p.key);
  const sanitized = permissionKeys.filter((k) => validKeys.includes(k));

  const role = await Role.findByIdAndUpdate(
    params.id,
    { $set: { permissionKeys: sanitized } },
    { new: true }
  );
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

  await writeAudit({
    event_type: 'role.updated',
    entity_type: 'role',
    entity_id: role._id,
    actor_user_id: session.user.id,
    metadata: { permissionKeys: sanitized },
  });

  return NextResponse.json({ permissionKeys: role.permissionKeys });
});
