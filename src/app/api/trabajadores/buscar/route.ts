import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { hasAnyPermission, requireStaffAccess } from '@/core/auth/rbac';

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['VER_TRABAJADORES', 'EDITAR_TRABAJADORES', 'GESTIONAR_LICENCIAS', 'SUBIR_CITT', 'ADMINISTRAR_USUARIOS'],
      allowMissingMicrored: true,
    });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    if (!ctx.isSuperAdmin && !ctx.microredId && !hasAnyPermission(ctx, ['ADMINISTRAR_USUARIOS'])) {
      return NextResponse.json(
        { error: 'Su cuenta no tiene una microred asignada. Contacte al Súper Administrador.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const condicion = searchParams.get('condicion') || '';
    const pageRaw = parseInt(searchParams.get('page') || '1', 10);
    const limitRaw = parseInt(searchParams.get('limit') || '10', 10);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 10;

    const whereClause: any = {};

    if (q.length > 0) {
      whereClause.OR = [
        { dni: { contains: q, mode: 'insensitive' } },
        { apellidos: { contains: q, mode: 'insensitive' } },
        { nombres: { contains: q, mode: 'insensitive' } }
      ];
    }

    if (condicion.length > 0) {
      whereClause.condicionLaboral = condicion;
    }

    if (!ctx.isSuperAdmin && ctx.microredId) {
      whereClause.establecimiento = {
        microredId: ctx.microredId
      };
    }

    const whereJurisdiccion: any = {};
    if (!ctx.isSuperAdmin && ctx.microredId) {
      whereJurisdiccion.establecimiento = {
        microredId: ctx.microredId
      };
    }

    const skip = (page - 1) * limit;

    // Buscar trabajadores, total y condiciones que realmente existen en esta jurisdicción
    const [trabajadores, total, rawCondiciones] = await Promise.all([
      prisma.trabajador.findMany({
        where: whereClause,
        include: {
          establecimiento: {
            include: { microred: true }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { apellidos: 'asc' },
          { nombres: 'asc' }
        ]
      }),
      prisma.trabajador.count({ where: whereClause }),
      prisma.trabajador.groupBy({
        by: ['condicionLaboral'],
        where: whereJurisdiccion
      })
    ]);

    const condiciones = rawCondiciones
      .map(c => c.condicionLaboral)
      .filter((c): c is string => Boolean(c))
      .sort();

    return NextResponse.json({ trabajadores, total, condiciones });
  } catch (error) {
    console.error('Error buscando trabajadores:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

