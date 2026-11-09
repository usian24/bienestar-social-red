import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { requireStaffAccess } from '@/core/auth/rbac';

export async function GET() {
  try {
    const auth = await requireStaffAccess();
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    // Filtros bases vacíos = todos (solo para SUPER_ADMIN)
    const trabajadorWhere: any = {};
    const licenciaWhere: any = {};

    // Si no es superadmin, restringir obligatoriamente a su microred
    if (!ctx.isSuperAdmin && ctx.microredId) {
      trabajadorWhere.establecimiento = { microredId: ctx.microredId };
      licenciaWhere.trabajador = { establecimiento: { microredId: ctx.microredId } };
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

