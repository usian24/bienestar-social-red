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

    // Procesamos la matemática pesada (Regla de los 20 días)
    const registros = trabajadores.map(t => {
      let diasEssalud = 0;
      let diasParticulares = 0;
      let diasPerdidos = 0;

      // Sumamos los días según el origen del certificado
      t.licencias.forEach(lic => {
        if (lic.origen === 'ESSALUD_CITT') diasEssalud += lic.diasOtorgados;
        else if (lic.origen === 'PARTICULAR') diasParticulares += lic.diasOtorgados;
        else if (lic.origen === 'PARTICULAR_PERDIDO') diasPerdidos += lic.diasOtorgados;
      });

      const totalDias = diasEssalud + diasParticulares; // Los perdidos no suman para la Red ni para el Subsidio
      
      // LA REGLA DE ORO DE BIENESTAR SOCIAL
      const diasRed = Math.min(totalDias, 20);
      const diasSubsidioEsSalud = Math.max(0, totalDias - 20);

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
    console.error('Error fetching salud data:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

