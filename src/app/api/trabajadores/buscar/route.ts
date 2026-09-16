import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 2) {
      return NextResponse.json([]); // No buscar si hay menos de 2 letras
    }

    const isSuperAdmin = (session.user as any)?.rol === 'SUPER_ADMIN';
    const userMicroredId = (session.user as any)?.microredId;

    const whereClause: any = {
      OR: [
        { dni: { contains: q, mode: 'insensitive' } },
        { apellidos: { contains: q, mode: 'insensitive' } },
        { nombres: { contains: q, mode: 'insensitive' } }
      ]
    };

    if (!isSuperAdmin && userMicroredId) {
      whereClause.establecimiento = {
        microredId: Number(userMicroredId)
      };
    }

    // Buscar trabajadores por DNI o Apellidos/Nombres
    const trabajadores = await prisma.trabajador.findMany({
      where: whereClause,
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

