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
      archivoRuta,
      medico,
      colegiatura,
      diagnostico,
      familiarPaciente
    } = body;

    if (!trabajadorId || !numeroCertificado || !fechaInicio || !fechaFin || !diasOtorgados) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Validación RBAC por Microred: Solo SUPER_ADMIN puede registrar en cualquier microred
    const isSuperAdmin = (session.user as any)?.rol === 'SUPER_ADMIN';
    const userMicroredId = (session.user as any)?.microredId ? Number((session.user as any).microredId) : null;
    const userMicroredNombre = (session.user as any)?.microredNombre || 'Sede Local';

    if (!isSuperAdmin && userMicroredId) {
      const trabajador = await prisma.trabajador.findUnique({
        where: { id: trabajadorId },
        include: {
          establecimiento: {
            include: { microred: true }
          }
        }
      });

      if (!trabajador) {
        return NextResponse.json({ error: 'Trabajador no encontrado en el sistema' }, { status: 404 });
      }

      if (trabajador.establecimiento?.microredId && trabajador.establecimiento.microredId !== userMicroredId) {
        return NextResponse.json({ 
          error: `Acceso restringido: El servidor ${trabajador.apellidos}, ${trabajador.nombres} pertenece a la microred "${trabajador.establecimiento.microred?.nombre || 'otra sede'}". Tu usuario solo tiene permisos para registrar descansos médicos de la microred "${userMicroredNombre}".` 
        }, { status: 403 });
      }
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
        medico: medico ? String(medico).trim() : null,
        colegiatura: colegiatura ? String(colegiatura).trim() : null,
        diagnostico: diagnostico ? String(diagnostico).trim() : null,
        registradoPorId: (session.user as any).id
      } as any
    });

    if (familiarPaciente) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "Licencia" SET "familiarPaciente" = $1 WHERE "id" = $2`,
          String(familiarPaciente).trim(),
          nuevaLicencia.id
        );
      } catch (errFam) {
        console.warn('Aviso guardando familiarPaciente en columna dedicada:', errFam);
      }
    }

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

