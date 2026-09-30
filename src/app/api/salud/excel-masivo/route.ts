import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import ExcelJS from 'exceljs';

function splitIntoMonths(inicioStr: string, finStr: string) {
  const chunks = [];
  let current = new Date(inicioStr + 'T00:00:00');
  const end = new Date(finStr + 'T00:00:00');
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const endOfMonth = new Date(year, month + 1, 0); 
    const chunkEnd = end < endOfMonth ? end : endOfMonth;
    
    const startMs = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate());
    const endMs = Date.UTC(chunkEnd.getFullYear(), chunkEnd.getMonth(), chunkEnd.getDate());
    const days = Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;

    chunks.push({
      start: new Date(current),
      end: new Date(chunkEnd),
      days,
      month
    });
    
    current = new Date(year, month + 1, 1);
  }
  return chunks;
}

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

function getPeruDateString(dbDate: Date) {
  const d = new Date(dbDate.toLocaleString('en-US', { timeZone: 'America/Lima' }));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const microredNombre = searchParams.get('microred');
  const establecimientoNombre = searchParams.get('establecimiento');
  const condicionLaboral = searchParams.get('condicionLaboral');
  const isPreview = searchParams.get('preview') === 'true';
  const reqMonthStr = searchParams.get('month');
  const reqMonth = reqMonthStr !== null ? parseInt(reqMonthStr, 10) - 1 : null;
  const reqYearStr = searchParams.get('year');
  const anio = reqYearStr !== null ? parseInt(reqYearStr, 10) : new Date().getFullYear();

  try {
    const whereClause: any = {};
    if (microredNombre && microredNombre !== 'Todas') {
      whereClause.establecimiento = { microred: { nombre: microredNombre } };
    }
    if (establecimientoNombre && establecimientoNombre !== '--Todos--') {
      if (whereClause.establecimiento) {
        whereClause.establecimiento.nombre = establecimientoNombre;
      } else {
        whereClause.establecimiento = { nombre: establecimientoNombre };
      }
    }
    if (condicionLaboral && condicionLaboral !== '--TODOS--' && condicionLaboral !== '') {
      whereClause.condicionLaboral = condicionLaboral;
    }

    const trabajadores = await prisma.trabajador.findMany({
      where: whereClause,
      include: {
        establecimiento: { include: { microred: true } },
        licencias: {
          where: { tipoLicencia: 'ENFERMEDAD_COMUN' },
          orderBy: { fechaInicio: 'asc' }
        }
      }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Bienestar Social - Red Huánuco';

    // Agrupar por Microred
    const microredesMap = new Map<string, typeof trabajadores>();
    trabajadores.forEach(t => {
      const mrName = t.establecimiento.microred?.nombre || 'SIN MICRORED';
      if (!microredesMap.has(mrName)) {
        microredesMap.set(mrName, []);
      }
      microredesMap.get(mrName)!.push(t);
    });

    if (microredesMap.size === 0) {
      return NextResponse.json({ error: 'No hay datos para exportar con esos filtros' }, { status: 404 });
    }

    const colHeaderStyle = {
      font: { bold: true, color: { argb: 'FF000000' }, size: 9 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } } as ExcelJS.Fill,
      alignment: { horizontal: 'center' as any, vertical: 'middle' as any, wrapText: true },
      border: {
        top: { style: 'thin' as any }, left: { style: 'thin' as any },
        bottom: { style: 'thin' as any }, right: { style: 'thin' as any }
      }
    };

    const previewData: any = { sheets: [] };

    // Crear una hoja por cada Microred
    for (const [mrName, trs] of Array.from(microredesMap.entries())) {
      // Filtrar a los trabajadores que realmente tienen licencias
      const workersWithLic = trs.filter(t => t.licencias && t.licencias.length > 0);
      if (workersWithLic.length === 0) continue; // No crear la hoja si está vacía

      const sheetName = `${mrName.substring(0, 25)} ${anio}`;
      const worksheet = workbook.addWorksheet(sheetName);
      
      const sheetPreview: any = { name: sheetName, rows: [] };

      // Preprocesar chunks por trabajador
      const workersData = workersWithLic.map(t => {
        let currentYearForRed = 0;
        let diasRedRestantes = 20;
        let historicFin20Str = '';
        const allChunks: any[] = [];
        
        for (const lic of t.licencias) {
          const inicioStr = getPeruDateString(new Date(lic.fechaInicio));
          const finStr = getPeruDateString(new Date(lic.fechaFin));
          
          const licYear = new Date(lic.fechaInicio).getFullYear();
          if (licYear !== currentYearForRed) {
            currentYearForRed = licYear;
            diasRedRestantes = 20;
            historicFin20Str = '';
          }
          
          const origInicioParts = inicioStr.split('-');
          const origFinParts = finStr.split('-');
          const origInicioFormatted = `${origInicioParts[2]}/${origInicioParts[1]}/${origInicioParts[0]}`;
          const origFinFormatted = `${origFinParts[2]}/${origFinParts[1]}/${origFinParts[0]}`;

          const chunks = splitIntoMonths(inicioStr, finStr);

          for (const chunk of chunks) {
            let redDaysInChunk = Math.min(chunk.days, diasRedRestantes);
            let subsidioDaysInChunk = chunk.days - redDaysInChunk;
            diasRedRestantes -= redDaysInChunk;
            
            if (redDaysInChunk > 0 && diasRedRestantes === 0 && !historicFin20Str) {
               const fin20Obj = new Date(chunk.start);
               fin20Obj.setDate(fin20Obj.getDate() + redDaysInChunk - 1);
               historicFin20Str = fin20Obj.toLocaleDateString('es-PE');
            }

            let subsidioStartStr = '';
            let subsidioEndStr = '';
            
            if (subsidioDaysInChunk > 0) {
              const subStart = new Date(chunk.start);
              subStart.setDate(subStart.getDate() + redDaysInChunk);
              subsidioStartStr = subStart.toLocaleDateString('es-PE');
              subsidioEndStr = chunk.end.toLocaleDateString('es-PE');
            }

            allChunks.push({
              ...chunk,
              redDaysInChunk,
              subsidioDaysInChunk,
              subsidioStartStr,
              subsidioEndStr,
              origInicioFormatted,
              origFinFormatted,
              lic
            });
          }
        }
        return { ...t, allChunks, historicFin20Str };
      });

      let currentRowIndex = 1;

      // Iterar por meses (0 = Enero, 11 = Diciembre)
      for (let m = 0; m < 12; m++) {
        if (reqMonth !== null && m !== reqMonth) continue;
        const workersInMonth = workersData.filter(w => w.allChunks.some(c => c.month === m));
        if (workersInMonth.length === 0) continue;

        const titleText = `RELACION DEL PERSONAL LICENCIA POR ENFERMEDAD - ${MESES[m]} ${anio} - MICRORED ${mrName}`;
        const bgColor = m % 2 === 0 ? 'FF9BC2E6' : 'FFF4B084'; // Alterna entre celeste y naranjita/rosa
        
        sheetPreview.rows.push({
           type: 'title',
           value: titleText,
           bgColor: bgColor === 'FF9BC2E6' ? '#9BC2E6' : '#F4B084'
        });

        // Big Header del Mes
        if (!isPreview) {
          worksheet.mergeCells(`A${currentRowIndex}:L${currentRowIndex}`);
          const titleCell = worksheet.getCell(`A${currentRowIndex}`);
          titleCell.value = titleText;
          titleCell.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
          titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
          titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } as ExcelJS.Fill;
          currentRowIndex++;
        }

        const headers = [
          'N°', 'APELLIDOS Y NOMBRES', 'CARGO', 'CONDICIÓN LABORAL', 'ESTABLECIMIENTO', 'DNI', 
          'CITT O CMP', 'FECHA DE INICIO', 'FECHA FIN', 'FIN 20 DÍAS (RED)', 'FECHA SUBSIDIO', '', 
          'TOTAL DE DIAS', 'DIAS DE SUBSIDIOS'
        ];
        
        sheetPreview.rows.push({ type: 'header', values: headers });

        if (!isPreview) {
          // Subheaders de la tabla
          const headerRow = worksheet.getRow(currentRowIndex);
          headerRow.height = 30;
          headers.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = h;
            cell.style = colHeaderStyle;
          });
          
          // Merge para "FECHA SUBSIDIO" que ocupa 2 columnas
          worksheet.mergeCells(currentRowIndex, 11, currentRowIndex, 12);
          currentRowIndex++;

          // Configurar anchos de columna (solo la primera vez)
          if (m === 0 || worksheet.columns.length === 0) {
            worksheet.columns = [
              { key: 'col1', width: 5 },
              { key: 'col2', width: 35 },
              { key: 'col3', width: 25 },
              { key: 'col4', width: 15 },
              { key: 'col5', width: 25 },
              { key: 'col6', width: 12 },
              { key: 'col7', width: 18 },
              { key: 'col8', width: 15 },
              { key: 'col9', width: 15 },
              { key: 'col10', width: 15 },
              { key: 'col11', width: 15 },
              { key: 'col12', width: 15 },
              { key: 'col13', width: 15 },
              { key: 'col14', width: 15 }
            ];
          }
        }

        // Llenar datos de los trabajadores para este mes
        let nro = 1;
        workersInMonth.sort((a, b) => (a.apellidos || '').localeCompare(b.apellidos || ''));

        for (const t of workersInMonth) {
          // Obtener todos los chunks hasta el mes actual (arrastrar historial del año)
          const historyChunks = t.allChunks.filter(c => c.month <= m);
          if (historyChunks.length === 0) continue;

          const startRow = currentRowIndex;
          const apellidosNombres = t.apellidos ? `${t.apellidos} ${t.nombres}` : t.nombres;

          let totalSubsidioMes = 0;
          // El total de subsidios de la última columna es SOLO para el mes actual
          for (const chunk of historyChunks) {
            if (chunk.month === m && chunk.lic.origen === 'ESSALUD_CITT') {
              totalSubsidioMes += chunk.subsidioDaysInChunk;
            }
          }

          let workerChunksForPreview = [];

          for (const chunk of historyChunks) {
            
            let fin20Dias = '';
            if (chunk.subsidioDaysInChunk > 0) {
               fin20Dias = t.historicFin20Str;
            }

            if (isPreview) {
               workerChunksForPreview.push({
                  nro,
                  apellidosNombres: apellidosNombres.toUpperCase(),
                  cargo: (t.cargo || '').toUpperCase(),
                  condicion: (t.condicionLaboral || '').toUpperCase(),
                  establecimiento: (t.establecimiento.nombre || '').toUpperCase(),
                  dni: t.dni,
                  citt: chunk.lic.numeroCertificado,
                  inicio: chunk.origInicioFormatted,
                  fin: chunk.origFinFormatted,
                  fin20Dias,
                  subsidioStart: chunk.subsidioStartStr,
                  subsidioEnd: chunk.subsidioEndStr,
                  totalDias: chunk.days,
                  isRed: chunk.redDaysInChunk > 0
               });
            } else {
              const row = worksheet.getRow(currentRowIndex);
              row.getCell(1).value = nro;
              row.getCell(2).value = apellidosNombres.toUpperCase();
              row.getCell(3).value = (t.cargo || '').toUpperCase();
              row.getCell(4).value = (t.condicionLaboral || '').toUpperCase(); 
              row.getCell(5).value = (t.establecimiento.nombre || '').toUpperCase();
              row.getCell(6).value = t.dni;
              row.getCell(7).value = chunk.lic.numeroCertificado;
              row.getCell(8).value = chunk.origInicioFormatted;
              row.getCell(9).value = chunk.origFinFormatted;
              row.getCell(10).value = fin20Dias; 
              row.getCell(11).value = chunk.subsidioStartStr;
              row.getCell(12).value = chunk.subsidioEndStr;
              
              const totalDiasCell = row.getCell(13);
              totalDiasCell.value = chunk.days;
              
              if (chunk.redDaysInChunk > 0) {
                totalDiasCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } } as ExcelJS.Fill; 
              }

              if (currentRowIndex === startRow) {
                row.getCell(14).value = totalSubsidioMes > 0 ? totalSubsidioMes : '';
              }

              row.eachCell({ includeEmpty: true }, (cell) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                  top: { style: 'thin' as any }, left: { style: 'thin' as any },
                  bottom: { style: 'thin' as any }, right: { style: 'thin' as any }
                };
              });
              row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
              row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
              row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
              row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

              currentRowIndex++;
            }
          }
          
          if (isPreview) {
             sheetPreview.rows.push({
                type: 'worker',
                chunks: workerChunksForPreview,
                totalSubsidioMes: totalSubsidioMes > 0 ? totalSubsidioMes : ''
             });
          } else {
            const endRow = currentRowIndex - 1;
            if (endRow > startRow) {
              worksheet.mergeCells(`A${startRow}:A${endRow}`);
              worksheet.mergeCells(`B${startRow}:B${endRow}`);
              worksheet.mergeCells(`C${startRow}:C${endRow}`);
              worksheet.mergeCells(`D${startRow}:D${endRow}`);
              worksheet.mergeCells(`E${startRow}:E${endRow}`);
              worksheet.mergeCells(`F${startRow}:F${endRow}`);
              worksheet.mergeCells(`N${startRow}:N${endRow}`); 
            }
          }
          
          nro++;
        }
        
        if (!isPreview) {
           currentRowIndex += 2;
        }
      }

      previewData.sheets.push(sheetPreview);
    }

    if (isPreview) {
       return NextResponse.json(previewData);
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Reporte_Masivo_Mensual_${anio}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Error generando Excel Masivo:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
