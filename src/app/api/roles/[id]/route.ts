import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { requireStaffAccess } from '@/core/auth/rbac';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireStaffAccess({ requireSuperAdmin: true });
    if (auth.errorResponse) return auth.errorResponse;

    const body = await request.json();
    const { nombre, descripcion, permisos } = body;
    const { id } = await context.params;

    const rol = await prisma.rol.findUnique({ where: { id } });
    if (!rol) return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
    
    // Si el rol es fijo del sistema (SUPER_ADMIN, SEDE_ADMIN, TRABAJADOR, VISUALIZADOR):
    // Se permite al Super Admin modificar sus poderes asignados (permisos) y descripción,
    // pero se resguarda su nombre clave interno para no romper la arquitectura del sistema.
    const nuevoNombre = rol.esFijo ? rol.nombre : (nombre ? nombre.toUpperCase().trim() : undefined);
    if (!rol.esFijo && nuevoNombre === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No se puede renombrar un rol a SUPER_ADMIN' }, { status: 400 });
    }

    const updated = await prisma.rol.update({
      where: { id },
      data: {
        nombre: nuevoNombre,
        descripcion,
        permisos: Array.isArray(permisos) ? permisos.filter((p): p is string => typeof p === 'string') : []
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
    const auth = await requireStaffAccess({ requireSuperAdmin: true });
    if (auth.errorResponse) return auth.errorResponse;

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
