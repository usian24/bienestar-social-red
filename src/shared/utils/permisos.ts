export const PERMISOS = {
  VER_TRABAJADORES: 'VER_TRABAJADORES',
  EDITAR_TRABAJADORES: 'EDITAR_TRABAJADORES', // Agregar/modificar personal
  VER_LICENCIAS: 'VER_LICENCIAS',
  GESTIONAR_LICENCIAS: 'GESTIONAR_LICENCIAS', // Crear, editar, eliminar CITTs
  SUBIR_ARCHIVOS: 'SUBIR_ARCHIVOS', // Poder adjuntar PDFs
  VER_REPORTES: 'VER_REPORTES',
  VER_ARCHIVO_HISTORICO: 'VER_ARCHIVO_HISTORICO',
  ADMINISTRAR_USUARIOS: 'ADMINISTRAR_USUARIOS',
} as const;

export type Permiso = keyof typeof PERMISOS;

export const PERMISOS_DESCRIPCION: Record<Permiso, { titulo: string; descripcion: string }> = {
  VER_TRABAJADORES: {
    titulo: 'Ver Trabajadores',
    descripcion: 'Permite buscar y visualizar la información del personal.'
  },
  EDITAR_TRABAJADORES: {
    titulo: 'Gestionar Trabajadores',
    descripcion: 'Permite agregar nuevos trabajadores o editar sus datos.'
  },
  VER_LICENCIAS: {
    titulo: 'Ver Trámites Essalud',
    descripcion: 'Permite visualizar el listado de CITTs registrados.'
  },
  GESTIONAR_LICENCIAS: {
    titulo: 'Gestionar Trámites',
    descripcion: 'Permite registrar, editar y dar por perdidos los CITTs.'
  },
  SUBIR_ARCHIVOS: {
    titulo: 'Subir Archivos',
    descripcion: 'Permite adjuntar los PDFs y evidencias a los trámites.'
  },
  VER_REPORTES: {
    titulo: 'Ver Reportes',
    descripcion: 'Permite acceder al módulo estadístico y descargar excels.'
  },
  VER_ARCHIVO_HISTORICO: {
    titulo: 'Ver Documentación',
    descripcion: 'Permite acceder al archivo histórico de la red.'
  },
  ADMINISTRAR_USUARIOS: {
    titulo: 'Administrar Usuarios',
    descripcion: 'Permite crear cuentas, suspenderlas y asignar permisos (Cuidado).'
  }
};

/**
 * Verifica si un usuario tiene un permiso específico o si es SUPER_ADMIN
 */
export function tienePermiso(usuarioPermisos: string[], rol: string, permiso: Permiso): boolean {
  if (rol === 'SUPER_ADMIN') return true;
  return usuarioPermisos.includes(permiso);
}
