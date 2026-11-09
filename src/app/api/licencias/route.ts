import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { logger } from '@/core/logging/systemLogger';
import { canAccessWorkerMicrored, requireStaffAccess } from '@/core/auth/rbac';
import { parseNormalizedCalendarDate } from '@/core/licencias/calculoSubsidios';

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

    const fechaInicioNorm = parseNormalizedCalendarDate(fechaInicio);
    const fechaFinNorm = parseNormalizedCalendarDate(fechaFin);
    if (!fechaInicioNorm || !fechaFinNorm) {
      return NextResponse.json({ error: 'Las fechas ingresadas no son válidas' }, { status: 400 });
    }
    if (fechaFinNorm < fechaInicioNorm) {
      return NextResponse.json({ error: 'La fecha de fin no puede ser anterior a la fecha de inicio' }, { status: 400 });
    }

    const diasNum = Number(diasOtorgados);
    if (!Number.isFinite(diasNum) || diasNum <= 0) {
      return NextResponse.json({ error: 'Los días otorgados deben ser mayores a cero' }, { status: 400 });
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

    const anioEjercicioFinal =
      anioEjercicio !== undefined && anioEjercicio !== null && Number.isFinite(Number(anioEjercicio))
        ? Number(anioEjercicio)
        : fechaInicioNorm.getUTCFullYear();
    const mesEjercicioFinal =
      mesEjercicio !== undefined && mesEjercicio !== null && Number.isFinite(Number(mesEjercicio))
        ? Number(mesEjercicio)
        : fechaInicioNorm.getUTCMonth() + 1;

    const nuevaLicencia = await prisma.licencia.create({
      data: {
        trabajadorId,
        tipoLicencia,
        origen,
        numeroCertificado,
        fechaInicio: fechaInicioNorm,
        fechaFin: fechaFinNorm,
        diasOtorgados: diasNum,
        anioEjercicio: anioEjercicioFinal,
        mesEjercicio: mesEjercicioFinal,
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

