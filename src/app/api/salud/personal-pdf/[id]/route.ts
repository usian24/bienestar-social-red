import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { canAccessWorkerMicrored, requireStaffAccess } from '@/core/auth/rbac';
import { calcularHistorialDetalladoSalud } from '@/core/licencias/calculoSubsidios';

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
          where: { tipoLicencia: { in: ['ENFERMEDAD_COMUN', 'ACCIDENTE_COMUN'] } },
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

    const { rows, totalSubsidioGlobal } = calcularHistorialDetalladoSalud(trabajador.licencias);

    const resultRows = rows.map((row) => ({
      origen: row.origenLabel,
      numeroCertificado: row.numeroCertificado,
      colegiatura: row.colegiatura,
      medico: row.medico,
      diagnostico: row.diagnostico,
      fechaInicio: row.fechaInicio,
      fechaFin: row.fechaFin,
      fin20Dias: row.fin20Dias,
      subsidioStart: row.subsidioStart,
      subsidioEnd: row.subsidioEnd,
      diasOtorgados: row.diasOtorgados,
      isRed: row.isRed,
    }));

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
