import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trabajadorId = searchParams.get('trabajadorId');

    if (!trabajadorId) {
      return NextResponse.json({ error: 'Falta el ID del trabajador' }, { status: 400 });
    }

    const licencias = await prisma.licencia.findMany({
      where: { trabajadorId },
      orderBy: { fechaInicio: 'desc' }
    });

    return NextResponse.json(licencias);
  } catch (error) {
    console.error('Error fetching licencias:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      trabajadorId,
      tipoLicencia, // 'ENFERMEDAD_COMUN', 'MATERNIDAD', 'PATERNIDAD'
      origen,       // 'ESSALUD', 'PARTICULAR'
      numeroCertificado,
      fechaInicio,
      fechaFin,
      diasOtorgados,
      anioEjercicio,
      mesEjercicio,
      archivoRuta
    } = body;

    // Validaciones básicas
    if (!trabajadorId || !numeroCertificado || !fechaInicio || !fechaFin || !diasOtorgados) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Crear la nueva licencia en la base de datos
    const nuevaLicencia = await prisma.licencia.create({
      data: {
        trabajadorId,
        tipoLicencia,
        origen,
        numeroCertificado,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        diasOtorgados: Number(diasOtorgados),
        anioEjercicio: Number(anioEjercicio),
        mesEjercicio: Number(mesEjercicio),
        archivoRuta
      }
    });

    return NextResponse.json(nuevaLicencia, { status: 201 });
  } catch (error) {
    console.error('Error al crear licencia:', error);
    return NextResponse.json({ error: 'Error interno del servidor al guardar el CITT' }, { status: 500 });
  }
}

