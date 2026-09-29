const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function run() {
  const data = [
    {
      dni: "42503731",
      nombres: "LIMBER",
      apellidos: "ALARCON MEZA",
      cargo: "TECNICO EN LABORATORIO",
      microred: "APARICIO POMARES",
      establecimiento: "C.S. LAS MORAS"
    },
    {
      dni: "76600035",
      nombres: "NILDA",
      apellidos: "ALBORNOZ CRISTOBAL",
      cargo: "COMUNICADOR/A SOCIAL",
      microred: "HUANUCO",
      establecimiento: "SEDE RED SALUD HUANUCO"
    },
    {
      dni: "72146851",
      nombres: "FLORICEL BELINDA",
      apellidos: "ALBORNOZ LEANDRO",
      cargo: "ENFERMERA(O)",
      microred: "AMARILIS",
      establecimiento: "C.S AMARILIS"
    },
    {
      dni: "44680888",
      nombres: "LUZ YANINA",
      apellidos: "ALBORNOZ MALLQUI",
      cargo: "TECNICO EN LABORATORIO",
      microred: "AMARILIS",
      establecimiento: "C.S. PERU COREA"
    },
    {
      dni: "41306156",
      nombres: "PAUL ENRRIQUE",
      apellidos: "ALGUAYO ROJAS",
      cargo: "TECNICO EN SEGURIDAD",
      microred: "PILLCO MARCA",
      establecimiento: "P.S. POTRACANCHA"
    }
  ];

  console.log("Creando trabajadores de prueba...");

  // Asegurar Rol Trabajador
  const rolTrabajador = await prisma.rol.upsert({
    where: { nombre: 'TRABAJADOR' },
    update: {},
    create: { nombre: 'TRABAJADOR', descripcion: 'Trabajador general (acceso personal)', permisos: [], esFijo: true }
  });

  for (const item of data) {
    // 1. Asegurar Microred
    const mr = await prisma.microred.upsert({
      where: { nombre: item.microred },
      update: {},
      create: { nombre: item.microred }
    });

    // 2. Asegurar Establecimiento
    const est = await prisma.establecimiento.findFirst({ where: { nombre: item.establecimiento, microredId: mr.id } }) ||
                await prisma.establecimiento.create({
                  data: { nombre: item.establecimiento, microredId: mr.id }
                });

    // 3. Crear Trabajador
    const trabajador = await prisma.trabajador.upsert({
      where: { dni: item.dni },
      update: {
        nombres: item.nombres,
        apellidos: item.apellidos,
        cargo: item.cargo,
        condicionLaboral: "CAS",
        establecimientoId: est.id
      },
      create: {
        dni: item.dni,
        nombres: item.nombres,
        apellidos: item.apellidos,
        cargo: item.cargo,
        condicionLaboral: "CAS",
        establecimientoId: est.id
      }
    });

    // 4. Crear Usuario
    const pw = await bcrypt.hash(item.dni, 10);
    await prisma.usuario.upsert({
      where: { dni: item.dni },
      update: { passwordHash: pw, rolId: rolTrabajador.id },
      create: {
        dni: item.dni,
        nombres: item.nombres,
        apellidos: item.apellidos,
        passwordHash: pw,
        rolId: rolTrabajador.id
      }
    });

    // 5. Crear Licencia de prueba
    const hasLic = await prisma.licencia.findFirst({ where: { trabajadorId: trabajador.id }});
    if (!hasLic) {
      await prisma.licencia.create({
        data: {
          trabajadorId: trabajador.id,
          tipoLicencia: 'ENFERMEDAD_COMUN',
          origen: 'ESSALUD_CITT',
          numeroCertificado: `A-${Math.floor(Math.random() * 1000000)}`,
          fechaInicio: new Date(2026, 8, Math.floor(Math.random() * 10) + 1),
          fechaFin: new Date(2026, 8, Math.floor(Math.random() * 10) + 15),
          diasOtorgados: Math.floor(Math.random() * 15) + 1,
          anioEjercicio: 2026,
          mesEjercicio: 9,
        }
      });
    }

    console.log(`Creado: ${item.dni} - ${item.nombres}`);
  }

  console.log("¡Trabajadores creados con éxito!");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
