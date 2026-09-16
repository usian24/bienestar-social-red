import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trabajadorId = searchParams.get('trabajadorId');

    if (!trabajadorId) {
      return NextResponse.json({ error: 'Falta el ID del trabajador' }, { status: 400 });
    }

    const licencias = await prisma.licencia.findMany({
      where: { trabajadorId },
      orderBy: { fechaInicio: 'desc' },
      include: {
        registradoPor: {
          select: { nombres: true, apellidos: true }
        }
      }
    });

    return NextResponse.json(licencias);
  } catch (error) {
    console.error('Error fetching licencias:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      trabajadorId,
      tipoLicencia, 
      origen,       
      numeroCertificado,
      fechaInicio,
      fechaFin,
      diasOtorgados,
      anioEjercicio,
      mesEjercicio,
      archivoRuta
    } = body;

    if (!trabajadorId || !numeroCertificado || !fechaInicio || !fechaFin || !diasOtorgados) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

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
        archivoRuta,
        registradoPorId: (session.user as any).id
      }
    });

    return NextResponse.json(nuevaLicencia, { status: 201 });
  } catch (error) {
    console.error('Error al crear licencia:', error);
    return NextResponse.json({ error: 'Error interno del servidor al guardar el CITT' }, { status: 500 });
  }
}

