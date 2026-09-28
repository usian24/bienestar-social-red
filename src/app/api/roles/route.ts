import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.rol === 'SUPER_ADMIN';
    const canManage = (session?.user as any)?.permisos?.includes('ADMINISTRAR_USUARIOS');
    
    if (!session || (!isAdmin && !canManage)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const roles = await prisma.rol.findMany({
      orderBy: { creadoEn: 'asc' }
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.rol === 'SUPER_ADMIN';
    const canManage = (session?.user as any)?.permisos?.includes('ADMINISTRAR_USUARIOS');
    
    if (!session || (!isAdmin && !canManage)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, descripcion, permisos } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'Falta el nombre del rol' }, { status: 400 });
    }

    const nuevoRol = await prisma.rol.create({
      data: {
        nombre: nombre.toUpperCase().trim(),
        descripcion,
        permisos: permisos || []
      }
    });

    return NextResponse.json(nuevoRol, { status: 201 });
  } catch (error) {
    console.error('Error creando rol:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
