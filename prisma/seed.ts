import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Iniciamos la conexión con la base de datos
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra (Seed) de datos fundacionales...');

  // 1. Crear las Microredes
  console.log('Agregando Microredes...');
  const microredes = [
    'ACOMAYO',
    'AMARILIS',
    'APARICIO POMARES',
    'CHURUBAMBA',
    'HUANCAPALLAC',
    'HUANUCO',
    'MARGOS',
    'PILLAO',
    'PILLCO MARCA',
    'SAN FCO. DE CAYRAN',
    'SAN PEDRO DE CHAULAN',
    'SANTA MARIA DEL VALLE',
    'YACUS',
    'YARUMAYO'
  ];

  for (const nombre of microredes) {
    await prisma.microred.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  // 2. Crear Roles Fundacionales
  console.log('Agregando Roles Base (Plantillas)...');
  const superAdminRol = await prisma.rol.upsert({
    where: { nombre: 'SUPER_ADMIN' },
    update: {},
    create: { 
      nombre: 'SUPER_ADMIN', 
      descripcion: 'Control total del sistema',
      permisos: ['VER_TRABAJADORES', 'EDITAR_TRABAJADORES', 'VER_LICENCIAS', 'GESTIONAR_LICENCIAS', 'SUBIR_ARCHIVOS', 'VER_REPORTES', 'VER_ARCHIVO_HISTORICO', 'ADMINISTRAR_USUARIOS'],
      esFijo: true 
    }
  });

  await prisma.rol.upsert({
    where: { nombre: 'SEDE_ADMIN' },
    update: {},
    create: { 
      nombre: 'SEDE_ADMIN', 
      descripcion: 'Administrador de Jefatura / Bienestar Social',
      permisos: ['VER_TRABAJADORES', 'VER_LICENCIAS', 'GESTIONAR_LICENCIAS', 'SUBIR_ARCHIVOS', 'VER_REPORTES'],
      esFijo: true 
    }
  });

  await prisma.rol.upsert({
    where: { nombre: 'VISUALIZADOR' },
    update: {},
    create: { 
      nombre: 'VISUALIZADOR', 
      descripcion: 'Acceso de solo lectura / Auditor',
      permisos: ['VER_TRABAJADORES', 'VER_LICENCIAS', 'VER_REPORTES'],
      esFijo: true 
    }
  });

  await prisma.rol.upsert({
    where: { nombre: 'TRABAJADOR' },
    update: {},
    create: { 
      nombre: 'TRABAJADOR', 
      descripcion: 'Trabajador general (acceso personal)',
      permisos: [],
      esFijo: true 
    }
  });

  // 3. Crear el Usuario Super Administrador
  console.log('Agregando Súper Administrador personalizado...');
  const passwordHash = await bcrypt.hash('60791781', 10);
  
  const superAdmin = await prisma.usuario.upsert({
    where: { dni: 'admin123' },
    update: {
      passwordHash: passwordHash,
      rolId: superAdminRol.id
    },
    create: {
      dni: 'admin123',
      nombres: 'JHONATAN', 
      apellidos: 'ADMINISTRADOR',
      passwordHash: passwordHash, 
      rolId: superAdminRol.id,
    },
  });

  console.log('✅ ¡Seed completado con éxito!');
  console.log('Súper Admin creado:', superAdmin.nombres);
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
