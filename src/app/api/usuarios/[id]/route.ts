import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import bcrypt from 'bcryptjs';
import { requireStaffAccess } from '@/core/auth/rbac';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['ADMINISTRAR_USUARIOS'],
      allowMissingMicrored: true,
    });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const { id } = await params;
    const body = await request.json();
    const { nombres, apellidos, password, rolId, microredId, permisosExtra } = body;

    const targetUser = await prisma.usuario.findUnique({
      where: { id },
      include: { rol: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const newRole = rolId ? await prisma.rol.findUnique({ where: { id: rolId } }) : targetUser.rol;
    if (!newRole) {
      return NextResponse.json({ error: 'El rol especificado no existe' }, { status: 400 });
    }

    if (!ctx.isSuperAdmin && (targetUser.rol?.nombre === 'SUPER_ADMIN' || newRole.nombre === 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Solo un SUPER_ADMIN puede modificar cuentas o asignar el rol SUPER_ADMIN.' },
        { status: 403 }
      );
    }

    if (targetUser.dni === 'admin123' && newRole.nombre !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No se puede quitar el rol de SUPER_ADMIN al usuario principal' }, { status: 400 });
    }

    const extraSanitized: string[] = Array.isArray(permisosExtra)
      ? permisosExtra.filter((p): p is string => typeof p === 'string')
      : [];

    if (!ctx.isSuperAdmin) {
      const existingExtra = Array.isArray(targetUser.permisosExtra) ? targetUser.permisosExtra : [];
      const newlyAddedExtras = extraSanitized.filter((p) => !existingExtra.includes(p));
      if (newlyAddedExtras.some((p) => !ctx.permisos.includes(p))) {
        return NextResponse.json(
          { error: 'No puede conceder permisos extra que usted no posee.' },
          { status: 403 }
        );
      }
    }

    const dataToUpdate: any = {
      nombres,
      apellidos,
      rolId: newRole.id,
      permisosExtra: extraSanitized,
      microredId: microredId ? Number(microredId) : null,
    };

    if (password && typeof password === 'string' && password.trim() !== '') {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.usuario.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        dni: true,
        nombres: true,
        apellidos: true,
        rolId: true,
        rol: { select: { id: true, nombre: true } },
        permisosExtra: true,
        activo: true,
        creadoEn: true,
        microredId: true,
        microred: { select: { id: true, nombre: true } },
      }
    });

    await prisma.auditoria.create({
      data: {
        usuarioId: ctx.userId,
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
    const auth = await requireStaffAccess({
      permisos: ['ADMINISTRAR_USUARIOS'],
      allowMissingMicrored: true,
    });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const { id } = await params;

    if (id === ctx.userId) {
      return NextResponse.json({ error: 'No puede desactivar su propia cuenta en sesión.' }, { status: 400 });
    }
    
    // Buscar al usuario que se intenta eliminar
    const targetUser = await prisma.usuario.findUnique({ 
      where: { id },
      include: { rol: true }
    });
    
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Regla de negocio: No se puede desactivar a un SUPER_ADMIN
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
        usuarioId: ctx.userId,
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
