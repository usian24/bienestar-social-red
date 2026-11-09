import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { logger } from '@/core/logging/systemLogger';
import { requireStaffAccess } from '@/core/auth/rbac';

export async function GET() {
  try {
    const auth = await requireStaffAccess({
      permisos: ['VER_AUDITORIA'],
      allowMissingMicrored: true,
    });
    if (auth.errorResponse) return auth.errorResponse;

    // 1. Diagnóstico de Base de Datos PostgreSQL
    let dbStatus: 'ONLINE' | 'LENTO' | 'OFFLINE' = 'ONLINE';
    let dbLatenciaMs = 0;
    try {
      const dbInicio = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatenciaMs = Math.round(performance.now() - dbInicio);
      if (dbLatenciaMs > 300) {
        dbStatus = 'LENTO';
      }
    } catch (dbErr) {
      dbStatus = 'OFFLINE';
      logger.error('BD', 'HEALTH_CHECK_FALLO', 'PostgreSQL no responde a la consulta de salud', { error: dbErr });
    }

    // 2. Diagnóstico de IA Gemini
    const apiKey = process.env.GEMINI_API_KEY_SCANNER || process.env.GEMINI_API_KEY_CHAT || process.env.GEMINI_API_KEY;
    const aiConfigurada = Boolean(apiKey && apiKey.length > 10);
    const aiStatus = aiConfigurada ? 'OPERATIVO' : 'MODO_CONTINGENCIA';

    // 3. Telemetría de Memoria y Proceso Node.js
    const memoria = process.memoryUsage();
    const heapUsadoMB = Math.round(memoria.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoria.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoria.rss / 1024 / 1024);
    const uptimeSegundos = Math.floor(process.uptime());

    // 4. Conteo de Errores y Alertas en las últimas 24 horas
    const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [errores24h, advertencias24h, totalMovimientos24h] = await Promise.all([
      prisma.auditoria.count({
        where: {
          fecha: { gte: hace24Horas },
          OR: [
            { accion: { startsWith: 'ERROR' } },
            { accion: { startsWith: 'CRITICO' } }
          ]
        }
      }),
      prisma.auditoria.count({
        where: {
          fecha: { gte: hace24Horas },
          accion: { startsWith: 'ADVERTENCIA' }
        }
      }),
      prisma.auditoria.count({
        where: {
          fecha: { gte: hace24Horas }
        }
      })
    ]);

    // 5. Total de Registros Críticos del Negocio
    const [totalTrabajadores, totalLicencias, totalUsuarios] = await Promise.all([
      prisma.trabajador.count(),
      prisma.licencia.count(),
      prisma.usuario.count()
    ]);

    return NextResponse.json({
      estadoGeneral: dbStatus === 'OFFLINE' ? 'CRITICO' : errores24h > 15 ? 'DEGRADADO' : 'SALUDABLE',
      timestamp: new Date().toISOString(),
      baseDatos: {
        motor: 'PostgreSQL',
        estado: dbStatus,
        latenciaMs: dbLatenciaMs,
        esquema: 'public'
      },
      inteligenciaArtificial: {
        servicio: 'Google Gemini',
        estado: aiStatus,
        apiKeyPresente: aiConfigurada,
        modeloRecomendado: 'gemini-2.0-flash'
      },
      servidor: {
        entorno: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        plataforma: process.platform,
        uptimeSegundos,
        memoria: {
          heapUsadoMB,
          heapTotalMB,
          rssMB,
          porcentajeUso: Math.round((heapUsadoMB / heapTotalMB) * 100)
        }
      },
      estadisticas24h: {
        errores: errores24h,
        advertencias: advertencias24h,
        totalEventos: totalMovimientos24h
      },
      volumenDatos: {
        trabajadores: totalTrabajadores,
        licencias: totalLicencias,
        usuarios: totalUsuarios
      }
    });

  } catch (error) {
    logger.error('SISTEMA', 'SALUD_ENDPOINT_ERROR', 'Error al consultar métricas del sistema', { error });
    return NextResponse.json({ error: 'Error al obtener estado de salud' }, { status: 500 });
  }
}

/**
 * Permite registrar un evento de prueba para verificar que el logger está midiendo
 */
export async function POST(request: Request) {
  try {
    const auth = await requireStaffAccess({ requireSuperAdmin: true });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const body = await request.json().catch(() => ({}));
    const tipo = body.tipo || 'PRUEBA';

    if (tipo === 'ERROR_TEST') {
      await logger.error('SISTEMA', 'SIMULACION_ERROR', 'Simulación de prueba generada por el Administrador para verificar observabilidad', {
        usuarioId: ctx.userId,
        ruta: '/api/sistema/salud',
        metadata: {
          nota: 'Este es un error simulado para validar que la bitácora de fallas está capturando eventos en tiempo real.',
          navegador: request.headers.get('user-agent') || 'Desconocido'
        }
      });
      return NextResponse.json({ ok: true, mensaje: 'Error de prueba registrado con éxito en los logs del sistema.' });
    }

    await logger.info('SISTEMA', 'PING_DIAGNOSTICO', 'Prueba de pulso y diagnóstico completada exitosamente.', {
      usuarioId: ctx.userId,
      ruta: '/api/sistema/salud'
    });

    return NextResponse.json({ ok: true, mensaje: 'Diagnóstico de pulso registrado exitosamente.' });
  } catch (err) {
    return NextResponse.json({ error: 'Fallo al ejecutar prueba' }, { status: 500 });
  }
}
