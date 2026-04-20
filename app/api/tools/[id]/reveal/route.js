import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Tool from '@/models/Tool';
import ToolCredentialAccessLog from '@/models/ToolCredentialAccessLog';
import { withPermission } from '@/lib/permissions';
import { decrypt } from '@/lib/encrypt';

export const POST = withPermission('hr.view', async (req, { params }, session) => {
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Admin/HR only' }, { status: 403 });
  await connectDB();
  const tool = await Tool.findOne({ _id: params.id, deleted_at: null });
  if (!tool) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  await ToolCredentialAccessLog.create({ tool_id: tool._id, viewed_by: session.user.id, action: 'revealed_password', ip_address: ip });

  let password;
  try { password = decrypt(tool.password_encrypted); }
  catch { return NextResponse.json({ error: 'Failed to decrypt' }, { status: 500 }); }

  return NextResponse.json({ password });
});
