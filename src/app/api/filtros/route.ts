import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { hasAnyPermission, requireStaffAccess } from '@/core/auth/rbac';

export async function GET() {
  try {
    const auth = await requireStaffAccess({ allowMissingMicrored: true });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const verTodas = ctx.isSuperAdmin || hasAnyPermission(ctx, ['ADMINISTRAR_USUARIOS']);
    if (!verTodas && !ctx.microredId) {
      return NextResponse.json({ error: 'Cuenta sin microred asignada.' }, { status: 403 });
    }

    const microredes = await prisma.microred.findMany({
      where: verTodas ? undefined : { id: ctx.microredId! },
      include: {
        establecimientos: {
          orderBy: { nombre: 'asc' }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    return NextResponse.json(microredes);
  } catch (error) {
    console.error('Error fetching filtros:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

