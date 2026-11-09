import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import ExcelJS from 'exceljs';
import { canAccessWorkerMicrored, requireStaffAccess } from '@/core/auth/rbac';
import {
  MESES,
  calcularChunksReportes,
  calcularHistorialDetalladoSalud,
} from '@/core/licencias/calculoSubsidios';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const { searchParams } = new URL(request.url);
  const isPreview = searchParams.get('preview') === 'true';

  try {
    const auth = await requireStaffAccess({
      permisos: ['EXPORTAR_EXCEL_PERSONAL', 'VER_REPORTES', 'EXPORTAR_PDF_TRAMITE'],
    });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const trabajador = await prisma.trabajador.findUnique({
      where: { id },
      include: {
        establecimiento: { include: { microred: true } },
        licencias: {
          where: { tipoLicencia: { in: ['ENFERMEDAD_COMUN', 'ACCIDENTE_COMUN'] } },
          orderBy: { fechaInicio: 'asc' }
        }
      }
    });

    if (!trabajador) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 });
    }

    if (!canAccessWorkerMicrored(ctx, trabajador.establecimiento?.microredId)) {
      return NextResponse.json({ error: 'No tiene permisos para acceder a trabajadores de otra microred' }, { status: 403 });
    }

    if (isPreview) {
      const chunks = calcularChunksReportes(trabajador.licencias);
      const mesesMap = new Map<string, { mesStr: string; totalSubsidioMes: number; licencias: any[] }>();
      let totalSubsidioGlobal = 0;

      for (const chunk of chunks) {
        const key = `${chunk.year}-${String(chunk.month + 1).padStart(2, '0')}`;
        if (!mesesMap.has(key)) {
          mesesMap.set(key, {
            mesStr: `${MESES[chunk.month]} ${chunk.year}`,
            totalSubsidioMes: 0,
            licencias: [],
          });
        }
        const entry = mesesMap.get(key)!;
        entry.totalSubsidioMes += chunk.subsidioDaysInChunk;
        totalSubsidioGlobal += chunk.subsidioDaysInChunk;

        const cert = chunk.lic.numeroCertificado || 'S/N';
        const cmp = (chunk.lic as any).colegiatura;
        entry.licencias.push({
          origen: cmp ? `${cert} (CMP: ${cmp})` : cert,
          fechaInicio: chunk.origInicioFormatted,
          fechaFin: chunk.origFinFormatted,
          fin20Dias: chunk.fin20Dias,
          subsidioStart: chunk.subsidioStartStr,
          subsidioEnd: chunk.subsidioEndStr,
          diasOtorgados: chunk.days,
          isRed: chunk.redDaysInChunk > 0,
        });
      }

      return NextResponse.json({
        trabajador,
        mesesInfo: Array.from(mesesMap.values()),
        totalSubsidioGlobal,
      });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Bienestar Social - Red Huánuco';
    const worksheet = workbook.addWorksheet('Historial de CITTs');

    // Estilos para encabezados
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } }, // Azul acero
      alignment: { horizontal: 'center' as any, vertical: 'middle' as any, wrapText: true },
      border: {
        top: { style: 'thin' as any }, left: { style: 'thin' as any },
        bottom: { style: 'thin' as any }, right: { style: 'thin' as any }
      }
    };

    // Definir las columnas
    worksheet.columns = [
      { header: 'N°', key: 'nro', width: 5 },
      { header: 'APELLIDOS Y NOMBRES', key: 'nombres', width: 35 },
      { header: 'CARGO', key: 'cargo', width: 25 },
      { header: 'CONDICIÓN LABORAL', key: 'condicion', width: 15 },
      { header: 'ESTABLECIMIENTO', key: 'establecimiento', width: 25 },
      { header: 'DNI', key: 'dni', width: 12 },
      { header: 'CITT O CMP', key: 'citt', width: 18 },
      { header: 'FECHA DE INICIO', key: 'inicio', width: 15 },
      { header: 'FECHA FIN', key: 'fin', width: 15 },
      { header: 'FIN 20 DÍAS (RED)', key: 'fin20', width: 15 },
      { header: 'FECHA SUBSIDIO', key: 'subsidio', width: 15 },
      { header: 'TOTAL DE DIAS', key: 'totalCitt', width: 12 },
      { header: 'DIAS SUBSIDIOS', key: 'diasSubsidios', width: 15 },
    ];

    // Aplicar estilos a la cabecera
    const headerRow = worksheet.getRow(1);
    headerRow.height = 40;
    headerRow.eachCell((cell) => {
      cell.fill = headerStyle.fill as ExcelJS.Fill;
      cell.font = headerStyle.font;
      cell.alignment = headerStyle.alignment as ExcelJS.Alignment;
      cell.border = headerStyle.border as ExcelJS.Borders;
    });

    const apellidosNombres = trabajador.apellidos ? `${trabajador.apellidos} ${trabajador.nombres}` : trabajador.nombres;
    const establecimientoNombre = trabajador.establecimiento?.nombre || 'NO ASIGNADO';
    const { rows: detailedRows, totalSubsidioGlobal } = calcularHistorialDetalladoSalud(trabajador.licencias);

    // Si no hay licencias, poner una fila vacía
    if (detailedRows.length === 0) {
      worksheet.addRow({
        nro: 1, nombres: apellidosNombres, cargo: trabajador.cargo, condicion: trabajador.condicionLaboral,
        establecimiento: establecimientoNombre, dni: trabajador.dni,
        citt: 'SIN REGISTROS', inicio: '-', fin: '-', fin20: '-', subsidio: '-', totalCitt: 0, diasSubsidios: 0
      });
    } else {
      detailedRows.forEach((rowInfo) => {
        const newRow = worksheet.addRow({
          nro: 1,
          nombres: apellidosNombres.toUpperCase(),
          cargo: (trabajador.cargo || '').toUpperCase(),
          condicion: (trabajador.condicionLaboral || '').toUpperCase(),
          establecimiento: establecimientoNombre.toUpperCase(),
          dni: trabajador.dni,
          citt: rowInfo.origenLabel,
          inicio: rowInfo.fechaInicio,
          fin: rowInfo.fechaFin,
          fin20: rowInfo.fin20Dias,
          subsidio: rowInfo.subsidioStart,
          totalCitt: rowInfo.diasOtorgados,
          diasSubsidios: totalSubsidioGlobal
        });

        // Pintar de azul clarito la celda TOTAL DE DIAS (columna 12) si consumió días de la RED
        if (rowInfo.isRed) {
          newRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } } as ExcelJS.Fill;
        }
      });

      // Combinar celdas para el trabajador (solo si hay más de 1 licencia)
      if (detailedRows.length > 1) {
        const rowStart = 2;
        const rowEnd = rowStart + detailedRows.length - 1;

        worksheet.mergeCells(`A${rowStart}:A${rowEnd}`);
        worksheet.mergeCells(`B${rowStart}:B${rowEnd}`);
        worksheet.mergeCells(`C${rowStart}:C${rowEnd}`);
        worksheet.mergeCells(`D${rowStart}:D${rowEnd}`);
        worksheet.mergeCells(`E${rowStart}:E${rowEnd}`);
        worksheet.mergeCells(`F${rowStart}:F${rowEnd}`);
        worksheet.mergeCells(`M${rowStart}:M${rowEnd}`);
      }
    }

    // Centrar todo el contenido
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' as any }, left: { style: 'thin' as any },
            bottom: { style: 'thin' as any }, right: { style: 'thin' as any }
          };
        });
        // Alinear a la izquierda textos largos
        const colsToLeft = [2, 3, 4, 5];
        colsToLeft.forEach(colIdx => {
           const cell = row.getCell(colIdx);
           if (cell.value) cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Historial_${trabajador.dni}_${apellidosNombres.replace(/\s+/g, '_')}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Error generando Excel:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
