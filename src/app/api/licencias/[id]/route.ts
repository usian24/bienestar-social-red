import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    if (!id) {
      return NextResponse.json({ error: 'Falta el ID de la licencia' }, { status: 400 });
    }

    const licencia = await prisma.licencia.findUnique({ where: { id } });

    await prisma.licencia.delete({
      where: { id }
    });

    if (licencia) {
      await prisma.auditoria.create({
        data: {
          usuarioId: (session.user as any).id,
          accion: 'ELIMINAR',
          modulo: 'LICENCIA',
          entidadId: id,
          detalles: `Eliminó el certificado ${licencia.numeroCertificado} (${licencia.diasOtorgados} días)`
        }
      });
    }

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
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    
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
      diagnostico
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID de la licencia' }, { status: 400 });
    }

    const licenciaActualizada = await prisma.licencia.update({
      where: { id },
      data: {
        ...(tipoLicencia !== undefined && { tipoLicencia }),
        origen,
        numeroCertificado,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        diasOtorgados: Number(diasOtorgados),
        anioEjercicio: Number(anioEjercicio),
        mesEjercicio: Number(mesEjercicio),
        ...(archivoRuta !== undefined && { archivoRuta }),
        ...(medico !== undefined && { medico: medico ? String(medico).trim() : null }),
        ...(colegiatura !== undefined && { colegiatura: colegiatura ? String(colegiatura).trim() : null }),
        ...(diagnostico !== undefined && { diagnostico: diagnostico ? String(diagnostico).trim() : null })
      } as any
    });

    await prisma.auditoria.create({
      data: {
        usuarioId: (session.user as any).id,
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
