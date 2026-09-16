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

    // Calcular días igual que en el dashboard
    let totalDiasOtorgados = 0;
    let diasRed = 0;
    let diasEsSalud = 0;

    trabajador.licencias.forEach(lic => {
      totalDiasOtorgados += lic.diasOtorgados;
    });

    if (totalDiasOtorgados <= 20) {
      diasRed = totalDiasOtorgados;
      diasEsSalud = 0;
    } else {
      diasRed = 20;
      diasEsSalud = totalDiasOtorgados - 20;
    }

    // Devolver formato amigable sin datos sensibles extra
    return NextResponse.json({
      dni: trabajador.dni,
      apellidosNombres: `${trabajador.apellidos}, ${trabajador.nombres}`,
      cargo: trabajador.cargo,
      condicionLaboral: trabajador.condicionLaboral,
      establecimiento: trabajador.establecimiento.nombre,
      microred: trabajador.establecimiento.microred.nombre,
      resumen: {
        totalDiasAcumulados: totalDiasOtorgados,
        diasCubiertosPorRed: diasRed,
        diasSubsidioEsSalud: diasEsSalud,
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
    console.error('Error en consulta pública:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

