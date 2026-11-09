import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import prisma from '@/core/db/prisma';
import { canAccessWorkerMicrored, getAuthContext, hasAnyPermission } from '@/core/auth/rbac';

const FILENAME_REGEX = /^evidencia-[a-zA-Z0-9_-]+\.(webp|pdf|jpg|jpeg|png)$/i;

const MIME_MAP: Record<string, string> = {
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function resolveInside(baseDir: string, filename: string): string | null {
  const resolvedBase = path.resolve(baseDir);
  const resolvedFile = path.resolve(resolvedBase, filename);
  if (!resolvedFile.startsWith(resolvedBase + path.sep)) {
    return null;
  }
  return resolvedFile;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
    }

    const { filename } = await params;
    if (!filename || !FILENAME_REGEX.test(filename)) {
      return NextResponse.json({ error: 'Nombre de archivo inválido.' }, { status: 400 });
    }

    if (!ctx.isSuperAdmin) {
      const licencia = await prisma.licencia.findFirst({
        where: {
          archivoRuta: {
            endsWith: `/${filename}`,
          },
        },
        include: {
          trabajador: {
            include: { establecimiento: true },
          },
        },
      });

      if (ctx.isTrabajador) {
        if (!licencia || licencia.trabajador?.dni !== ctx.dni) {
          return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
        }
      } else {
        const tieneAccesoStaff = hasAnyPermission(ctx, [
          'VER_LICENCIAS',
          'GESTIONAR_LICENCIAS',
          'SUBIR_ARCHIVOS',
          'SUBIR_CITT',
          'EXPORTAR_PDF_TRAMITE',
        ]);
        if (!tieneAccesoStaff || !ctx.microredId) {
          return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
        }
        if (licencia) {
          if (!canAccessWorkerMicrored(ctx, licencia.trabajador?.establecimiento?.microredId)) {
            return NextResponse.json({ error: 'Evidencia fuera de su microred asignada.' }, { status: 403 });
          }
        } else if (!hasAnyPermission(ctx, ['SUBIR_ARCHIVOS', 'GESTIONAR_LICENCIAS', 'SUBIR_CITT'])) {
          return NextResponse.json({ error: 'Evidencia no vinculada.' }, { status: 403 });
        }
      }
    }

    const privatePath = resolveInside(path.join(process.cwd(), 'storage_vol', 'evidencias'), filename);
    const legacyPath = resolveInside(path.join(process.cwd(), 'public', 'uploads'), filename);

    let fileBuffer: Buffer | null = null;
    for (const candidate of [privatePath, legacyPath]) {
      if (!candidate) continue;
      try {
        fileBuffer = await readFile(candidate);
        break;
      } catch {
        // Probar siguiente ubicación permitida
      }
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: 'Archivo no encontrado.' }, { status: 404 });
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error sirviendo evidencia protegida:', error);
    return NextResponse.json({ error: 'Error interno al obtener archivo' }, { status: 500 });
  }
}

