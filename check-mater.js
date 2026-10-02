const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const lic = await prisma.licencia.findMany({
    where: {
      OR: [
        { numeroCertificado: { contains: 'MATER', mode: 'insensitive' } },
        { numeroCertificado: { contains: 'PATER', mode: 'insensitive' } }
      ]
    }
  });
  console.log(JSON.stringify(lic, null, 2));
}
main().finally(() => prisma.$disconnect());
