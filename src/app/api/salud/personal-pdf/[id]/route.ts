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

    let diasRedRestantes = 20;
    let totalSubsidioGlobal = 0;
    let currentYearForPrecalc = 0;

    // Primer paso: pre-calcular total de subsidio global por año
    trabajador.licencias.forEach((lic) => {
      const licYear = new Date(lic.fechaInicio).getFullYear();
      if (licYear !== currentYearForPrecalc) {
        currentYearForPrecalc = licYear;
        diasRedRestantes = 20;
      }
      
      const redDays = Math.min(lic.diasOtorgados, diasRedRestantes);
      const subDays = lic.diasOtorgados - redDays;
      diasRedRestantes -= redDays;
      totalSubsidioGlobal += subDays;
    });

    diasRedRestantes = 20; // reset
    let currentYearForRender = 0;
    const resultRows: any[] = [];
    let historicFin20Str = '';

    // Segundo paso: generar filas
    trabajador.licencias.forEach((lic) => {
      const licYear = new Date(lic.fechaInicio).getFullYear();
      if (licYear !== currentYearForRender) {
        currentYearForRender = licYear;
        diasRedRestantes = 20;
        historicFin20Str = '';
      }

      const dateInicio = new Date(lic.fechaInicio);
      const dateFin = new Date(lic.fechaFin);

      // Convertir a string de fecha respetando la zona horaria de Perú
      const fInicio = dateInicio.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
      const fFin = dateFin.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
      
      let redDaysUsed = 0;
      let subsidioDays = 0;
      let fin20Str = '';
      let subsidioInicioStr = '';
      let subsidioFinStr = '';

      redDaysUsed = Math.min(lic.diasOtorgados, diasRedRestantes);
      subsidioDays = lic.diasOtorgados - redDaysUsed;
      diasRedRestantes -= redDaysUsed;

      if (redDaysUsed > 0 && diasRedRestantes === 0 && !historicFin20Str) {
         const fin20Obj = new Date(dateInicio.getTime());
         fin20Obj.setDate(fin20Obj.getDate() + redDaysUsed - 1);
         historicFin20Str = fin20Obj.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
      }

      if (subsidioDays > 0) {
         const subStartObj = new Date(dateInicio.getTime());
         subStartObj.setDate(subStartObj.getDate() + redDaysUsed);
         subsidioInicioStr = subStartObj.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
         subsidioFinStr = dateFin.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
         
         fin20Str = historicFin20Str;
      }

      const etiquetaCertificado = (lic as any).colegiatura
        ? `${lic.numeroCertificado} (CMP: ${(lic as any).colegiatura})`
        : lic.numeroCertificado;

      resultRows.push({
        origen: etiquetaCertificado,
        numeroCertificado: lic.numeroCertificado,
        colegiatura: (lic as any).colegiatura || null,
        medico: (lic as any).medico || null,
        diagnostico: (lic as any).diagnostico || null,
        fechaInicio: fInicio,
        fechaFin: fFin,
        fin20Dias: fin20Str,
        subsidioStart: subsidioInicioStr,
        subsidioEnd: subsidioFinStr,
        diasOtorgados: lic.diasOtorgados,
        isRed: redDaysUsed > 0 // Para pintar de azito
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
