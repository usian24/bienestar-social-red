import { NextResponse } from 'next/server';
import { ensamblarExpedienteSubsidio } from '@/features/reportes/services/ensambladorPdf';
import { canAccessWorkerMicrored, requireStaffAccess } from '@/core/auth/rbac';
import prisma from '@/core/db/prisma';

export async function POST(request: Request) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['VER_REPORTES', 'EXPORTAR_PDF_TRAMITE'],
    });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const body = await request.json();
    const { trabajadorId, datosTrabajador, rutasEvidencias } = body;

    if (!ctx.isSuperAdmin && trabajadorId) {
      const trabajador = await prisma.trabajador.findUnique({
        where: { id: String(trabajadorId) },
        include: { establecimiento: true },
      });
      if (!trabajador || !canAccessWorkerMicrored(ctx, trabajador.establecimiento?.microredId)) {
        return NextResponse.json({ error: 'Acceso denegado fuera de su microred.' }, { status: 403 });
      }
    }

    const pdfBytes = await ensamblarExpedienteSubsidio(datosTrabajador || {}, Array.isArray(rutasEvidencias) ? rutasEvidencias : []);
    
    return new NextResponse(pdfBytes as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="informe_subsidio.pdf"'
      }
    });
  } catch (error) {
    console.error('Error generando informe:', error);
    return NextResponse.json({ error: 'Error generando informe' }, { status: 500 });
  }
}
