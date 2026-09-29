import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Obtener los datos completos del usuario logueado
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        microred: true
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscamos si existe un Trabajador con el mismo DNI para traer sus licencias personales
    const trabajador = await prisma.trabajador.findUnique({
      where: { dni: usuario.dni },
      include: {
        establecimiento: {
           include: { microred: true }
        },
        licencias: {
          orderBy: { creadoEn: 'desc' }
        }
      }
    });

    return NextResponse.json({
      ...usuario,
      licenciasPersonales: trabajador?.licencias || [],
      establecimientoReal: trabajador?.establecimiento || null
    });
  } catch (error) {
    console.error('Error fetching personal data:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
