import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { canAccessWorkerMicrored, requireStaffAccess } from '@/core/auth/rbac';
import { formatCalendarDateDMY } from '@/core/licencias/calculoSubsidios';

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
          orderBy: [{ fechaInicio: 'asc' }, { creadoEn: 'asc' }]
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
      if (lic.origen !== 'PARTICULAR_PERDIDO') {
        totalDiasGlobal += lic.diasOtorgados;
      }
    });

    const resultRows: any[] = [];

    trabajador.licencias.forEach((lic) => {
      const fInicio = formatCalendarDateDMY(lic.fechaInicio);
      const fFin = formatCalendarDateDMY(lic.fechaFin);
      const esPerdido = lic.origen === 'PARTICULAR_PERDIDO';

      resultRows.push({
        origen: lic.numeroCertificado || 'S/N',
        fechaInicio: fInicio,
        fechaFin: fFin,
        diasOtorgados: esPerdido ? 0 : lic.diasOtorgados,
        esPerdido,
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
