import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const isSuperAdmin = (session.user as any)?.rol === 'SUPER_ADMIN';
    const userMicroredId = (session.user as any)?.microredId;

    // Filtro base: Solo trabajadores con licencias ENFERMEDAD_COMUN
    const whereClause: any = {
      licencias: {
        some: {
          tipoLicencia: 'ENFERMEDAD_COMUN'
        }
      }
    };

    // Si NO es SUPER_ADMIN, restringir obligatoriamente a su Microred asignada
    if (!isSuperAdmin && userMicroredId) {
      whereClause.establecimiento = {
        microredId: Number(userMicroredId)
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
          where: { tipoLicencia: 'ENFERMEDAD_COMUN' }
        }
      }
    });

    // Procesamos la matemática pesada (Regla de los 20 días)
    const registros = trabajadores.map(t => {
      let diasEssalud = 0;
      let diasParticulares = 0;
      let diasLey30012 = 0;

      // Sumamos los días según el origen del certificado
      t.licencias.forEach(lic => {
        if (lic.origen === 'ESSALUD_CITT') diasEssalud += lic.diasOtorgados;
        else if (lic.origen === 'PARTICULAR') diasParticulares += lic.diasOtorgados;
        else diasLey30012 += lic.diasOtorgados;
      });

      const totalDias = diasEssalud + diasParticulares + diasLey30012;
      
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
        ley30012: diasLey30012,
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

