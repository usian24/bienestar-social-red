import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { requireStaffAccess } from '@/core/auth/rbac';

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['VER_LICENCIAS', 'GESTIONAR_LICENCIAS'],
    });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const whereClause: any = {
      licencias: {
        some: {
          tipoLicencia: 'MATERNIDAD'
        }
      }
    };

    if (!ctx.isSuperAdmin && ctx.microredId) {
      whereClause.establecimiento = {
        microredId: ctx.microredId
      };
    }

    const trabajadores = await prisma.trabajador.findMany({
      where: whereClause,
      include: {
        establecimiento: {
          include: { microred: true }
        },
        licencias: {
          where: { tipoLicencia: 'MATERNIDAD' }
        }
      }
    });

    const registros = trabajadores.map(t => {
      let diasEssalud = 0;
      let diasParticulares = 0;
      let diasPerdidos = 0;

      t.licencias.forEach(lic => {
        if (lic.origen === 'ESSALUD_CITT') diasEssalud += lic.diasOtorgados;
        else if (lic.origen === 'PARTICULAR') diasParticulares += lic.diasOtorgados;
        else if (lic.origen === 'PARTICULAR_PERDIDO') diasPerdidos += lic.diasOtorgados;
      });

      const totalDias = diasEssalud + diasParticulares;
      
      // LOGICA MATERNIDAD: 100% Subsidio desde el día 1
      const diasRed = 0;
      const diasSubsidioEsSalud = totalDias;

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
        essalud: diasEssalud,
        particulares: diasParticulares,
        perdidos: diasPerdidos,
        totalDias,
        diasRed,
        diasSubsidioEsSalud,
        licencias: t.licencias
      };
    });

    return NextResponse.json(registros);
  } catch (error) {
    console.error('Error fetching paternidad data:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

