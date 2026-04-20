import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ToolAssignment from '@/models/ToolAssignment';
import Tool from '@/models/Tool';
import { withPermission } from '@/lib/permissions';
import { writeAudit } from '@/lib/audit';

export const PATCH = withPermission('hr.view', async (req, { params }, session) => {
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  await connectDB();
  const a = await ToolAssignment.findById(params.assignId);
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  a.status = 'revoked';
  a.access_revoked_date = new Date();
  a.revoked_by = session.user.id;
  await a.save();

  const tool = await Tool.findById(params.id).select('name').lean();
  await writeAudit({ event_type: 'tool.access_revoked', entity_type: 'tool', entity_id: params.id, actor_user_id: session.user.id, metadata: { tool_name: tool?.name, employee_id: a.employee_id } });
  return NextResponse.json(a);
});
