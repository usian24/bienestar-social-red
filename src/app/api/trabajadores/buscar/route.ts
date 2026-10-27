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
    const q = searchParams.get('q') || '';
    const condicion = searchParams.get('condicion') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const isSuperAdmin = (session.user as any)?.rol === 'SUPER_ADMIN';
    const userMicroredId = (session.user as any)?.microredId;

    const whereClause: any = {};

    if (q.length > 0) {
      whereClause.OR = [
        { dni: { contains: q, mode: 'insensitive' } },
        { apellidos: { contains: q, mode: 'insensitive' } },
        { nombres: { contains: q, mode: 'insensitive' } }
      ];
    }

    if (condicion.length > 0) {
      whereClause.condicionLaboral = condicion;
    }

    if (!isSuperAdmin && userMicroredId) {
      whereClause.establecimiento = {
        microredId: Number(userMicroredId)
      };
    }

    const whereJurisdiccion: any = {};
    if (!isSuperAdmin && userMicroredId) {
      whereJurisdiccion.establecimiento = {
        microredId: Number(userMicroredId)
      };
    }

    const skip = (page - 1) * limit;

    // Buscar trabajadores, total y condiciones que realmente existen en esta jurisdicción
    const [trabajadores, total, rawCondiciones] = await Promise.all([
      prisma.trabajador.findMany({
        where: whereClause,
        include: {
          establecimiento: {
            include: { microred: true }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { apellidos: 'asc' },
          { nombres: 'asc' }
        ]
      }),
      prisma.trabajador.count({ where: whereClause }),
      prisma.trabajador.groupBy({
        by: ['condicionLaboral'],
        where: whereJurisdiccion
      })
    ]);

    const condiciones = rawCondiciones
      .map(c => c.condicionLaboral)
      .filter((c): c is string => Boolean(c))
      .sort();

    return NextResponse.json({ trabajadores, total, condiciones });
  } catch (error) {
    console.error('Error buscando trabajadores:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

