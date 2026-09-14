import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 2) {
      return NextResponse.json([]); // No buscar si hay menos de 2 letras
    }

    // Buscar trabajadores por DNI o Apellidos/Nombres
    const trabajadores = await prisma.trabajador.findMany({
      where: {
        OR: [
          { dni: { contains: q, mode: 'insensitive' } },
          { apellidos: { contains: q, mode: 'insensitive' } },
          { nombres: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: {
        establecimiento: {
          include: { microred: true }
        }
      },
      take: 15 // Límite para no saturar la pantalla
    });

    return NextResponse.json(trabajadores);
  } catch (error) {
    console.error('Error buscando trabajadores:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

