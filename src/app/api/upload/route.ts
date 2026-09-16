import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Aseguramos que la carpeta exista
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    let finalBuffer = buffer;
    let fileName = '';
    
    // Generar un sufijo limpio para evitar duplicados
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1000)}`;

    // Verificar si es imagen (para convertirla a WebP) o PDF
    const isImage = file.type.startsWith('image/');
    
    if (isImage) {
      // Comprimir con Sharp a formato WebP (Calidad decente 80%)
      finalBuffer = await sharp(buffer)
        .webp({ quality: 80 })
        .toBuffer();
      fileName = `evidencia-${uniqueSuffix}.webp`;
    } else {
      // Si es PDF u otro, lo guardamos con su extensión original
      const ext = file.name.split('.').pop() || 'pdf';
      fileName = `evidencia-${uniqueSuffix}.${ext}`;
    }

    const path = join(uploadDir, fileName);
    await writeFile(path, finalBuffer);

    return NextResponse.json({ success: true, url: `/uploads/${fileName}` });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
