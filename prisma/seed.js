const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de base de datos...');

  // 1. Crear Plantillas de Roles
  const roles = [
    {
      nombre: 'SUPER_ADMIN',
      descripcion: 'Control total del sistema',
      permisos: [], // El super admin no necesita permisos listados, el código lo asume
      esFijo: true
    },
    {
      nombre: 'SEDE_ADMIN',
      descripcion: 'Administrador de una Microred',
      permisos: ['VER_TRABAJADORES', 'VER_LICENCIAS', 'GESTIONAR_LICENCIAS', 'SUBIR_ARCHIVOS', 'VER_REPORTES'],
      esFijo: true
    },
    {
      nombre: 'VISUALIZADOR',
      descripcion: 'Solo lectura (Auditores)',
      permisos: ['VER_TRABAJADORES', 'VER_LICENCIAS', 'VER_REPORTES', 'VER_ARCHIVO_HISTORICO'],
      esFijo: true
    },
    {
      nombre: 'TRABAJADOR',
      descripcion: 'Trabajador general del hospital (Panel propio)',
      permisos: [], // No ve los modulos de admin, su dashboard es diferente
      esFijo: true
    }
  ];

  for (const r of roles) {
    await prisma.rol.upsert({
      where: { nombre: r.nombre },
      update: {},
      create: r
    });
  }
  console.log('Roles creados.');

  // 2. Crear Super Admin
  const superAdminRole = await prisma.rol.findUnique({ where: { nombre: 'SUPER_ADMIN' } });
  
  if (superAdminRole) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    await prisma.usuario.upsert({
      where: { dni: 'admin123' },
      update: {},
      create: {
        dni: 'admin123',
        nombres: 'Super',
        apellidos: 'Administrador',
        passwordHash,
        rolId: superAdminRole.id
      }
    });
    console.log('Usuario Super Admin (admin123) creado.');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
