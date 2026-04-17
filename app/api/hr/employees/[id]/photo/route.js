export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Employee from '@/models/Employee';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'hr');

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'hr.employees.edit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('photo');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }

  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG/PNG/WebP allowed' }, { status: 400 });
  }

  const empDir = path.join(UPLOAD_DIR, params.id);
  if (!fs.existsSync(empDir)) fs.mkdirSync(empDir, { recursive: true });

  const ext = path.extname(file.name) || '.jpg';
  const fileName = `photo_${Date.now()}${ext}`;
  const filePath = path.join(empDir, fileName);

  const buf = await file.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(buf));

  const relPath = `${params.id}/${fileName}`;

  await connectDB();
  const employee = await Employee.findByIdAndUpdate(
    params.id,
    { $set: { profilePhoto: { fileName, filePath: relPath, mimeType: file.type } } },
    { new: true }
  );

  if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ filePath: relPath });
}
