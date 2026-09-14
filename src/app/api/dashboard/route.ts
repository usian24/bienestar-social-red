import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';

export async function GET() {
  try {
    // 1. Total de Trabajadores en la Base de Datos
    const totalTrabajadores = await prisma.trabajador.count();

    // 2. Total de Licencias Activas (Cualquier tipo de licencia)
    const licenciasActivas = await prisma.licencia.count();

    // 3. Subsidios Pendientes EsSalud (Licencias de SALUD que superan 20 días)
    const trabajadoresConSalud = await prisma.trabajador.findMany({
      where: {
        licencias: { some: { tipoLicencia: 'ENFERMEDAD_COMUN' } }
      },
      include: {
        licencias: { where: { tipoLicencia: 'ENFERMEDAD_COMUN' } }
      }
    });

    let subsidiosPendientes = 0;
    trabajadoresConSalud.forEach(t => {
      const totalDias = t.licencias.reduce((sum, lic) => sum + lic.diasOtorgados, 0);
      if (totalDias > 20) {
        subsidiosPendientes++;
      }
    });

    return NextResponse.json({
      totalTrabajadores,
      licenciasActivas,
      subsidiosPendientes
    });

  } catch (error) {
    console.error('Error fetching dashboard KPIs:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

