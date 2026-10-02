const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const t = await prisma.trabajador.findFirst({
    where: {
      nombres: { contains: 'SARA', mode: 'insensitive' },
      apellidos: { contains: 'ROMERO ALANIA', mode: 'insensitive' }
    },
    include: { licencias: true }
  });
  console.log(JSON.stringify(t, null, 2));
}
main().finally(() => prisma.$disconnect());
