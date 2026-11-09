import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { logger } from '@/core/logging/systemLogger';
import { canAccessWorkerMicrored, requireStaffAccess } from '@/core/auth/rbac';

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['VER_LICENCIAS', 'GESTIONAR_LICENCIAS', 'VER_TRABAJADORES'],
    });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const { searchParams } = new URL(request.url);
    const trabajadorId = searchParams.get('trabajadorId');

    if (!trabajadorId) {
      return NextResponse.json({ error: 'Falta el ID del trabajador' }, { status: 400 });
    }

    const trabajador = await prisma.trabajador.findUnique({
      where: { id: trabajadorId },
      include: { establecimiento: true },
    });

    if (!trabajador) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 });
    }

    if (!canAccessWorkerMicrored(ctx, trabajador.establecimiento?.microredId)) {
      return NextResponse.json({ error: 'Acceso denegado fuera de su microred asignada.' }, { status: 403 });
    }

    const licencias = await prisma.licencia.findMany({
      where: { trabajadorId },
      orderBy: { fechaInicio: 'desc' },
      include: {
        registradoPor: {
          select: { 
            nombres: true, 
            apellidos: true,
            rol: { select: { nombre: true } },
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
  let userIdForLog: string | undefined;
  try {
    const auth = await requireStaffAccess({
      permisos: ['GESTIONAR_LICENCIAS', 'SUBIR_CITT'],
    });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;
    userIdForLog = ctx.userId;

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

    if (!canAccessWorkerMicrored(ctx, trabajador.establecimiento?.microredId)) {
      return NextResponse.json({ 
        error: `Acceso restringido: El servidor ${trabajador.apellidos}, ${trabajador.nombres} pertenece a la microred "${trabajador.establecimiento?.microred?.nombre || 'otra sede'}". Tu usuario solo tiene permisos para registrar descansos médicos de la microred "${ctx.microredNombre || 'Sede Local'}".` 
      }, { status: 403 });
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
        familiarPaciente: familiarPaciente ? String(familiarPaciente).trim() : null,
        registradoPorId: ctx.userId
      }
    });

    await prisma.auditoria.create({
      data: {
        usuarioId: ctx.userId,
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
      usuarioId: userIdForLog,
      ruta: '/api/licencias'
    });
    return NextResponse.json({ error: 'Error interno del servidor al guardar el CITT' }, { status: 500 });
  }
}

