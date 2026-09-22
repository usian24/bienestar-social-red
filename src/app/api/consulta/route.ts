import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dni = searchParams.get('dni');

    if (!dni || dni.length < 8) {
      return NextResponse.json({ error: 'DNI inválido' }, { status: 400 });
    }

    const trabajador = await prisma.trabajador.findUnique({
      where: { dni },
      include: {
        establecimiento: {
          include: { microred: true }
        },
        licencias: {
          orderBy: { fechaInicio: 'desc' }
        }
      }
    });

    if (!trabajador) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 });
    }

    // Cálculos por módulo
    let saludTotal = 0;
    let maternidadTotal = 0;
    let paternidadTotal = 0;

    trabajador.licencias.forEach(lic => {
      if (lic.tipoLicencia === 'ENFERMEDAD_COMUN') saludTotal += lic.diasOtorgados;
      else if (lic.tipoLicencia === 'MATERNIDAD') maternidadTotal += lic.diasOtorgados;
      else if (lic.tipoLicencia === 'PATERNIDAD') paternidadTotal += lic.diasOtorgados;
    });

    // Salud: 20 días Red, resto EsSalud
    const saludRed = Math.min(saludTotal, 20);
    const saludEsSalud = Math.max(0, saludTotal - 20);

    // Maternidad: 100% EsSalud
    const maternidadEsSalud = maternidadTotal;

    // Paternidad: 100% Red
    const paternidadRed = paternidadTotal;

    return NextResponse.json({
      dni: trabajador.dni,
      apellidosNombres: `${trabajador.apellidos}, ${trabajador.nombres}`,
      cargo: trabajador.cargo,
      condicionLaboral: trabajador.condicionLaboral,
      establecimiento: trabajador.establecimiento?.nombre || 'No asignado',
      microred: trabajador.establecimiento?.microred?.nombre || 'No asignada',
      resumen: {
        salud: { total: saludTotal, red: saludRed, essalud: saludEsSalud },
        maternidad: { total: maternidadTotal, essalud: maternidadEsSalud },
        paternidad: { total: paternidadTotal, red: paternidadRed }
      },
      licencias: trabajador.licencias.map(l => ({
        id: l.id,
        tipoLicencia: l.tipoLicencia,
        origen: l.origen,
        numeroCertificado: l.numeroCertificado,
        fechaInicio: l.fechaInicio,
        fechaFin: l.fechaFin,
        diasOtorgados: l.diasOtorgados
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
