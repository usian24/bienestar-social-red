import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { canAccessWorkerMicrored, requireStaffAccess } from '@/core/auth/rbac';
import { parseNormalizedCalendarDate } from '@/core/licencias/calculoSubsidios';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffAccess({ requireSuperAdmin: true });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    if (!id) {
      return NextResponse.json({ error: 'Falta el ID de la licencia' }, { status: 400 });
    }

    const licencia = await prisma.licencia.findUnique({ where: { id } });
    if (!licencia) {
      return NextResponse.json({ error: 'Licencia no encontrada' }, { status: 404 });
    }

    await prisma.licencia.delete({
      where: { id }
    });

    await prisma.auditoria.create({
      data: {
        usuarioId: ctx.userId,
        accion: 'ELIMINAR',
        modulo: 'LICENCIA',
        entidadId: id,
        detalles: `Eliminó el certificado ${licencia.numeroCertificado} (${licencia.diasOtorgados} días)`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar licencia:', error);
    return NextResponse.json({ error: 'Error interno al eliminar' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['GESTIONAR_LICENCIAS', 'SUBIR_CITT'],
    });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    if (!id) {
      return NextResponse.json({ error: 'Falta el ID de la licencia' }, { status: 400 });
    }

    const licenciaExistente = await prisma.licencia.findUnique({
      where: { id },
      include: {
        trabajador: {
          include: { establecimiento: true }
        }
      }
    });

    if (!licenciaExistente) {
      return NextResponse.json({ error: 'Licencia no encontrada' }, { status: 404 });
    }

    if (!canAccessWorkerMicrored(ctx, licenciaExistente.trabajador?.establecimiento?.microredId)) {
      return NextResponse.json({ error: 'Acceso denegado fuera de su microred asignada.' }, { status: 403 });
    }

    const body = await request.json();
    const {
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

    const fechaInicioNorm = parseNormalizedCalendarDate(fechaInicio);
    const fechaFinNorm = parseNormalizedCalendarDate(fechaFin);
    if (!fechaInicioNorm || !fechaFinNorm) {
      return NextResponse.json({ error: 'Las fechas ingresadas no son válidas' }, { status: 400 });
    }
    if (fechaFinNorm < fechaInicioNorm) {
      return NextResponse.json({ error: 'La fecha de fin no puede ser anterior a la fecha de inicio' }, { status: 400 });
    }

    const anioEjercicioFinal =
      anioEjercicio !== undefined && anioEjercicio !== null && Number.isFinite(Number(anioEjercicio))
        ? Number(anioEjercicio)
        : fechaInicioNorm.getUTCFullYear();
    const mesEjercicioFinal =
      mesEjercicio !== undefined && mesEjercicio !== null && Number.isFinite(Number(mesEjercicio))
        ? Number(mesEjercicio)
        : fechaInicioNorm.getUTCMonth() + 1;

    const licenciaActualizada = await prisma.licencia.update({
      where: { id },
      data: {
        ...(tipoLicencia !== undefined && { tipoLicencia }),
        origen,
        numeroCertificado,
        fechaInicio: fechaInicioNorm,
        fechaFin: fechaFinNorm,
        diasOtorgados: Number(diasOtorgados),
        anioEjercicio: anioEjercicioFinal,
        mesEjercicio: mesEjercicioFinal,
        ...(archivoRuta !== undefined && { archivoRuta }),
        ...(medico !== undefined && { medico: medico ? String(medico).trim() : null }),
        ...(colegiatura !== undefined && { colegiatura: colegiatura ? String(colegiatura).trim() : null }),
        ...(diagnostico !== undefined && { diagnostico: diagnostico ? String(diagnostico).trim() : null }),
        ...(familiarPaciente !== undefined && { familiarPaciente: familiarPaciente ? String(familiarPaciente).trim() : null })
      }
    });

    await prisma.auditoria.create({
      data: {
        usuarioId: ctx.userId,
        accion: 'EDITAR',
        modulo: 'LICENCIA',
        entidadId: id,
        detalles: `Editó el certificado ${numeroCertificado} (${origen})`
      }
    });

    return NextResponse.json(licenciaActualizada);
  } catch (error) {
    console.error('Error al actualizar licencia:', error);
    return NextResponse.json({ error: 'Error interno al actualizar' }, { status: 500 });
  }
}
