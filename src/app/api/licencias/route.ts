import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { logger } from '@/core/logging/systemLogger';

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
          select: { 
            nombres: true, 
            apellidos: true,
            rol: true,
            microred: { select: { nombre: true } }
          }
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
  let session: any = null;
  try {
    session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
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

    await prisma.auditoria.create({
      data: {
        usuarioId: (session.user as any).id,
        accion: 'CREAR',
        modulo: 'LICENCIA',
        entidadId: nuevaLicencia.id,
        detalles: JSON.stringify({
          tipoLicencia,
          origen,
          numeroCertificado,
          diasOtorgados
        })
      }
    });

    return NextResponse.json(nuevaLicencia, { status: 201 });
  } catch (error) {
    console.error('Error al crear licencia:', error);
    await logger.error('LICENCIAS', 'CREAR_LICENCIA_ERROR', 'Error al crear licencia o CITT en la base de datos', {
      error,
      usuarioId: (session?.user as any)?.id,
      ruta: '/api/licencias'
    });
    return NextResponse.json({ error: 'Error interno del servidor al guardar el CITT' }, { status: 500 });
  }
}

