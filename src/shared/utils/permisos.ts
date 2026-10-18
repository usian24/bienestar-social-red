export const PERMISOS = {
  // RECURSOS HUMANOS
  VER_TRABAJADORES: 'VER_TRABAJADORES',
  EDITAR_TRABAJADORES: 'EDITAR_TRABAJADORES',
  EXPORTAR_EXCEL_PERSONAL: 'EXPORTAR_EXCEL_PERSONAL',
  
  // TRAMITES ESSALUD
  VER_LICENCIAS: 'VER_LICENCIAS',
  GESTIONAR_LICENCIAS: 'GESTIONAR_LICENCIAS',
  SUBIR_CITT: 'SUBIR_CITT',
  SUBIR_ARCHIVOS: 'SUBIR_ARCHIVOS',
  EXPORTAR_PDF_TRAMITE: 'EXPORTAR_PDF_TRAMITE',

  // ADMINISTRACION
  ADMINISTRAR_USUARIOS: 'ADMINISTRAR_USUARIOS',
  VER_AUDITORIA: 'VER_AUDITORIA',
  GESTIONAR_ESTABLECIMIENTOS: 'GESTIONAR_ESTABLECIMIENTOS',

  // ESTADISTICAS
  VER_REPORTES: 'VER_REPORTES',
  EXPORTAR_EXCEL_MASIVO: 'EXPORTAR_EXCEL_MASIVO',

  // DOCUMENTACION 
  VER_ARCHIVO_HISTORICO: 'VER_ARCHIVO_HISTORICO',
  ORDENAR_DOCUMENTOS: 'ORDENAR_DOCUMENTOS',
  
  // SISTEMA (DEVELOPER)
  VER_LOGS: 'VER_LOGS',

  // INTELIGENCIA ARTIFICIAL (BIENESTARBOT)
  USAR_CHATBOT: 'USAR_CHATBOT',
} as const;

export type Permiso = keyof typeof PERMISOS;

export const PERMISOS_DESCRIPCION: Record<Permiso, { titulo: string; descripcion: string }> = {
  // Recursos Humanos
  VER_TRABAJADORES: { titulo: 'Ver Personal', descripcion: 'Permite visualizar el directorio de personal activo.' },
  EDITAR_TRABAJADORES: { titulo: 'Gestionar Personal', descripcion: 'Permite agregar nuevos trabajadores o editar sus datos.' },
  EXPORTAR_EXCEL_PERSONAL: { titulo: 'Extraer Excel Personal', descripcion: 'Permite descargar el listado de personal en formato Excel.' },
  
  // Trámites
  VER_LICENCIAS: { titulo: 'Ver Trámites', descripcion: 'Permite visualizar los expedientes de Salud, Maternidad y Paternidad.' },
  GESTIONAR_LICENCIAS: { titulo: 'Gestionar Trámites', descripcion: 'Permite registrar, editar y anular expedientes.' },
  SUBIR_CITT: { titulo: 'Subir CITT', descripcion: 'Permite registrar descansos médicos en los expedientes.' },
  SUBIR_ARCHIVOS: { titulo: 'Adjuntar Sustentos', descripcion: 'Permite subir evidencias o PDFs a los trámites.' },
  EXPORTAR_PDF_TRAMITE: { titulo: 'Extraer PDF Trámite', descripcion: 'Permite descargar las resoluciones o resúmenes del expediente en PDF.' },

  // Administración
  ADMINISTRAR_USUARIOS: { titulo: 'Administrar Usuarios', descripcion: 'Permite gestionar las cuentas de acceso al sistema.' },
  VER_AUDITORIA: { titulo: 'Ver Auditoría', descripcion: 'Permite revisar el registro de cambios (quién modificó qué).' },
  GESTIONAR_ESTABLECIMIENTOS: { titulo: 'Gestionar Microredes', descripcion: 'Permite editar la lista de postas y establecimientos.' },

  // Estadísticas
  VER_REPORTES: { titulo: 'Ver Reportes', descripcion: 'Permite acceder a los tableros estadísticos.' },
  EXPORTAR_EXCEL_MASIVO: { titulo: 'Extraer Excel Masivo', descripcion: 'Permite descargar la data completa del sistema en Excel.' },

  // Documentación
  VER_ARCHIVO_HISTORICO: { titulo: 'Ver Histórico', descripcion: 'Permite acceder al repositorio de documentación pasada.' },
  ORDENAR_DOCUMENTOS: { titulo: 'Ordenar Documentos', descripcion: 'Permite organizar y clasificar carpetas en el archivo.' },
  
  // Sistema
  VER_LOGS: { titulo: 'Consola de Desarrollador', descripcion: 'Permite acceder a los logs técnicos del sistema en tiempo real.' },

  // Inteligencia Artificial
  USAR_CHATBOT: { titulo: 'Asistente IA (BienestarBot)', descripcion: 'Permite interactuar con el chatbot asistente para consultar CITTs, subsidios y alertas.' },
};

export function tienePermiso(usuarioPermisos: string[], rol: string, permiso: Permiso): boolean {
  if (rol === 'SUPER_ADMIN') return true;
  return usuarioPermisos.includes(permiso);
}

export function puedeUsarChatbot(rol?: string, usuarioPermisos: string[] = []): boolean {
  if (!rol) return false;
  // SUPER_ADMIN y TRABAJADOR tienen acceso por defecto
  if (rol === 'SUPER_ADMIN' || rol === 'TRABAJADOR') return true;
  // Cualquier otro rol o usuario requiere que el Super Admin le haya concedido el permiso USAR_CHATBOT
  return usuarioPermisos.includes(PERMISOS.USAR_CHATBOT);
}
