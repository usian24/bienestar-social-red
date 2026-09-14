import { PrismaClient, Rol } from '@prisma/client';

// Iniciamos la conexión con la base de datos
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra (Seed) de datos fundacionales...');

  // 1. Crear las Microredes Básicas
  console.log('Agregando Microredes...');
  const microredAmarilis = await prisma.microred.upsert({
    where: { nombre: 'AMARILIS' },
    update: {},
    create: { nombre: 'AMARILIS' },
  });

  const microredValle = await prisma.microred.upsert({
    where: { nombre: 'SANTA MARIA DEL VALLE' },
    update: {},
    create: { nombre: 'SANTA MARIA DEL VALLE' },
  });

  const microredHuanuco = await prisma.microred.upsert({
    where: { nombre: 'HUANUCO' },
    update: {},
    create: { nombre: 'HUANUCO' },
  });

  // 2. Crear el Usuario Super Administrador (Bienestar Social)
  console.log('Agregando Súper Administrador personalizado...');
  const superAdmin = await prisma.usuario.upsert({
    where: { dni: 'admin123' },
    update: {},
    create: {
      dni: 'admin123',
      nombres: 'JHONATAN', // Nombre por defecto, puedes editarlo
      apellidos: 'ADMINISTRADOR',
      passwordHash: '60791781', // Contraseña solicitada
      rol: Rol.SUPER_ADMIN,
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

