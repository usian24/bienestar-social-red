import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';

export async function GET(request: Request) {
  try {
    // Obtenemos todos los trabajadores que tienen al menos una licencia de ENFERMEDAD_COMUN
    const trabajadores = await prisma.trabajador.findMany({
      where: {
        licencias: {
          some: {
            tipoLicencia: 'ENFERMEDAD_COMUN'
          }
        }
      },
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
        if (lic.origen === 'ESSALUD') diasEssalud += lic.diasOtorgados;
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
        establecimiento: t.establecimiento?.nombre || 'NO ASIGNADO',
        microred: t.establecimiento?.microred?.nombre || 'NO ASIGNADA',
        essalud: diasEssalud,
        particulares: diasParticulares,
        ley30012: diasLey30012,
        totalDias,
        diasRed,
        diasSubsidioEsSalud
      };
    });

    return NextResponse.json(registros);
  } catch (error) {
    console.error('Error fetching salud data:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

