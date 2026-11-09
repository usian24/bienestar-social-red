import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import ExcelJS from 'exceljs';
import { requireStaffAccess } from '@/core/auth/rbac';
import {
  MESES,
  buildUniqueSheetName,
  calcularChunksReportes,
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
  const desdeStr = (searchParams.get('desde') || '').trim();
  const hastaStr = (searchParams.get('hasta') || '').trim();
  const hasExplicitRange = Boolean(desdeStr || hastaStr);

  const reqYearParsed = parseOptionalInt(searchParams.get('year'));
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

    const trabajadores = await prisma.trabajador.findMany({
      where: whereClause,
      include: {
        establecimiento: { include: { microred: true } },
        licencias: {
          where: { tipoLicencia: 'MATERNIDAD' },
          orderBy: [{ fechaInicio: 'asc' }, { creadoEn: 'asc' }]
        }
      }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Bienestar Social - Red Huánuco';

    // Agrupar por Microred
    const microredesMap = new Map<string, typeof trabajadores>();
    trabajadores.forEach(t => {
      const mrName = t.establecimiento?.microred?.nombre || 'SIN MICRORED';
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

    const usedSheetNames = new Set<string>();

    // Crear una hoja por cada Microred que realmente tenga datos en el rango
    for (const [mrName, trs] of Array.from(microredesMap.entries())) {
      const workersWithLic = trs.filter(t => t.licencias && t.licencias.length > 0);
      if (workersWithLic.length === 0) continue;

      const workersData = workersWithLic
        .map(t => {
          const allChunks = calcularChunksReportes(t.licencias).filter(c => {
            if (desdeStr && c.endStr < desdeStr) return false;
            if (hastaStr && c.startStr > hastaStr) return false;
            if (anioFilter !== null && c.year !== anioFilter) return false;
            return true;
          });
          return { ...t, allChunks };
        })
        .filter(w => w.allChunks.length > 0);

      if (workersData.length === 0) continue; // No crear pestaña vacía si no hay chunks en el rango

      // Recopilar todos los pares (year, month) presentes ordenados cronológicamente
      const yearMonths = Array.from(
        new Set(workersData.flatMap(w => w.allChunks.map(c => `${c.year}-${String(c.month).padStart(2, '0')}`)))
      )
        .sort()
        .map(k => {
          const [y, m] = k.split('-').map(Number);
          return { year: y, month: m };
        });

      if (yearMonths.length === 0) continue;

      const sheetSuffix = hasExplicitRange && anioFilter === null ? 'RANGO' : anioDisplay;
      const sheetName = buildUniqueSheetName(mrName, sheetSuffix, usedSheetNames);
      const worksheet = workbook.addWorksheet(sheetName);

      // Configurar anchos de columna
      worksheet.columns = [
        { key: 'col1', width: 5 },
        { key: 'col2', width: 35 },
        { key: 'col3', width: 25 },
        { key: 'col4', width: 25 },
        { key: 'col5', width: 12 },
        { key: 'col6', width: 18 },
        { key: 'col7', width: 15 },
        { key: 'col8', width: 15 },
        { key: 'col9', width: 15 },
        { key: 'col10', width: 15 },
        { key: 'col11', width: 15 },
        { key: 'col12', width: 15 }
      ];

      let currentRowIndex = 1;

      for (const { year: yr, month: m } of yearMonths) {
        const workersInMonth = workersData.filter(w => w.allChunks.some(c => c.year === yr && c.month === m));
        if (workersInMonth.length === 0) continue;

        // Big Header del Mes
        worksheet.mergeCells(`A${currentRowIndex}:L${currentRowIndex}`);
        const titleCell = worksheet.getCell(`A${currentRowIndex}`);
        titleCell.value = `RELACION DEL PERSONAL LICENCIA POR MATERNIDAD - ${MESES[m]} ${yr} - MICRORED ${mrName}`;
        titleCell.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        const bgColor = m % 2 === 0 ? 'FF9BC2E6' : 'FFF4B084';
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } as ExcelJS.Fill;
        currentRowIndex++;

        // Subheaders de la tabla
        const headerRow = worksheet.getRow(currentRowIndex);
        headerRow.height = 30;
        const headers = [
          'N°', 'APELLIDOS Y NOMBRES', 'CARGO', 'ESTABLECIMIENTO', 'DNI',
          'CITT O CMP', 'FECHA DE INICIO', 'FECHA FIN', 'FECHA SUBSIDIO', '',
          'TOTAL DE DIAS', 'DIAS DE SUBSIDIOS'
        ];

        headers.forEach((h, i) => {
          const cell = headerRow.getCell(i + 1);
          cell.value = h;
          cell.style = colHeaderStyle;
        });

        worksheet.mergeCells(currentRowIndex, 9, currentRowIndex, 10);
        currentRowIndex++;

        // Llenar datos de los trabajadores para este mes
        let nro = 1;
        workersInMonth.sort((a, b) => (a.apellidos || '').localeCompare(b.apellidos || ''));

        for (const t of workersInMonth) {
          const monthChunks = t.allChunks.filter(c => c.year === yr && c.month === m);
          if (monthChunks.length === 0) continue;

          const startRow = currentRowIndex;
          const apellidosNombres = t.apellidos ? `${t.apellidos} ${t.nombres}` : t.nombres;
          const establecimientoNombre = t.establecimiento?.nombre || 'NO ASIGNADO';

          // En Maternidad cuentan tanto ESSALUD_CITT como PARTICULAR (excluyendo PARTICULAR_PERDIDO vía subsidioDaysInChunk)
          let totalSubsidioMes = 0;
          for (const chunk of monthChunks) {
            totalSubsidioMes += chunk.subsidioDaysInChunk;
          }

          for (const chunk of monthChunks) {
            const row = worksheet.getRow(currentRowIndex);
            row.getCell(1).value = nro;
            row.getCell(2).value = apellidosNombres.toUpperCase();
            row.getCell(3).value = (t.cargo || '').toUpperCase();
            row.getCell(4).value = establecimientoNombre.toUpperCase();
            row.getCell(5).value = t.dni;
            row.getCell(6).value = chunk.lic.numeroCertificado || 'S/N';
            row.getCell(7).value = chunk.origInicioFormatted;
            row.getCell(8).value = chunk.origFinFormatted;
            row.getCell(9).value = chunk.subsidioStartStr;
            row.getCell(10).value = chunk.subsidioEndStr;

            const totalDiasCell = row.getCell(11);
            totalDiasCell.value = chunk.days;

            if (currentRowIndex === startRow) {
              row.getCell(12).value = totalSubsidioMes > 0 ? totalSubsidioMes : '';
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

            currentRowIndex++;
          }

          const endRow = currentRowIndex - 1;
          if (endRow > startRow) {
            worksheet.mergeCells(`A${startRow}:A${endRow}`);
            worksheet.mergeCells(`B${startRow}:B${endRow}`);
            worksheet.mergeCells(`C${startRow}:C${endRow}`);
            worksheet.mergeCells(`D${startRow}:D${endRow}`);
            worksheet.mergeCells(`E${startRow}:E${endRow}`);
            worksheet.mergeCells(`L${startRow}:L${endRow}`);
          }

          nro++;
        }

        currentRowIndex += 2;
      }
    }

    if (workbook.worksheets.length === 0) {
      const ws = workbook.addWorksheet('SIN REGISTROS');
      ws.addRow(['No se encontraron licencias de maternidad para el período y filtros seleccionados']);
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Reporte_Masivo_Maternidad_${anioDisplay}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Error generando Excel Masivo:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
