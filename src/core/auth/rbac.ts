import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/core/db/prisma';
import { Permiso, tienePermiso } from '@/shared/utils/permisos';
import { NextResponse } from 'next/server';

export interface AuthContext {
  userId: string;
  dni: string;
  rol: string;
  permisos: string[];
  isSuperAdmin: boolean;
  isTrabajador: boolean;
  microredId: number | null;
  microredNombre: string | null;
}

/**
 * Obtiene y valida el contexto de sesión del usuario autenticado contra la base de datos.
 * Garantiza revocación inmediata si la cuenta fue desactivada y resuelve permisos/microred frescos.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return null;

  const sessionUser = session.user as any;
  const userId = typeof sessionUser.id === 'string' ? sessionUser.id : null;
  const dniFromSession = typeof sessionUser.email === 'string' ? sessionUser.email : null;

  if (!userId && !dniFromSession) return null;

  const dbUser = await prisma.usuario.findFirst({
    where: userId ? { id: userId } : { dni: dniFromSession! },
    select: {
      id: true,
      dni: true,
      activo: true,
      microredId: true,
      permisosExtra: true,
      microred: { select: { id: true, nombre: true } },
      rol: { select: { nombre: true, permisos: true } },
    },
  });

  if (!dbUser || !dbUser.activo) {
    return null;
  }

  const rol = dbUser.rol?.nombre || sessionUser.rol || 'VISUALIZADOR';
  const permisos = Array.from(
    new Set([
      ...(Array.isArray(dbUser.rol?.permisos) ? dbUser.rol.permisos : []),
      ...(Array.isArray(dbUser.permisosExtra) ? dbUser.permisosExtra : []),
    ])
  );

  return {
    userId: dbUser.id,
    dni: dbUser.dni,
    rol,
    permisos,
    isSuperAdmin: rol === 'SUPER_ADMIN',
    isTrabajador: rol === 'TRABAJADOR',
    microredId: dbUser.microredId ?? null,
    microredNombre: dbUser.microred?.nombre || null,
  };
}

export function hasAnyPermission(ctx: AuthContext, permisosRequeridos: Permiso[]): boolean {
  if (ctx.isSuperAdmin) return true;
  return permisosRequeridos.some((p) => tienePermiso(ctx.permisos, ctx.rol, p));
}

export function canAccessWorkerMicrored(ctx: AuthContext, workerMicroredId?: number | null): boolean {
  if (ctx.isSuperAdmin) return true;
  if (!ctx.microredId || !workerMicroredId) return false;
  return ctx.microredId === Number(workerMicroredId);
}

/**
 * Helper uniforme para exigir autenticación, excluir TRABAJADOR de rutas administrativas,
 * validar permisos y verificar que roles de microred tengan microredId asignado (fail-closed).
 */
export async function requireStaffAccess(options?: {
  permisos?: Permiso[];
  requireSuperAdmin?: boolean;
  allowMissingMicrored?: boolean;
}): Promise<{ ctx: AuthContext; errorResponse?: never } | { ctx?: never; errorResponse: NextResponse }> {
  const ctx = await getAuthContext();
  if (!ctx) {
    return {
      errorResponse: NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 }),
    };
  }

  if (ctx.isTrabajador) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Acceso restringido. Función exclusiva para personal autorizado.' },
        { status: 403 }
      ),
    };
  }

  if (options?.requireSuperAdmin && !ctx.isSuperAdmin) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Acceso denegado. Se requiere rol SUPER_ADMIN.' },
        { status: 403 }
      ),
    };
  }

  if (options?.permisos && options.permisos.length > 0 && !hasAnyPermission(ctx, options.permisos)) {
    return {
      errorResponse: NextResponse.json(
        { error: 'No cuenta con los permisos necesarios para realizar esta operación.' },
        { status: 403 }
      ),
    };
  }

  if (!ctx.isSuperAdmin && !options?.allowMissingMicrored && !ctx.microredId) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Su cuenta no tiene una microred asignada. Contacte al Súper Administrador.' },
        { status: 403 }
      ),
    };
  }

  return { ctx };
}

