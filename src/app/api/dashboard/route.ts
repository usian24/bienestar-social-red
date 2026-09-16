import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.rol === 'SUPER_ADMIN';
    const userMicroredId = (session.user as any)?.microredId;

    // Filtros bases vacíos = todos
    const trabajadorWhere: any = {};
    const licenciaWhere: any = {};

    // Si no es superadmin, restringir a su microred
    if (!isSuperAdmin && userMicroredId) {
      trabajadorWhere.establecimiento = { microredId: Number(userMicroredId) };
      licenciaWhere.trabajador = { establecimiento: { microredId: Number(userMicroredId) } };
    }

    // 1. Total de Trabajadores en su jurisdicción
    const totalTrabajadores = await prisma.trabajador.count({ where: trabajadorWhere });

    // 2. Total de Licencias Activas (Cualquier tipo de licencia)
    const licenciasActivas = await prisma.licencia.count({ where: licenciaWhere });

    // 3. Subsidios Pendientes EsSalud (Licencias de SALUD que superan 20 días)
    const trabajadoresConSalud = await prisma.trabajador.findMany({
      where: {
        ...trabajadorWhere,
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

