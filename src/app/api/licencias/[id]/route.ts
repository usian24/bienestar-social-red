import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    if (!id) {
      return NextResponse.json({ error: 'Falta el ID de la licencia' }, { status: 400 });
    }

    await prisma.licencia.delete({
      where: { id }
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
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    const body = await request.json();
    const {
      origen,
      numeroCertificado,
      fechaInicio,
      fechaFin,
      diasOtorgados,
      anioEjercicio,
      mesEjercicio,
      archivoRuta
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Falta el ID de la licencia' }, { status: 400 });
    }

    const licenciaActualizada = await prisma.licencia.update({
      where: { id },
      data: {
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

    return NextResponse.json(licenciaActualizada);
  } catch (error) {
    console.error('Error al actualizar licencia:', error);
    return NextResponse.json({ error: 'Error interno al actualizar' }, { status: 500 });
  }
}
