import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import bcrypt from 'bcryptjs';
import { requireStaffAccess } from '@/core/auth/rbac';

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['ADMINISTRAR_USUARIOS'],
      allowMissingMicrored: true,
    });
    if (auth.errorResponse) return auth.errorResponse;

    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        dni: true,
        nombres: true,
        apellidos: true,
        rol: { select: { id: true, nombre: true } },
        permisosExtra: true,
        activo: true,
        creadoEn: true,
        microred: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: { creadoEn: 'desc' }
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error('Error fetching usuarios:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['ADMINISTRAR_USUARIOS'],
      allowMissingMicrored: true,
    });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const body = await request.json();
    const { dni, nombres, apellidos, password, rolId, microredId, permisosExtra } = body;

    if (!dni || !nombres || !apellidos || !password || !rolId) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const rolDestino = await prisma.rol.findUnique({ where: { id: rolId } });
    if (!rolDestino) {
      return NextResponse.json({ error: 'El rol especificado no existe' }, { status: 400 });
    }

    if (!ctx.isSuperAdmin && rolDestino.nombre === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Solo un SUPER_ADMIN puede crear usuarios con rol SUPER_ADMIN.' },
        { status: 403 }
      );
    }

    const extraSanitized: string[] = Array.isArray(permisosExtra)
      ? permisosExtra.filter((p): p is string => typeof p === 'string')
      : [];

    if (!ctx.isSuperAdmin && extraSanitized.some((p) => !ctx.permisos.includes(p))) {
      return NextResponse.json(
        { error: 'No puede asignar permisos extra que usted no posee.' },
        { status: 403 }
      );
    }

    // Verificar si el DNI ya existe
    const existe = await prisma.usuario.findUnique({ where: { dni } });
    if (existe) {
      return NextResponse.json({ error: 'El DNI ya está registrado' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        dni,
        nombres,
        apellidos,
        passwordHash,
        rolId: rolId,
        permisosExtra: extraSanitized,
        microredId: microredId ? Number(microredId) : null
      },
      select: {
        id: true,
        dni: true,
        nombres: true,
        apellidos: true,
        rol: { select: { id: true, nombre: true } },
        permisosExtra: true,
        activo: true
      }
    });

    await prisma.auditoria.create({
      data: {
        usuarioId: ctx.userId,
        accion: 'CREAR',
        modulo: 'USUARIO',
        entidadId: nuevoUsuario.id,
        detalles: `Creó al usuario ${nombres} ${apellidos} (${dni})`
      }
    });

    return NextResponse.json(nuevoUsuario, { status: 201 });
  } catch (error) {
    console.error('Error creando usuario:', error);
    return NextResponse.json({ error: 'Error del servidor al crear usuario' }, { status: 500 });
  }
}
