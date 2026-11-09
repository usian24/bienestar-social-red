import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { requireStaffAccess } from '@/core/auth/rbac';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_RASTER_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'heif', 'tiff']);

export async function POST(req: NextRequest) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['SUBIR_ARCHIVOS', 'GESTIONAR_LICENCIAS', 'SUBIR_CITT'],
    });
    if (auth.errorResponse) return auth.errorResponse;

    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No se envió ningún archivo.' }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: 'El archivo excede el tamaño máximo permitido (15 MB) o está vacío.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Guardar en almacenamiento privado fuera de /public
    const uploadDir = join(process.cwd(), 'storage_vol', 'evidencias');
    await mkdir(uploadDir, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const isPdfMagic = buffer.subarray(0, 5).toString('ascii') === '%PDF-';

    let finalBuffer: Buffer;
    let fileName: string;

    if (isPdfMagic) {
      finalBuffer = buffer;
      fileName = `evidencia-${uniqueSuffix}.pdf`;
    } else {
      // Validación estricta por firmas reales de imagen usando Sharp (rechaza HTML, JS, SVG, XML, EXE, etc.)
      let metadata;
      try {
        metadata = await sharp(buffer).metadata();
      } catch {
        return NextResponse.json(
          { success: false, error: 'Formato de archivo no permitido. Solo se aceptan imágenes válidas (JPG, PNG, WEBP) o PDF.' },
          { status: 415 }
        );
      }

      if (!metadata.format || !ALLOWED_RASTER_FORMATS.has(metadata.format)) {
        return NextResponse.json(
          { success: false, error: `Tipo de archivo no permitido (${metadata.format || 'desconocido'}). Use JPG, PNG, WEBP o PDF.` },
          { status: 415 }
        );
      }

      finalBuffer = await sharp(buffer)
        .rotate()
        .webp({ quality: 80 })
        .toBuffer();
      fileName = `evidencia-${uniqueSuffix}.webp`;
    }

    const destPath = join(uploadDir, fileName);
    await writeFile(destPath, finalBuffer);

    return NextResponse.json({ success: true, url: `/api/evidencias/${fileName}` });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ success: false, error: 'Error al subir archivo' }, { status: 500 });
  }
}
