const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log('Extrayendo datos de PostgreSQL...');
  
  const trabajadores = await prisma.trabajador.findMany({
    include: {
      establecimiento: {
        include: { microred: true }
      },
      licencias: true
    }
  });

  const licencias = await prisma.licencia.findMany({
    include: {
      trabajador: {
        include: {
          establecimiento: {
            include: { microred: true }
          }
        }
      }
    }
  });

  const output = {
    totalTrabajadores: trabajadores.length,
    totalLicencias: licencias.length,
    trabajadores: trabajadores.map(t => ({
      id: t.id,
      dni: t.dni,
      nombres: t.nombres,
      apellidos: t.apellidos,
      cargo: t.cargo,
      condicionLaboral: t.condicionLaboral,
      establecimientoId: t.establecimientoId,
      establecimiento: t.establecimiento?.nombre || 'NO ASIGNADO',
      microredId: t.establecimiento?.microredId || 0,
      microred: t.establecimiento?.microred?.nombre || 'NO ASIGNADA',
      numLicencias: t.licencias.length,
      diasTotales: t.licencias.reduce((sum, l) => sum + (l.diasOtorgados || 0), 0)
    })),
    licencias: licencias.map(l => ({
      id: l.id,
      trabajadorId: l.trabajadorId,
      dni: l.trabajador.dni,
      apellidosNombres: `${l.trabajador.apellidos}, ${l.trabajador.nombres}`,
      cargo: l.trabajador.cargo,
      condicionLaboral: l.trabajador.condicionLaboral,
      establecimiento: l.trabajador.establecimiento?.nombre || 'NO ASIGNADO',
      microred: l.trabajador.establecimiento?.microred?.nombre || 'NO ASIGNADA',
      tipoLicencia: l.tipoLicencia,
      origen: l.origen,
      numeroCertificado: l.numeroCertificado,
      fechaInicio: l.fechaInicio ? l.fechaInicio.toISOString().split('T')[0] : null,
      fechaFin: l.fechaFin ? l.fechaFin.toISOString().split('T')[0] : null,
      diasOtorgados: l.diasOtorgados,
      anioEjercicio: l.anioEjercicio,
      mesEjercicio: l.mesEjercicio,
      creadoEn: l.creadoEn ? l.creadoEn.toISOString() : null
    }))
  };

  const filePath = path.join(dir, 'dataset.json');
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Dataset exportado con éxito a ${filePath}`);
  console.log(`- ${output.trabajadores.length} trabajadores`);
  console.log(`- ${output.licencias.length} licencias`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
