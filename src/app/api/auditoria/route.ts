import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limite = Number(searchParams.get('limite')) || 100;

    const registros = await prisma.auditoria.findMany({
      take: limite,
      orderBy: { fecha: 'desc' },
      include: {
        usuario: {
          select: { nombres: true, apellidos: true, rol: true, dni: true }
        }
      }
    });

    return NextResponse.json(registros);
  } catch (error) {
    console.error('Error fetching auditoria:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

