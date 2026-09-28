import { PrismaClient } from '@prisma/client';

// Iniciamos la conexión con la base de datos
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra (Seed) de datos fundacionales...');

  // 1. Crear Plantillas de Roles Dinámicos
  console.log('Agregando Roles...');
  const roles = [
    { nombre: 'SUPER_ADMIN', descripcion: 'Control total del sistema', permisos: [], esFijo: true },
    { nombre: 'SEDE_ADMIN', descripcion: 'Administrador de una Microred', permisos: ['VER_TRABAJADORES', 'VER_LICENCIAS', 'GESTIONAR_LICENCIAS', 'SUBIR_ARCHIVOS', 'VER_REPORTES'], esFijo: true },
    { nombre: 'VISUALIZADOR', descripcion: 'Solo lectura (Auditores)', permisos: ['VER_TRABAJADORES', 'VER_LICENCIAS', 'VER_REPORTES', 'VER_ARCHIVO_HISTORICO'], esFijo: true },
    { nombre: 'TRABAJADOR', descripcion: 'Trabajador general del hospital', permisos: [], esFijo: true }
  ];

  for (const r of roles) {
    await prisma.rol.upsert({
      where: { nombre: r.nombre },
      update: {},
      create: r
    });
  }

  // 2. Crear las Microredes Básicas
  console.log('Agregando Microredes...');
  await prisma.microred.upsert({ where: { nombre: 'AMARILIS' }, update: {}, create: { nombre: 'AMARILIS' } });
  await prisma.microred.upsert({ where: { nombre: 'SANTA MARIA DEL VALLE' }, update: {}, create: { nombre: 'SANTA MARIA DEL VALLE' } });
  await prisma.microred.upsert({ where: { nombre: 'HUANUCO' }, update: {}, create: { nombre: 'HUANUCO' } });

  // 3. Crear el Usuario Super Administrador
  console.log('Agregando Súper Administrador personalizado...');
  const superAdminRol = await prisma.rol.findUnique({ where: { nombre: 'SUPER_ADMIN' } });
  
  if (superAdminRol) {
    const superAdmin = await prisma.usuario.upsert({
      where: { dni: 'admin123' },
      update: {},
      create: {
        dni: 'admin123',
        nombres: 'JHONATAN', 
        apellidos: 'ADMINISTRADOR',
        passwordHash: '$2b$10$VrpUIFyOfv4muIqAXEN76.W.Q3/NcIm4ryBOCh7D7X8bUau6nwAgC', // Contraseña '60791781' hasheada
        rolId: superAdminRol.id, // NUEVA ARQUITECTURA: Vinculación relacional
      },
    });
    console.log('✅ ¡Seed completado con éxito!');
    console.log('Súper Admin creado:', superAdmin.nombres);
  }
}

// Ejecutar la función y cerrar la conexión al terminar
main()
  .catch((e) => {
    console.error('❌ Error durante el Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
