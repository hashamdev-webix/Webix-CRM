export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'hr');

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const fileParts = params.filepath || [];
  const relPath = fileParts.join('/');

  // Security: prevent path traversal
  const fullPath = path.resolve(UPLOAD_DIR, relPath);
  if (!fullPath.startsWith(path.resolve(UPLOAD_DIR))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ext = path.extname(fullPath).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  const contentType = mimeMap[ext] || 'application/octet-stream';

  const { searchParams } = new URL(req.url);
  const download = searchParams.get('download') === '1';

  const fileBuffer = fs.readFileSync(fullPath);
  const headers = { 'Content-Type': contentType };
  if (download) {
    headers['Content-Disposition'] = `attachment; filename="${path.basename(fullPath)}"`;
  } else {
    headers['Content-Disposition'] = `inline; filename="${path.basename(fullPath)}"`;
  }

  return new Response(fileBuffer, { headers });
}
