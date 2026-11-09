import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { canAccessWorkerMicrored, requireStaffAccess } from '@/core/auth/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['VER_LICENCIAS', 'GESTIONAR_LICENCIAS', 'VER_REPORTES', 'EXPORTAR_PDF_TRAMITE'],
    });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const trabajador = await prisma.trabajador.findUnique({
      where: { id },
      include: {
        establecimiento: { include: { microred: true } },
        licencias: {
          where: { tipoLicencia: 'PATERNIDAD' },
          orderBy: { fechaInicio: 'asc' }
        }
      }
    });

    if (!trabajador) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 });
    }

    if (!canAccessWorkerMicrored(ctx, trabajador.establecimiento?.microredId)) {
      return NextResponse.json({ error: 'No tiene permisos para acceder a trabajadores de otra microred' }, { status: 403 });
    }

    let totalDiasGlobal = 0;

    trabajador.licencias.forEach((lic) => {
      totalDiasGlobal += lic.diasOtorgados;
    });

    const resultRows: any[] = [];

    trabajador.licencias.forEach((lic) => {
      const dateInicio = new Date(lic.fechaInicio);
      const dateFin = new Date(lic.fechaFin);

      const fInicio = dateInicio.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
      const fFin = dateFin.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
      
      resultRows.push({
        origen: lic.numeroCertificado,
        fechaInicio: fInicio,
        fechaFin: fFin,
        diasOtorgados: lic.diasOtorgados,
      });
    });

    return NextResponse.json({
      trabajador,
      licenciasInfo: resultRows,
      totalDiasGlobal
    });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
