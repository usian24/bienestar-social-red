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
          where: { tipoLicencia: 'MATERNIDAD' },
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

    let totalSubsidioGlobal = 0;

    // Primer paso: pre-calcular total de subsidio global (excluyendo PARTICULAR_PERDIDO)
    trabajador.licencias.forEach((lic) => {
      if (lic.origen !== 'PARTICULAR_PERDIDO') {
        totalSubsidioGlobal += lic.diasOtorgados;
      }
    });

    const resultRows: any[] = [];

    // Segundo paso: generar filas sin corrimientos de zona horaria
    trabajador.licencias.forEach((lic) => {
      const fInicio = formatCalendarDateDMY(lic.fechaInicio);
      const fFin = formatCalendarDateDMY(lic.fechaFin);
      const esPerdido = lic.origen === 'PARTICULAR_PERDIDO';

      resultRows.push({
        origen: lic.numeroCertificado || 'S/N',
        fechaInicio: fInicio,
        fechaFin: fFin,
        subsidioStart: esPerdido ? '' : fInicio,
        subsidioEnd: esPerdido ? '' : fFin,
        diasOtorgados: lic.diasOtorgados,
        esPerdido,
      });
    });

    return NextResponse.json({
      trabajador,
      licenciasInfo: resultRows,
      totalSubsidioGlobal
    });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
