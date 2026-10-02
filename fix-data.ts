import { PrismaClient, TipoLicencia } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const licencias = await prisma.licencia.findMany({
    where: { tipoLicencia: TipoLicencia.ENFERMEDAD_COMUN }
  });

  let materCount = 0;
  let paterCount = 0;
  let accidentCount = 0;

  for (const lic of licencias) {
    const cert = lic.numeroCertificado.toLowerCase();
    let newTipo: TipoLicencia | null = null;
    
    if (cert.includes('maternidad')) {
      newTipo = TipoLicencia.MATERNIDAD;
      materCount++;
    } else if (cert.includes('paternidad')) {
      newTipo = TipoLicencia.PATERNIDAD;
      paterCount++;
    } else if (cert.includes('accidente') || cert.includes('accid')) {
      newTipo = TipoLicencia.ACCIDENTE_COMUN;
      accidentCount++;
    }
    
    if (newTipo) {
      await prisma.licencia.update({
        where: { id: lic.id },
        data: { tipoLicencia: newTipo }
      });
    }
  }

  console.log(`Corregidos: ${materCount} Maternidad, ${paterCount} Paternidad, ${accidentCount} Accidente Común`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
