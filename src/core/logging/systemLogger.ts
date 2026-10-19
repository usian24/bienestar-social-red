import prisma from '@/core/db/prisma';

export type NivelLog = 'ERROR' | 'CRITICO' | 'ADVERTENCIA' | 'INFO' | 'AUDITORIA';

export type ModuloLog = 
  | 'CHATBOT' 
  | 'EXCEL_IMPORT' 
  | 'LICENCIAS' 
  | 'USUARIOS' 
  | 'ROLES' 
  | 'AUTH' 
  | 'SISTEMA' 
  | 'BD'
  | 'REPORTES_PDF';

export interface MetadataLog {
  ruta?: string;
  metodo?: string;
  statusCode?: number;
  duracionMs?: number;
  error?: any;
  stack?: string;
  ip?: string;
  usuarioAgente?: string;
  [key: string]: any;
}

interface RegistroLogParametros {
  nivel: NivelLog;
  modulo: ModuloLog;
  accion: string;
  mensaje: string;
  usuarioId?: string | null;
  entidadId?: string | null;
  metadata?: MetadataLog;
}

/**
 * Registra un log en la base de datos de manera resiliente.
 * Si la base de datos falla o no responde, no rompe la petición del usuario.
 */
async function registrarLog(params: RegistroLogParametros): Promise<void> {
  const { nivel, modulo, accion, mensaje, usuarioId, entidadId, metadata } = params;

  // Formato enriquecido para el campo 'detalles'
  const payloadDetalles: Record<string, any> = {
    tipoLog: nivel === 'AUDITORIA' ? 'AUDITORIA' : 'SISTEMA',
    nivel,
    mensaje,
    timestamp: new Date().toISOString(),
    ...(metadata || {})
  };

  // Si hay un objeto Error nativo, extraer mensaje y stack trace de forma limpia
  if (metadata?.error) {
    if (metadata.error instanceof Error) {
      payloadDetalles.mensajeError = metadata.error.message;
      payloadDetalles.stack = metadata.error.stack;
    } else if (typeof metadata.error === 'object') {
      try {
        payloadDetalles.mensajeError = JSON.stringify(metadata.error);
      } catch {
        payloadDetalles.mensajeError = String(metadata.error);
      }
    } else {
      payloadDetalles.mensajeError = String(metadata.error);
    }
  }

  // Log formateado en consola para desarrollo
  const prefijoConsola = `[${nivel}][${modulo}] ${accion}: ${mensaje}`;
  if (nivel === 'ERROR' || nivel === 'CRITICO') {
    console.error(`🚨 ${prefijoConsola}`, metadata?.error || '');
  } else if (nivel === 'ADVERTENCIA') {
    console.warn(`⚠️ ${prefijoConsola}`);
  } else {
    console.log(`ℹ️ ${prefijoConsola}`);
  }

  try {
    await prisma.auditoria.create({
      data: {
        usuarioId: usuarioId || null,
        accion: nivel === 'AUDITORIA' ? accion : `${nivel}_${accion}`,
        modulo,
        entidadId: entidadId || null,
        detalles: JSON.stringify(payloadDetalles)
      }
    });
  } catch (dbError) {
    // Si falla la BD, registramos en consola pero no permitimos que tumbe la app
    console.error('❌ Error crítico al persistir log en la base de datos:', dbError);
  }
}

export const logger = {
  /**
   * Registra un error de ejecución o fallo de API (500, catch, etc.)
   */
  error: (modulo: ModuloLog, accion: string, mensaje: string, opciones?: { error?: any; usuarioId?: string | null; ruta?: string; metadata?: MetadataLog }) => {
    return registrarLog({
      nivel: 'ERROR',
      modulo,
      accion,
      mensaje,
      usuarioId: opciones?.usuarioId,
      metadata: {
        ruta: opciones?.ruta,
        error: opciones?.error,
        ...(opciones?.metadata || {})
      }
    });
  },

  /**
   * Registra una falla crítica que afecta la operatividad del sistema
   */
  critico: (modulo: ModuloLog, accion: string, mensaje: string, opciones?: { error?: any; usuarioId?: string | null; ruta?: string; metadata?: MetadataLog }) => {
    return registrarLog({
      nivel: 'CRITICO',
      modulo,
      accion,
      mensaje,
      usuarioId: opciones?.usuarioId,
      metadata: {
        ruta: opciones?.ruta,
        error: opciones?.error,
        ...(opciones?.metadata || {})
      }
    });
  },

  /**
   * Registra una advertencia (fallback activado, filas de excel rechazadas, etc.)
   */
  advertencia: (modulo: ModuloLog, accion: string, mensaje: string, opciones?: { usuarioId?: string | null; ruta?: string; metadata?: MetadataLog }) => {
    return registrarLog({
      nivel: 'ADVERTENCIA',
      modulo,
      accion,
      mensaje,
      usuarioId: opciones?.usuarioId,
      metadata: {
        ruta: opciones?.ruta,
        ...(opciones?.metadata || {})
      }
    });
  },

  /**
   * Registra un evento informativo relevante del sistema
   */
  info: (modulo: ModuloLog, accion: string, mensaje: string, opciones?: { usuarioId?: string | null; ruta?: string; metadata?: MetadataLog }) => {
    return registrarLog({
      nivel: 'INFO',
      modulo,
      accion,
      mensaje,
      usuarioId: opciones?.usuarioId,
      metadata: {
        ruta: opciones?.ruta,
        ...(opciones?.metadata || {})
      }
    });
  },

  /**
   * Registra una acción de auditoría de negocio tradicional (CRUD de usuarios, licencias, etc.)
   */
  auditoria: (modulo: ModuloLog, accion: 'CREAR' | 'EDITAR' | 'ELIMINAR' | string, mensaje: string, opciones?: { usuarioId?: string | null; entidadId?: string | null; detalles?: any }) => {
    return registrarLog({
      nivel: 'AUDITORIA',
      modulo,
      accion,
      mensaje,
      usuarioId: opciones?.usuarioId,
      entidadId: opciones?.entidadId,
      metadata: opciones?.detalles ? { datos: opciones.detalles } : undefined
    });
  }
};

export default logger;
