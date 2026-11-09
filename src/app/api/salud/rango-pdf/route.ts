import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import ExcelJS from 'exceljs';
import { requireStaffAccess } from '@/core/auth/rbac';
import {
  buildUniqueSheetName,
  calcularChunksReportes,
  formatCalendarDateDMY,
  getCalendarDateStr,
} from '@/core/licencias/calculoSubsidios';

export async function GET(request: Request) {
  const auth = await requireStaffAccess({
    permisos: ['VER_LICENCIAS', 'GESTIONAR_LICENCIAS', 'VER_REPORTES', 'EXPORTAR_PDF_TRAMITE'],
  });
  if (auth.errorResponse) return auth.errorResponse;
  const { ctx } = auth;

  const { searchParams } = new URL(request.url);
  const microredNombre = searchParams.get('microred');
  const establecimientoNombre = searchParams.get('establecimiento');
  const condicionLaboral = searchParams.get('condicionLaboral');
  const tipoLicencia = searchParams.get('tipoLicencia');
  const isPreview = searchParams.get('preview') === 'true';

  const desdeRaw = (searchParams.get('desde') || '').trim();
  const hastaRaw = (searchParams.get('hasta') || '').trim();
  const desdeStr = getCalendarDateStr(desdeRaw);
  const hastaStr = getCalendarDateStr(hastaRaw);

  if (!desdeStr || !hastaStr) {
    return NextResponse.json({ error: 'Faltan parámetros desde o hasta' }, { status: 400 });
  }

  const reqYearStr = (searchParams.get('year') || '').trim();
  const reqYear = reqYearStr ? Number.parseInt(reqYearStr, 10) : NaN;
  const anio = Number.isFinite(reqYear)
    ? reqYear
    : Number(desdeStr.slice(0, 4)) || new Date().getFullYear();

  const desdeFormateado = formatCalendarDateDMY(desdeStr);
  const hastaFormateado = formatCalendarDateDMY(hastaStr);

  try {
    const whereClause: any = {};
    if (!ctx.isSuperAdmin) {
      whereClause.establecimiento = { microredId: ctx.microredId! };
    } else if (microredNombre && microredNombre !== 'Todas') {
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

    const licenciasWhere: any = {};
    if (tipoLicencia && tipoLicencia !== '--TODOS--') {
      if (tipoLicencia === 'SALUD') {
        licenciasWhere.tipoLicencia = { in: ['ENFERMEDAD_COMUN', 'ACCIDENTE_COMUN'] };
      } else {
        licenciasWhere.tipoLicencia = tipoLicencia;
      }
    } else {
      // Si es TODOS, igual deberíamos permitir todo o tal vez solo SALUD por defecto?
      // La vista de salud debería mostrar solo SALUD por defecto, pero el usuario pidió que '--TODOS--' muestre TODO.
      // Así que si es '--TODOS--', no filtramos por tipo de licencia.
    }

    const trabajadores = await prisma.trabajador.findMany({
      where: whereClause,
      include: {
        establecimiento: { include: { microred: true } },
        licencias: {
          where: licenciasWhere,
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
      if (isPreview) return NextResponse.json({ sheets: [] });
      const ws = workbook.addWorksheet('SIN REGISTROS');
      ws.addRow(['No se encontraron licencias para el período y filtros seleccionados']);
      const emptyBuffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(emptyBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Reporte_Masivo_Mensual_${anio}.xlsx"`
        }
      });
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
    const usedSheetNames = new Set<string>();

    // Crear una hoja por cada Microred SOLO si contiene trabajadores válidos en el rango
    for (const [mrName, trs] of Array.from(microredesMap.entries())) {
      const workersWithLic = trs.filter(t => t.licencias && t.licencias.length > 0);
      if (workersWithLic.length === 0) continue;

      // Preprocesar chunks por trabajador y filtrar estrictamente por rango [desdeStr, hastaStr]
      const workersInRange = workersWithLic
        .map(t => {
          const allChunks = calcularChunksReportes(t.licencias).filter(
            c => c.endStr >= desdeStr && c.startStr <= hastaStr
          );
          return { ...t, allChunks };
        })
        .filter(w => w.allChunks.length > 0);

      if (workersInRange.length === 0) continue;

      const sheetName = buildUniqueSheetName(mrName, anio, usedSheetNames);
      const worksheet = !isPreview ? workbook.addWorksheet(sheetName) : null;
      const sheetPreview: any = { name: sheetName, rows: [] };

      let currentRowIndex = 1;

      const titleText = `RELACION DEL PERSONAL LICENCIA POR ENFERMEDAD - DESDE ${desdeFormateado} HASTA ${hastaFormateado} - MICRORED ${mrName}`;
      const bgColor = 'FF9BC2E6';
      
      sheetPreview.rows.push({
         type: 'title',
         value: titleText,
         bgColor: '#9BC2E6'
      });

      if (worksheet) {
        worksheet.mergeCells(`A${currentRowIndex}:N${currentRowIndex}`);
        const titleCell = worksheet.getCell(`A${currentRowIndex}`);
        titleCell.value = titleText;
        titleCell.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } as ExcelJS.Fill;
        worksheet.getRow(currentRowIndex).height = 25;
        currentRowIndex++;
      }

      const headers = [
        'N°', 'APELLIDOS Y NOMBRES', 'CARGO', 'CONDICIÓN LABORAL', 'ESTABLECIMIENTO', 'DNI', 
        'CITT O CMP', 'FECHA DE INICIO', 'FECHA FIN', 'FIN 20 DÍAS (RED)', 'FECHA SUBSIDIO', '', 
        'TOTAL DE DIAS', 'DIAS DE SUBSIDIOS'
      ];
      
      sheetPreview.rows.push({ type: 'header', values: headers });

      if (worksheet) {
        const headerRow = worksheet.getRow(currentRowIndex);
        headerRow.height = 30;
        headers.forEach((h, i) => {
          const cell = headerRow.getCell(i + 1);
          cell.value = h;
          cell.style = colHeaderStyle;
        });
        
        // Merge para "FECHA SUBSIDIO" que ocupa 2 columnas (11 y 12)
        worksheet.mergeCells(currentRowIndex, 11, currentRowIndex, 12);
        currentRowIndex++;

        if (worksheet.columns.length === 0) {
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

      let nro = 1;
      workersInRange.sort((a, b) => (a.apellidos || '').localeCompare(b.apellidos || ''));

      for (const t of workersInRange) {
        const historyChunks = t.allChunks;
        if (historyChunks.length === 0) continue;

        const startRow = currentRowIndex;
        const apellidosNombres = t.apellidos ? `${t.apellidos} ${t.nombres}` : t.nombres;
        const establecimientoNombre = t.establecimiento?.nombre || 'NO ASIGNADO';

        let totalSubsidioMes = 0;
        for (const chunk of historyChunks) {
          totalSubsidioMes += chunk.subsidioDaysInChunk;
        }

        const workerChunksForPreview: any[] = [];

        for (const chunk of historyChunks) {
          if (isPreview) {
            workerChunksForPreview.push({
              nro,
              apellidosNombres: apellidosNombres.toUpperCase(),
              cargo: (t.cargo || '').toUpperCase(),
              condicion: (t.condicionLaboral || '').toUpperCase(),
              establecimiento: establecimientoNombre.toUpperCase(),
              dni: t.dni,
              citt: chunk.lic.numeroCertificado || 'S/N',
              inicio: chunk.origInicioFormatted,
              fin: chunk.origFinFormatted,
              fin20Dias: chunk.fin20Dias,
              subsidioStart: chunk.subsidioStartStr,
              subsidioEnd: chunk.subsidioEndStr,
              totalDias: chunk.days,
              isRed: chunk.redDaysInChunk > 0
            });
          } else if (worksheet) {
            const row = worksheet.getRow(currentRowIndex);
            row.getCell(1).value = nro;
            row.getCell(2).value = apellidosNombres.toUpperCase();
            row.getCell(3).value = (t.cargo || '').toUpperCase();
            row.getCell(4).value = (t.condicionLaboral || '').toUpperCase(); 
            row.getCell(5).value = establecimientoNombre.toUpperCase();
            row.getCell(6).value = t.dni;
            row.getCell(7).value = chunk.lic.numeroCertificado || 'S/N';
            row.getCell(8).value = chunk.origInicioFormatted;
            row.getCell(9).value = chunk.origFinFormatted;
            row.getCell(10).value = chunk.fin20Dias; 
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
        } else if (worksheet) {
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

      previewData.sheets.push(sheetPreview);
    }

    if (isPreview) {
       return NextResponse.json(previewData);
    }

    if (workbook.worksheets.length === 0) {
      const ws = workbook.addWorksheet('SIN REGISTROS');
      ws.addRow(['No se encontraron licencias para el período y filtros seleccionados']);
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
