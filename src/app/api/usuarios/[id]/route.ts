import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.rol === 'SUPER_ADMIN';
    const canManage = (session?.user as any)?.permisos?.includes('ADMINISTRAR_USUARIOS');
    if (!session || (!isAdmin && !canManage)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { nombres, apellidos, password, rolId, microredId, permisosExtra } = body;

    const dataToUpdate: any = {
      nombres,
      apellidos,
      rolId: rolId,
      permisosExtra: permisosExtra || [],
      microredId: microredId ? Number(microredId) : null,
    };

    if (password && password.trim() !== '') {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    // No se permite quitar el rol de SUPER_ADMIN a admin123
    const targetUser = await prisma.usuario.findUnique({ where: { id } });
    if (targetUser?.dni === 'admin123') {
      const newRole = await prisma.rol.findUnique({ where: { id: rolId } });
      if (newRole?.nombre !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'No se puede quitar el rol de SUPER_ADMIN al usuario principal' }, { status: 400 });
      }
    }

    const updatedUser = await prisma.usuario.update({
      where: { id },
      data: dataToUpdate
    });

    await prisma.auditoria.create({
      data: {
        usuarioId: (session.user as any).id,
        accion: 'EDITAR',
        modulo: 'USUARIO',
        entidadId: id,
        detalles: `Actualizó datos y permisos del usuario ${nombres} ${apellidos}`
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.rol === 'SUPER_ADMIN';
    const canManage = (session?.user as any)?.permisos?.includes('ADMINISTRAR_USUARIOS');
    if (!session || (!isAdmin && !canManage)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    
    // Buscar al usuario que se intenta eliminar
    const targetUser = await prisma.usuario.findUnique({ 
      where: { id },
      include: { rol: true }
    });
    
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Regla de negocio: Un SUPER_ADMIN no puede eliminar a otro SUPER_ADMIN
    if (targetUser.rol?.nombre === 'SUPER_ADMIN') {
       return NextResponse.json({ error: 'Por seguridad, no se puede desactivar a un usuario con rango de Súper Administrador' }, { status: 403 });
    }

    // En lugar de borrar (delete), desactivamos la cuenta (soft delete) por integridad de la base de datos
    await prisma.usuario.update({
      where: { id },
      data: { activo: false }
    });

    await prisma.auditoria.create({
      data: {
        usuarioId: (session.user as any).id,
        accion: 'ELIMINAR',
        modulo: 'USUARIO',
        entidadId: id,
        detalles: `Desactivó al usuario ${targetUser.nombres} ${targetUser.apellidos} (${targetUser.dni})`
      }
    });

    return NextResponse.json({ message: 'Usuario desactivado correctamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
