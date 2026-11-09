import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { logger } from '@/core/logging/systemLogger';
import { requireStaffAccess } from '@/core/auth/rbac';

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['VER_AUDITORIA'],
      allowMissingMicrored: true,
    });
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(request.url);
    const limite = Math.min(300, Math.max(10, Number(searchParams.get('limite')) || 100));
    const tipo = searchParams.get('tipo') || 'TODOS';
    const modulo = searchParams.get('modulo') || '';
    const busqueda = (searchParams.get('busqueda') || '').trim();

    // Construcción dinámica de filtros Prisma combinados siempre con AND
    const andConditions: any[] = [];

    if (modulo) {
      andConditions.push({ modulo });
    }

    if (tipo === 'ERRORES') {
      andConditions.push({
        OR: [
          { accion: { startsWith: 'ERROR' } },
          { accion: { startsWith: 'CRITICO' } },
          { detalles: { contains: '"nivel":"ERROR"' } },
          { detalles: { contains: '"nivel":"CRITICO"' } }
        ]
      });
    } else if (tipo === 'ADVERTENCIAS') {
      andConditions.push({
        OR: [
          { accion: { startsWith: 'ADVERTENCIA' } },
          { detalles: { contains: '"nivel":"ADVERTENCIA"' } }
        ]
      });
    } else if (tipo === 'AUDITORIA') {
      andConditions.push(
        { NOT: { accion: { startsWith: 'ERROR' } } },
        { NOT: { accion: { startsWith: 'CRITICO' } } },
        { NOT: { accion: { startsWith: 'ADVERTENCIA' } } }
      );
    }

    if (busqueda) {
      andConditions.push({
        OR: [
          { accion: { contains: busqueda, mode: 'insensitive' } },
          { modulo: { contains: busqueda, mode: 'insensitive' } },
          { detalles: { contains: busqueda, mode: 'insensitive' } }
        ]
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const registros = await prisma.auditoria.findMany({
      where,
      take: limite,
      orderBy: { fecha: 'desc' },
      include: {
        usuario: {
          select: { nombres: true, apellidos: true, rol: true, dni: true }
        }
      }
    });

    return NextResponse.json(registros);
  } catch (error) {
    logger.error('SISTEMA', 'CONSULTA_AUDITORIA_ERROR', 'Error al obtener registros de auditoría y logs', { error });
    return NextResponse.json({ error: 'Error al consultar logs' }, { status: 500 });
  }
}

/**
 * Permite purgar logs antiguos o de prueba (Exclusivo Super Admin)
 */
export async function DELETE(request: Request) {
  try {
    const auth = await requireStaffAccess({ requireSuperAdmin: true });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const { searchParams } = new URL(request.url);
    const soloErrores = searchParams.get('soloErrores') === 'true';

    let deletedCount = 0;
    if (soloErrores) {
      const res = await prisma.auditoria.deleteMany({
        where: {
          OR: [
            { accion: { startsWith: 'ERROR' } },
            { accion: { startsWith: 'CRITICO' } },
            { accion: { startsWith: 'ADVERTENCIA' } }
          ]
        }
      });
      deletedCount = res.count;
    } else {
      // Eliminar registros de prueba más viejos de 7 días
      const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const res = await prisma.auditoria.deleteMany({
        where: {
          fecha: { lt: hace7Dias }
        }
      });
      deletedCount = res.count;
    }

    await logger.info('SISTEMA', 'DEPURACION_LOGS', `Se han purgado ${deletedCount} registros antiguos de la bitácora`, {
      usuarioId: ctx.userId
    });

    return NextResponse.json({ ok: true, eliminados: deletedCount });
  } catch (error) {
    logger.error('SISTEMA', 'DEPURACION_LOGS_ERROR', 'Fallo al purgar logs', { error });
    return NextResponse.json({ error: 'Error al purgar logs' }, { status: 500 });
  }
}
