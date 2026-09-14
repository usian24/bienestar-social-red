import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get file extension
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1000)}.${ext}`;

    // Ensure the path is 'public/uploads'
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    
    const path = join(uploadDir, fileName);

    await writeFile(path, buffer);

    return NextResponse.json({ success: true, url: `/uploads/${fileName}` });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
