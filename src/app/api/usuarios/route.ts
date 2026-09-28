import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.rol === 'SUPER_ADMIN';
    const canManage = (session?.user as any)?.permisos?.includes('ADMINISTRAR_USUARIOS');
    if (!session || (!isAdmin && !canManage)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

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
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.rol === 'SUPER_ADMIN';
    const canManage = (session?.user as any)?.permisos?.includes('ADMINISTRAR_USUARIOS');
    if (!session || (!isAdmin && !canManage)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { dni, nombres, apellidos, password, rolId, microredId, permisosExtra } = body;

    if (!dni || !nombres || !apellidos || !password || !rolId) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
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
        permisosExtra: permisosExtra || [],
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
        usuarioId: (session.user as any).id,
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
