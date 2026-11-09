import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import ExcelJS from 'exceljs';
import { canAccessWorkerMicrored, requireStaffAccess } from '@/core/auth/rbac';
import { formatCalendarDateDMY } from '@/core/licencias/calculoSubsidios';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

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
          where: { tipoLicencia: 'PATERNIDAD' },
          orderBy: [{ fechaInicio: 'asc' }, { creadoEn: 'asc' }]
        }
      }
    });

    if (!trabajador) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 });
    }

    if (!canAccessWorkerMicrored(ctx, trabajador.establecimiento?.microredId)) {
      return NextResponse.json({ error: 'No tiene permisos para acceder a trabajadores de otra microred' }, { status: 403 });
    }

    let totalDiasGlobal = 0;
    trabajador.licencias.forEach(lic => {
      if (lic.origen !== 'PARTICULAR_PERDIDO') {
        totalDiasGlobal += lic.diasOtorgados;
      }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Bienestar Social - Red Huánuco';
    const worksheet = workbook.addWorksheet('Historial de CITTs');

    // Estilos para encabezados
    const headerStyle = {
      font: { bold: true, color: { argb: 'FF000000' }, size: 10 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA9D08E' } }, // Verde Paternidad
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      }
    };

    // Definir las columnas
    worksheet.columns = [
      { header: 'N°', key: 'nro', width: 5 },
      { header: 'APELLIDOS Y NOMBRES', key: 'nombres', width: 35 },
      { header: 'CARGO', key: 'cargo', width: 25 },
      { header: 'ESTABLECIMIENTO', key: 'establecimiento', width: 25 },
      { header: 'DNI', key: 'dni', width: 12 },
      { header: 'CITT O CMP', key: 'citt', width: 18 },
      { header: 'FECHA DE INICIO', key: 'inicio', width: 15 },
      { header: 'FECHA FIN', key: 'fin', width: 15 },
      { header: 'TOTAL DE DIAS A CARGO RED', key: 'totalCitt', width: 25 },
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
    
    // Si no hay licencias, poner una fila vacía
    if (trabajador.licencias.length === 0) {
      worksheet.addRow({
        nro: 1, nombres: apellidosNombres, cargo: trabajador.cargo,
        establecimiento: establecimientoNombre, dni: trabajador.dni,
        citt: 'SIN REGISTROS', inicio: '-', fin: '-', totalCitt: 0
      });
    } else {
      // Agregar filas
      trabajador.licencias.forEach((lic, idx) => {
        const fInicio = formatCalendarDateDMY(lic.fechaInicio);
        const fFin = formatCalendarDateDMY(lic.fechaFin);
        const diasCargoRed = lic.origen === 'PARTICULAR_PERDIDO' ? 0 : lic.diasOtorgados;
        
        worksheet.addRow({
          nro: 1,
          nombres: apellidosNombres.toUpperCase(),
          cargo: (trabajador.cargo || '').toUpperCase(),
          establecimiento: establecimientoNombre.toUpperCase(),
          dni: trabajador.dni,
          citt: lic.numeroCertificado || 'S/N',
          inicio: fInicio,
          fin: fFin,
          totalCitt: diasCargoRed,
        });
        
        // Pintar celda total días de gris
        worksheet.getRow(idx + 2).getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      });

      // Combinar celdas para el trabajador (solo si hay más de 1 licencia)
      if (trabajador.licencias.length > 1) {
        const rowStart = 2; // Fila 1 es cabecera
        const rowEnd = rowStart + trabajador.licencias.length - 1;
        
        // Merge N°
        worksheet.mergeCells(`A${rowStart}:A${rowEnd}`);
        // Merge Nombres
        worksheet.mergeCells(`B${rowStart}:B${rowEnd}`);
        // Merge Cargo
        worksheet.mergeCells(`C${rowStart}:C${rowEnd}`);
        // Merge Establecimiento
        worksheet.mergeCells(`D${rowStart}:D${rowEnd}`);
        // Merge DNI
        worksheet.mergeCells(`E${rowStart}:E${rowEnd}`);
      }
    }

    // Centrar todo el contenido
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        });
        // Alinear a la izquierda nombres, cargo, establecimiento
        const bCell = row.getCell(2); if (bCell.value) bCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        const cCell = row.getCell(3); if (cCell.value) cCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        const dCell = row.getCell(4); if (dCell.value) dCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
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

