export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { hasPermission } from '@/lib/permissions';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import EmployeeDocument from '@/models/EmployeeDocument';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'hr');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// GET — list documents
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'hr.employees.documents')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  await import('@/models/User');
  const docs = await EmployeeDocument.find({ employeeId: params.id })
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(docs);
}

// POST — upload document (multipart/form-data)
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'hr.employees.documents')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const formData = await req.formData();
  const file = formData.get('file');
  const name = formData.get('name') || file?.name || 'Document';
  const docType = formData.get('docType') || 'other';

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const empDir = path.join(UPLOAD_DIR, params.id);
  ensureDir(empDir);

  const ext = path.extname(file.name);
  const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}_${safeBase}`;
  const filePath = path.join(empDir, fileName);

  const arrayBuffer = await file.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

  const relPath = path.join(params.id, fileName).replace(/\\/g, '/');

  const doc = await EmployeeDocument.create({
    employeeId: params.id,
    name,
    docType,
    fileName: file.name,
    filePath: relPath,
    mimeType: file.type,
    fileSize: file.size,
    uploadedBy: session.user.id,
  });

  return NextResponse.json(doc, { status: 201 });
}

// DELETE — remove document
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(session, 'hr.employees.documents')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get('docId');
  if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 });

  const doc = await EmployeeDocument.findById(docId);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete physical file
  const fullPath = path.join(UPLOAD_DIR, doc.filePath);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

  await EmployeeDocument.findByIdAndDelete(docId);
  return NextResponse.json({ success: true });
}
