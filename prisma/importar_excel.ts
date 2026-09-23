import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando importación masiva...');

  // 1. Limpiar base de datos (excepto Usuarios)
  console.log('Limpiando base de datos (Auditorias, Licencias, Trabajadores, Establecimientos, Microredes)...');
  await prisma.auditoria.deleteMany({});
  await prisma.licencia.deleteMany({});
  await prisma.trabajador.deleteMany({});
  
  // Desvincular usuarios temporalmente
  await prisma.usuario.updateMany({ data: { microredId: null } });
  
  await prisma.establecimiento.deleteMany({});
  await prisma.microred.deleteMany({});
  console.log('Base de datos limpiada correctamente.');

  // 2. Extraer datos de los Excels
  const procesarArchivo = (filename: string, condicionLaboral: string) => {
    const workbook = xlsx.readFile(filename);
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const records: any[] = [];
    
    data.forEach((row: any) => {
      if (!row['LIBELE'] || !row['CODEST'] || !row['PROGSUB']) return;
      
      const mrParts = row['PROGSUB'].toString().split(' - ');
      const mrName = mrParts.length > 1 ? mrParts[1].trim() : row['PROGSUB'].toString().trim();
      
      const estParts = row['CODEST'].toString().split(' - ');
      const estName = estParts.length > 1 ? estParts[1].trim() : row['CODEST'].toString().trim();
      
      let nombres = row['NOM'] ? row['NOM'].toString().trim() : '';
      let apellidos = '';
      if (row['PAT'] || row['MAT']) {
        apellidos = `${row['PAT'] || ''} ${row['MAT'] || ''}`.trim();
      } else {
        // Si no hay PAT o MAT separados, intentar deducir o usar el campo completo
        apellidos = row['NOMBRE'] ? row['NOMBRE'].toString().trim() : '';
      }
      
      let cargo = row['CODCAR'] ? row['CODCAR'].toString().trim() : 'NO ESPECIFICADO';
      // Limpiar códigos de cargo si existen (ej. "2131-TRABAJADOR")
      if (cargo.includes('-')) {
        cargo = cargo.split('-').slice(1).join('-').trim();
      }

      records.push({
        dni: row['LIBELE'].toString().trim(),
        nombres: nombres || row['NOMBRE'].toString().trim(),
        apellidos: apellidos,
        cargo,
        condicionLaboral,
        mrName,
        estName
      });
    });
    return records;
  };

  console.log('Leyendo archivos Excel...');
  const cas = procesarArchivo('PLANILLA CAS SETIEMBRE 2026.xlsx', 'CAS');
  const nom = procesarArchivo('PLANILLA NOMBRADO SETIEMBRE.xls', 'NOMBRADO');
  const todosLosTrabajadores = [...cas, ...nom];
  
  console.log(`Se encontraron ${cas.length} CAS y ${nom.length} NOMBRADOS. Total: ${todosLosTrabajadores.length}`);

  // 3. Crear Estructura de Microredes y Establecimientos
  console.log('Creando Microredes y Establecimientos únicos...');
  const microredesMap = new Map<string, number>();
  const establecimientosMap = new Map<string, number>();

  for (const t of todosLosTrabajadores) {
    if (!microredesMap.has(t.mrName)) {
      const mr = await prisma.microred.create({ data: { nombre: t.mrName } });
      microredesMap.set(t.mrName, mr.id);
    }
    
    const estKey = `${t.mrName}::${t.estName}`;
    if (!establecimientosMap.has(estKey)) {
      const mrId = microredesMap.get(t.mrName)!;
      const est = await prisma.establecimiento.create({ 
        data: { nombre: t.estName, microredId: mrId } 
      });
      establecimientosMap.set(estKey, est.id);
    }
  }
  
  console.log(`Creadas ${microredesMap.size} Microredes y ${establecimientosMap.size} Establecimientos.`);

  // 4. Crear Trabajadores
  console.log('Insertando trabajadores en bloque...');
  // Evitar duplicados por DNI (a veces un trabajador sale dos veces si tiene doble plaza o errores)
  const dnisVistos = new Set<string>();
  const trabajadoresAInsertar = [];

  for (const t of todosLosTrabajadores) {
    if (dnisVistos.has(t.dni)) continue;
    dnisVistos.add(t.dni);
    
    const estKey = `${t.mrName}::${t.estName}`;
    const estId = establecimientosMap.get(estKey)!;
    
    trabajadoresAInsertar.push({
      dni: t.dni,
      nombres: t.nombres,
      apellidos: t.apellidos,
      cargo: t.cargo,
      condicionLaboral: t.condicionLaboral,
      establecimientoId: estId
    });
  }

  const batchResult = await prisma.trabajador.createMany({
    data: trabajadoresAInsertar,
    skipDuplicates: true
  });

  console.log(`¡Éxito! Se han importado ${batchResult.count} trabajadores a la base de datos.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

