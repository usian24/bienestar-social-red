import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/core/db/prisma';
import bcrypt from 'bcryptjs';
import { logger } from '@/core/logging/systemLogger';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'No autorizado. Debe iniciar sesión.' }, { status: 401 });
    }

    const rol = (session.user as any)?.rol;
    const userId = (session.user as any).id;

    // REGLA CRÍTICA: Solo los usuarios con rol TRABAJADOR tienen acceso al autoservicio de cambio de contraseña
    if (rol !== 'TRABAJADOR') {
      return NextResponse.json({
        error: 'Esta función es exclusiva para servidores con rol TRABAJADOR desde su panel personal. Los administradores y otros roles deben coordinar con la Jefatura o Recursos Humanos.'
      }, { status: 403 });
    }

    const body = await request.json();
    const { passwordActual, passwordNuevo, passwordConfirmacion } = body;

    if (!passwordActual || !passwordNuevo || !passwordConfirmacion) {
      return NextResponse.json({ error: 'Por favor completa todos los campos requeridos.' }, { status: 400 });
    }

    if (passwordNuevo.length < 6) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    if (passwordNuevo !== passwordConfirmacion) {
      return NextResponse.json({ error: 'La confirmación de la nueva contraseña no coincide.' }, { status: 400 });
    }

    if (passwordActual === passwordNuevo) {
      return NextResponse.json({ error: 'La nueva contraseña no puede ser idéntica a la actual.' }, { status: 400 });
    }

    // Buscar al usuario en la base de datos
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, dni: true, nombres: true, apellidos: true, passwordHash: true, activo: true, rol: { select: { nombre: true } } }
    });

    if (!user || !user.activo) {
      return NextResponse.json({ error: 'Usuario no encontrado o inactivo en el sistema.' }, { status: user ? 403 : 404 });
    }

    // Validar contraseña actual estrictamente con bcrypt
    const isActualValid = Boolean(
      user.passwordHash &&
      (user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$')) &&
      (await bcrypt.compare(passwordActual, user.passwordHash))
    );

    if (!isActualValid) {
      // Registrar intento fallido en los logs de seguridad del sistema (sin registrar la contraseña)
      await logger.advertencia(
        'SEGURIDAD',
        'CAMBIO_PASSWORD_FALLIDO',
        `Intento fallido de cambio de contraseña: la contraseña actual no coincidió para el trabajador ${user.dni} (${user.nombres} ${user.apellidos}).`,
        {
          usuarioId: user.id,
          ruta: '/api/trabajador/cambiar-password'
        }
      );

      return NextResponse.json({ 
        error: 'La contraseña actual ingresada es incorrecta. Si la olvidaste, ponte en contacto con Recursos Humanos de la Red de Salud Huánuco.' 
      }, { status: 400 });
    }

    // Hashear la nueva contraseña con salt de 10 rondas de bcrypt
    const nuevoPasswordHash = await bcrypt.hash(passwordNuevo, 10);

    // Actualizar en la base de datos
    await prisma.usuario.update({
      where: { id: user.id },
      data: { passwordHash: nuevoPasswordHash }
    });

    // Registrar en tabla de Auditoría (Prisma)
    await prisma.auditoria.create({
      data: {
        usuarioId: user.id,
        accion: 'EDITAR',
        modulo: 'SEGURIDAD_PASSWORD',
        entidadId: user.id,
        detalles: JSON.stringify({
          evento: 'Cambio de contraseña exitoso por autoservicio de trabajador',
          dni: user.dni,
          servidor: `${user.apellidos}, ${user.nombres}`,
          fecha: new Date().toISOString()
        })
      }
    });

    // Registrar en logs del sistema (sin guardar la contraseña en texto plano)
    await logger.info(
      'SEGURIDAD',
      'CAMBIO_PASSWORD_EXITOSO',
      `El trabajador ${user.nombres} ${user.apellidos} (DNI ${user.dni}) actualizó su contraseña institucional exitosamente.`,
      {
        usuarioId: user.id,
        ruta: '/api/trabajador/cambiar-password'
      }
    );

    return NextResponse.json({
      success: true,
      message: '¡Tu contraseña ha sido actualizada con éxito! Se utilizará a partir de tu próximo inicio de sesión.'
    });

  } catch (error: any) {
    console.error('Error al cambiar contraseña de trabajador:', error);
    await logger.error(
      'SEGURIDAD',
      'CAMBIO_PASSWORD_ERROR',
      `Error interno al procesar cambio de contraseña: ${error?.message || error}`,
      {
        ruta: '/api/trabajador/cambiar-password'
      }
    );

    return NextResponse.json({ 
      error: 'Ocurrió un error en el servidor al intentar cambiar la contraseña. Inténtalo de nuevo más tarde.' 
    }, { status: 500 });
  }
}
