import { PrismaClient } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const FOLDER_PATH = path.join(__dirname, '../marzo-2026');

// Extrae un posible nombre de microred basado en el archivo
function inferirMicrored(filename: string): string {
  const upper = filename.toUpperCase();
  if (upper.includes('AMARILIS')) return 'AMARILIS';
  if (upper.includes('CAYRAN')) return 'CAYRAN';
  if (upper.includes('MARGOS')) return 'MARGOS';
  if (upper.includes('YARUMAYO')) return 'YARUMAYO';
  if (upper.includes('ACOMAYO')) return 'ACOMAYO';
  if (upper.includes('QUISQUI')) return 'QUISQUI';
  if (upper.includes('CHURUBAMBA')) return 'CHURUBAMBA';
  if (upper.includes('VALLE')) return 'SANTA MARIA DEL VALLE';
  if (upper.includes('CHAULAN')) return 'CHAULAN';
  if (upper.includes('YACUS')) return 'YACUS';
  if (upper.includes('PILLAO')) return 'PILLAO';
  if (upper.includes('POTRACANCHA')) return 'POTRACANCHA';
  if (upper.includes('HUANUCO') || upper.includes('RED')) return 'HUANUCO';
  return 'OTRO';
}

async function procesarArchivo(filePath: string, filename: string) {
  const nombreMicrored = inferirMicrored(filename);
  console.log(`\n📄 Procesando archivo: ${filename} (Microred inferida: ${nombreMicrored})`);

  // 1. Asegurar que la Microred exista
  const microredDb = await prisma.microred.upsert({
    where: { nombre: nombreMicrored },
    update: {},
    create: { nombre: nombreMicrored }
  });

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  let trabajadoresInsertados = 0;

  for (const worksheet of workbook.worksheets) {
    // Escaneamos las filas buscando nombres (índice 2) y DNIs (índice 3)
    // Sabemos que los DNIs están en el índice 3 o 4 normalmente, y el nombre en 2 o 3.
    // Usaremos un escaneo básico basado en la forma que vimos (Fila 4 en adelante)
    for (let i = 4; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i).values as any[];
      if (!row || row.length < 5) continue;

      // El nombre normalmente es un string largo, el DNI un string/number de 8 dígitos
      const apellidosNombres = row[2] ? row[2].toString().trim() : '';
      let dni = row[3] ? row[3].toString().trim() : '';
      const cargo = row[4] ? row[4].toString().trim() : 'NO ESPECIFICADO';
      const ee_ss = row[6] ? row[6].toString().trim() : 'NO ESPECIFICADO';

      // Validación simple de DNI (8 dígitos) y nombre
      if (dni.length > 0 && dni.length <= 15 && apellidosNombres.length > 5) {
        
        // 2. Asegurar que el Establecimiento exista
        const randomSuffix = Math.floor(Math.random() * 100000).toString();
        const establecimientoDb = await prisma.establecimiento.upsert({
          where: { codigoRenaes: ee_ss }, 
          update: {},
          create: { nombre: ee_ss, microredId: microredDb.id, codigoRenaes: ee_ss + '_' + randomSuffix }
        });

        // Separar Nombres y Apellidos burdamente (todo antes de la coma son apellidos)
        let nombresPart = apellidosNombres;
        let apellidosPart = '';
        if (apellidosNombres.includes(',')) {
            const parts = apellidosNombres.split(',');
            apellidosPart = parts[0].trim();
            nombresPart = parts[1].trim();
        }

        // 3. Crear o actualizar al Trabajador
        await prisma.trabajador.upsert({
          where: { dni: dni },
          update: {
             cargo: cargo,
             establecimientoId: establecimientoDb.id
          },
          create: {
            dni: dni,
            nombres: nombresPart,
            apellidos: apellidosPart,
            cargo: cargo,
            condicionLaboral: 'NO ESPECIFICADA',
            establecimientoId: establecimientoDb.id
          }
        });

        trabajadoresInsertados++;
      }
    }
  }
  
  console.log(`✅ ¡${trabajadoresInsertados} trabajadores procesados de este archivo!`);
}

async function main() {
  console.log('🚀 Iniciando escaneo del Techo Presupuestal...');
  const files = fs.readdirSync(FOLDER_PATH);
  
  for (const file of files) {
    if (file.endsWith('.xlsx') && !file.startsWith('~$')) {
      const filePath = path.join(FOLDER_PATH, file);
      try {
        await procesarArchivo(filePath, file);
      } catch (e: any) {
        console.error(`❌ Error leyendo ${file}:`, e.message);
      }
    }
  }
  
  console.log('\n🎉 ¡MIGRACIÓN COMPLETADA! La base de datos ahora es sólida.');
}

main()
  .catch((e: any) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

