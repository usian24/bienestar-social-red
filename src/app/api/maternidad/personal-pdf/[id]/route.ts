import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const trabajador = await prisma.trabajador.findUnique({
      where: { id },
      include: {
        establecimiento: { include: { microred: true } },
        licencias: {
          where: { tipoLicencia: 'MATERNIDAD' },
          orderBy: { fechaInicio: 'asc' }
        }
      }
    });

    if (!trabajador) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 });
    }

    let totalSubsidioGlobal = 0;

    // Primer paso: pre-calcular total de subsidio global
    trabajador.licencias.forEach((lic) => {
      totalSubsidioGlobal += lic.diasOtorgados;
    });

    const resultRows: any[] = [];

    // Segundo paso: generar filas
    trabajador.licencias.forEach((lic) => {
      const dateInicio = new Date(lic.fechaInicio);
      const dateFin = new Date(lic.fechaFin);

      // Convertir a string de fecha respetando la zona horaria de Perú
      const fInicio = dateInicio.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
      const fFin = dateFin.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
      
      resultRows.push({
        origen: lic.numeroCertificado,
        fechaInicio: fInicio,
        fechaFin: fFin,
        subsidioStart: fInicio,
        subsidioEnd: fFin,
        diasOtorgados: lic.diasOtorgados,
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
