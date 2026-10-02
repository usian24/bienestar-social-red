const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const lic = await prisma.licencia.findFirst({
    where: { numeroCertificado: 'MEDICO OPERACION' },
    include: { trabajador: true }
  });
  console.log(JSON.stringify(lic, null, 2));
}
main().finally(() => prisma.$disconnect());
