import { PrismaClient, Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Super Admin...');
  
  const superAdminDni = 'admin123';
  const superAdminPassword = await bcrypt.hash('60791781', 10);
  
  const admin = await prisma.usuario.upsert({
    where: { dni: superAdminDni },
    update: {
      passwordHash: superAdminPassword,
      rol: {
        connectOrCreate: {
          where: { nombre: 'SUPER_ADMIN' },
          create: { nombre: 'SUPER_ADMIN', esFijo: true, permisos: ['SUPER_ADMIN'] }
        }
      },
    },
    create: {
      dni: superAdminDni,
      nombres: 'Super Administrador',
      apellidos: 'Bienestar Social',
      passwordHash: superAdminPassword,
      rol: {
        connectOrCreate: {
          where: { nombre: 'SUPER_ADMIN' },
          create: { nombre: 'SUPER_ADMIN', esFijo: true, permisos: ['SUPER_ADMIN'] }
        }
      },
    }
  });

  console.log('Super Admin garantizado en la BD:', admin.dni);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

