import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import ExcelJS from 'exceljs';
import { logger } from '@/core/logging/systemLogger';
import { requireStaffAccess } from '@/core/auth/rbac';
import {
  MESES,
  buildUniqueSheetName,
  calcularChunksReportes,
  formatCalendarDateDMY,
} from '@/core/licencias/calculoSubsidios';

function parseOptionalInt(val: string | null): number | null {
  if (!val || val.trim() === '') return null;
  const parsed = Number.parseInt(val, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const auth = await requireStaffAccess({
    permisos: ['VER_REPORTES', 'EXPORTAR_EXCEL_MASIVO', 'EXPORTAR_EXCEL_PERSONAL'],
  });
  if (auth.errorResponse) return auth.errorResponse;
  const { ctx } = auth;

  const { searchParams } = new URL(request.url);
  const microredNombre = searchParams.get('microred');
  const establecimientoNombre = searchParams.get('establecimiento');
  const condicionLaboral = searchParams.get('condicionLaboral');
  const tipoLicencia = searchParams.get('tipoLicencia');
  const isPreview = searchParams.get('preview') === 'true';

  const reqMonthParsed = parseOptionalInt(searchParams.get('month'));
  const reqMonth = reqMonthParsed !== null && reqMonthParsed >= 1 && reqMonthParsed <= 12
    ? reqMonthParsed - 1
    : null;

  const monthDesdeParsed = parseOptionalInt(searchParams.get('monthDesde') || searchParams.get('monthStart'));
  const monthHastaParsed = parseOptionalInt(searchParams.get('monthHasta') || searchParams.get('monthEnd'));

  let mDesde: number | null = null;
  let mHasta: number | null = null;

  if (monthDesdeParsed !== null || monthHastaParsed !== null) {
    mDesde = monthDesdeParsed !== null ? Math.min(11, Math.max(0, monthDesdeParsed - 1)) : 0;
    mHasta = monthHastaParsed !== null ? Math.min(11, Math.max(0, monthHastaParsed - 1)) : 11;
    if (mDesde > mHasta) {
      const temp = mDesde;
      mDesde = mHasta;
      mHasta = temp;
    }
  } else if (reqMonth !== null) {
    mDesde = reqMonth;
    mHasta = reqMonth;
  }

  const desdeStr = (searchParams.get('desde') || '').trim();
  const hastaStr = (searchParams.get('hasta') || '').trim();
  const hasExplicitRange = Boolean(desdeStr || hastaStr);

  const reqYearParsed = parseOptionalInt(searchParams.get('year'));
  // Si el usuario envía desde/hasta sin parámetro `year`, respetamos el rango multi-año sin recortar al año actual.
  const anioFilter: number | null =
    reqYearParsed !== null
      ? reqYearParsed
      : !hasExplicitRange
        ? new Date().getFullYear()
        : null;

  const anioDisplay =
    anioFilter ??
    (desdeStr && /^\d{4}/.test(desdeStr)
      ? Number(desdeStr.slice(0, 4))
      : hastaStr && /^\d{4}/.test(hastaStr)
        ? Number(hastaStr.slice(0, 4))
        : new Date().getFullYear());

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
    if (condicionLaboral && condicionLaboral !== '--TODOS--' && condicionLaboral !== 'TODOS' && condicionLaboral !== '-- TODOS --' && condicionLaboral !== '') {
      whereClause.condicionLaboral = condicionLaboral;
    }

    const licenciasWhere: any = {};
    if (tipoLicencia && tipoLicencia !== '--TODOS--') {
      if (tipoLicencia === 'SALUD') {
        licenciasWhere.tipoLicencia = { in: ['ENFERMEDAD_COMUN', 'ACCIDENTE_COMUN'] };
      } else {
        licenciasWhere.tipoLicencia = tipoLicencia;
      }
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
    const usedSheetNames = new Set<string>();

    // Crear una hoja por cada Microred
    for (const [mrName, trs] of Array.from(microredesMap.entries())) {
      const workersWithLic = trs.filter(t => t.licencias && t.licencias.length > 0);
      if (workersWithLic.length === 0) continue;

      const workersData = workersWithLic.map(t => {
        const processedChunks = calcularChunksReportes(t.licencias);
        return { ...t, processedChunks };
      });

      // Filtrar trabajadores y chunks para el período y rango calendario solicitado
      const workersInRange = workersData
        .map(w => {
          const rangeChunks = w.processedChunks.filter(c => {
            if (desdeStr && c.endStr < desdeStr) return false;
            if (hastaStr && c.startStr > hastaStr) return false;
            if (anioFilter !== null && c.year !== anioFilter) return false;
            if (mDesde !== null && mHasta !== null) {
              return c.month >= mDesde && c.month <= mHasta;
            }
            if (reqMonth !== null) {
              return c.month === reqMonth;
            }
            return true;
          });
          return { ...w, rangeChunks };
        })
        .filter(w => w.rangeChunks.length > 0);

      if (workersInRange.length === 0) continue;

      const sheetSuffix = hasExplicitRange && anioFilter === null ? 'RANGO' : anioDisplay;
      const sheetName = buildUniqueSheetName(mrName, sheetSuffix, usedSheetNames);
      let worksheet: ExcelJS.Worksheet | null = null;
      if (!isPreview) {
        worksheet = workbook.addWorksheet(sheetName);
      }
      const sheetPreview: any = { name: sheetName, rows: [] };

      const labelPeriodo = (mDesde !== null && mHasta !== null)
        ? (mDesde === mHasta ? `${MESES[mDesde]} ${anioDisplay}` : `${MESES[mDesde]} A ${MESES[mHasta]} ${anioDisplay}`)
        : hasExplicitRange
          ? `DESDE ${desdeStr ? formatCalendarDateDMY(desdeStr) : '...'} HASTA ${hastaStr ? formatCalendarDateDMY(hastaStr) : '...'}`
          : (reqMonth !== null ? `${MESES[reqMonth]} ${anioDisplay}` : `CONSOLIDADO ${anioDisplay}`);

      const titleText = `RELACION DEL PERSONAL LICENCIA POR ENFERMEDAD - ${labelPeriodo} - MICRORED ${mrName}`;

      const headers = [
        'N°', 'APELLIDOS Y NOMBRES', 'CARGO', 'CONDICIÓN LABORAL', 'ESTABLECIMIENTO', 'DNI', 
        'CITT O CMP', 'FECHA DE INICIO', 'FECHA FIN', 'FIN 20 DÍAS (RED)', 'FECHA SUBSIDIO', '', 
        'TOTAL DE DIAS', 'DIAS DE SUBSIDIOS'
      ];

      // Ordenar trabajadores alfabéticamente
      workersInRange.sort((a, b) => (a.apellidos || '').localeCompare(b.apellidos || ''));

      let currentRowIndex = 1;

      if (isPreview) {
        sheetPreview.rows.push({
          type: 'title',
          value: titleText,
          bgColor: '#9BC2E6'
        });

        sheetPreview.rows.push({ type: 'header', values: headers });

        let nro = 1;
        for (const t of workersInRange) {
          const apellidosNombres = t.apellidos ? `${t.apellidos} ${t.nombres}` : t.nombres;
          const establecimientoNombre = t.establecimiento?.nombre || 'NO ASIGNADO';
          let totalSubsidioPeriodo = 0;
          for (const chunk of t.rangeChunks) {
            totalSubsidioPeriodo += chunk.subsidioDaysInChunk;
          }

          const workerChunksForPreview = t.rangeChunks.map(chunk => ({
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
          }));

          sheetPreview.rows.push({
            type: 'worker',
            chunks: workerChunksForPreview,
            totalSubsidioMes: totalSubsidioPeriodo > 0 ? totalSubsidioPeriodo : ''
          });

          nro++;
        }

        if (sheetPreview.rows.length > 0) {
          previewData.sheets.push(sheetPreview);
        }
      } else {
        // Generación de Excel Masivo oficial
        worksheet!.mergeCells(`A${currentRowIndex}:N${currentRowIndex}`);
        const titleCell = worksheet!.getCell(`A${currentRowIndex}`);
        titleCell.value = titleText;
        titleCell.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BC2E6' } } as ExcelJS.Fill;
        worksheet!.getRow(currentRowIndex).height = 25;
        currentRowIndex++;

        // Subheaders de la tabla
        const headerRow = worksheet!.getRow(currentRowIndex);
        headerRow.height = 30;
        headers.forEach((h, i) => {
          const cell = headerRow.getCell(i + 1);
          cell.value = h;
          cell.style = colHeaderStyle;
        });
        
        // Merge para "FECHA SUBSIDIO" que ocupa 2 columnas (11 y 12)
        worksheet!.mergeCells(currentRowIndex, 11, currentRowIndex, 12);
        currentRowIndex++;

        // Configurar anchos de columna
        worksheet!.columns = [
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

        let nro = 1;
        for (const t of workersInRange) {
          const startRow = currentRowIndex;
          const apellidosNombres = t.apellidos ? `${t.apellidos} ${t.nombres}` : t.nombres;
          const establecimientoNombre = t.establecimiento?.nombre || 'NO ASIGNADO';
          let totalSubsidioPeriodo = 0;
          for (const chunk of t.rangeChunks) {
            totalSubsidioPeriodo += chunk.subsidioDaysInChunk;
          }

          for (const chunk of t.rangeChunks) {
            const row = worksheet!.getRow(currentRowIndex);
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
              row.getCell(14).value = totalSubsidioPeriodo > 0 ? totalSubsidioPeriodo : '';
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

          const endRow = currentRowIndex - 1;
          if (endRow > startRow) {
            worksheet!.mergeCells(`A${startRow}:A${endRow}`);
            worksheet!.mergeCells(`B${startRow}:B${endRow}`);
            worksheet!.mergeCells(`C${startRow}:C${endRow}`);
            worksheet!.mergeCells(`D${startRow}:D${endRow}`);
            worksheet!.mergeCells(`E${startRow}:E${endRow}`);
            worksheet!.mergeCells(`F${startRow}:F${endRow}`);
            worksheet!.mergeCells(`N${startRow}:N${endRow}`); 
          }

          nro++;
        }
      }
    }

    if (isPreview) {
       return NextResponse.json(previewData);
    }

    if (workbook.worksheets.length === 0) {
      const ws = workbook.addWorksheet('SIN REGISTROS');
      ws.addRow(['No se encontraron licencias para el período y filtros seleccionados']);
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const monthLabel = (mDesde !== null && mHasta !== null)
      ? (mDesde === mHasta ? MESES[mDesde] : `${MESES[mDesde]}_A_${MESES[mHasta]}`)
      : hasExplicitRange
        ? `${desdeStr || 'INICIO'}_A_${hastaStr || 'FIN'}`
        : (reqMonth !== null ? MESES[reqMonth] : 'CONSOLIDADO');
    const filename = `Reporte_Masivo_${monthLabel}_${anioDisplay}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Error generando Excel Masivo:', error);
    await logger.error('EXCEL_IMPORT', 'GENERAR_EXCEL_MASIVO_ERROR', 'Fallo al procesar o exportar Excel Masivo de Salud', {
      error,
      usuarioId: ctx.userId,
      ruta: '/api/salud/excel-masivo'
    });
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
