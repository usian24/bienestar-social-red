import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { requireStaffAccess } from '@/core/auth/rbac';

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['ADMINISTRAR_USUARIOS'],
      allowMissingMicrored: true,
    });
    if (auth.errorResponse) return auth.errorResponse;

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
    const auth = await requireStaffAccess({ requireSuperAdmin: true });
    if (auth.errorResponse) return auth.errorResponse;

    const body = await request.json();
    const { nombre, descripcion, permisos } = body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json({ error: 'Falta el nombre del rol' }, { status: 400 });
    }

    const nombreNormalizado = nombre.toUpperCase().trim();
    if (nombreNormalizado === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'El rol SUPER_ADMIN es único en el sistema' }, { status: 400 });
    }

    const existente = await prisma.rol.findUnique({ where: { nombre: nombreNormalizado } });
    if (existente) {
      return NextResponse.json({ error: 'Ya existe un rol con ese nombre' }, { status: 400 });
    }

    const nuevoRol = await prisma.rol.create({
      data: {
        nombre: nombreNormalizado,
        descripcion,
        permisos: Array.isArray(permisos) ? permisos.filter((p): p is string => typeof p === 'string') : []
      }
    });

    return NextResponse.json(nuevoRol, { status: 201 });
  } catch (error) {
    console.error('Error creando rol:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
