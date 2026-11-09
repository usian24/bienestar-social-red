import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { requireStaffAccess } from '@/core/auth/rbac';
import { calcularResumenSaludTrabajador } from '@/core/licencias/calculoSubsidios';

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['VER_LICENCIAS', 'GESTIONAR_LICENCIAS'],
    });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    // Filtro base: Trabajadores con licencias de SALUD (Enfermedad o Accidente) o LEY_30012
    const whereClause: any = {
      licencias: {
        some: {
          tipoLicencia: { in: ['ENFERMEDAD_COMUN', 'ACCIDENTE_COMUN', 'LEY_30012'] }
        }
      }
    };

    // Si NO es SUPER_ADMIN, restringir obligatoriamente a su Microred asignada
    if (!ctx.isSuperAdmin && ctx.microredId) {
      whereClause.establecimiento = {
        microredId: ctx.microredId
      };
    }

    // Obtenemos los trabajadores
    const trabajadores = await prisma.trabajador.findMany({
      where: whereClause,
      include: {
        establecimiento: {
          include: { microred: true }
        },
        licencias: {
          where: { tipoLicencia: { in: ['ENFERMEDAD_COMUN', 'ACCIDENTE_COMUN', 'LEY_30012'] } },
          orderBy: { fechaInicio: 'desc' }
        }
      }
    });

    // Procesamos la matemática por año calendario (Regla de los 20 días y separación de Ley 30012)
    const registros = trabajadores.map(t => {
      const resumen = calcularResumenSaludTrabajador(t.licencias);

      const apellidosNombres = t.apellidos 
        ? `${t.apellidos}, ${t.nombres}` 
        : t.nombres;

      return {
        id: t.id,
        dni: t.dni,
        apellidosNombres: apellidosNombres.trim(),
        cargo: t.cargo,
        condicionLaboral: t.condicionLaboral || '',
        establecimiento: t.establecimiento?.nombre || 'NO ASIGNADO',
        microred: t.establecimiento?.microred?.nombre || 'NO ASIGNADA',
        essalud: resumen.essalud,
        particulares: resumen.particulares,
        perdidos: resumen.perdidos,
        diasLey30012: resumen.diasLey30012,
        totalDias: resumen.totalDias,
        diasRed: resumen.diasRed,
        diasSubsidioEsSalud: resumen.diasSubsidioEsSalud,
        licencias: t.licencias
      };
    });

    return NextResponse.json(registros);
  } catch (error) {
    console.error('Error fetching salud data:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

