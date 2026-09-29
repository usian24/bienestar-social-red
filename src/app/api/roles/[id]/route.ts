import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.rol === 'SUPER_ADMIN';
    const canManage = (session?.user as any)?.permisos?.includes('ADMINISTRAR_USUARIOS');
    
    if (!session || (!isAdmin && !canManage)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, descripcion, permisos } = body;
    const { id } = await context.params;

    const rol = await prisma.rol.findUnique({ where: { id } });
    if (!rol) return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
    
    if (rol.esFijo) {
       return NextResponse.json({ error: 'No se puede editar un rol fijo del sistema' }, { status: 400 });
    }

    const updated = await prisma.rol.update({
      where: { id },
      data: {
        nombre: nombre ? nombre.toUpperCase().trim() : undefined,
        descripcion,
        permisos
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error actualizando rol:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.rol === 'SUPER_ADMIN';
    const canManage = (session?.user as any)?.permisos?.includes('ADMINISTRAR_USUARIOS');
    
    if (!session || (!isAdmin && !canManage)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await context.params;
    const rol = await prisma.rol.findUnique({ where: { id }, include: { _count: { select: { usuarios: true } } } });
    if (!rol) return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
    
    if (rol.esFijo) {
       return NextResponse.json({ error: 'No se puede eliminar un rol fijo del sistema' }, { status: 400 });
    }
    
    if (rol._count.usuarios > 0) {
       return NextResponse.json({ error: 'No se puede eliminar porque hay usuarios usando este rol' }, { status: 400 });
    }

    await prisma.rol.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error eliminando rol:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
