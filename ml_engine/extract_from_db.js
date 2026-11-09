const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log('Extrayendo datos de PostgreSQL...');

  const [trabajadores, licencias, establecimientos] = await Promise.all([
    prisma.trabajador.findMany({
      include: {
        establecimiento: {
          include: { microred: true }
        },
        licencias: true
      }
    }),
    prisma.licencia.findMany({
      include: {
        trabajador: {
          include: {
            establecimiento: {
              include: { microred: true }
            }
          }
        }
      }
    }),
    prisma.establecimiento.findMany({
      include: {
        microred: true,
        _count: { select: { trabajadores: true } }
      }
    })
  ]);

  const output = {
    metadata: {
      extraidoEn: new Date().toISOString(),
      totalEstablecimientos: establecimientos.length,
    },
    totalEstablecimientos: establecimientos.length,
    totalTrabajadores: trabajadores.length,
    totalLicencias: licencias.length,
    establecimientos: establecimientos.map(e => ({
      id: e.id,
      establecimiento: e.nombre,
      microredId: e.microredId,
      microred: e.microred?.nombre || 'NO ASIGNADA',
      totalPersonal: e._count?.trabajadores || 0,
    })),
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
      numLicencias: t.licencias.filter(l => l.origen !== 'PARTICULAR_PERDIDO').length,
      diasTotales: t.licencias
        .filter(l => l.origen !== 'PARTICULAR_PERDIDO')
        .reduce((sum, l) => sum + (l.diasOtorgados || 0), 0)
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
  console.log(`- ${output.totalEstablecimientos} establecimientos`);
  console.log(`- ${output.trabajadores.length} trabajadores`);
  console.log(`- ${output.licencias.length} licencias`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
