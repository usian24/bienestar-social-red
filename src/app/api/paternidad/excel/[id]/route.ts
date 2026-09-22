import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import ExcelJS from 'exceljs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    const trabajador = await prisma.trabajador.findUnique({
      where: { id },
      include: {
        establecimiento: { include: { microred: true } },
        licencias: {
          where: { tipoLicencia: 'PATERNIDAD' },
          orderBy: { fechaInicio: 'asc' }
        }
      }
    });

    if (!trabajador) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 });
    }

    // Cálculos de días
    let diasEssalud = 0;
    let diasParticulares = 0;

    trabajador.licencias.forEach(lic => {
      if (lic.origen === 'ESSALUD_CITT') diasEssalud += lic.diasOtorgados;
      else if (lic.origen === 'PARTICULAR') diasParticulares += lic.diasOtorgados;
    });

    const totalDias = diasEssalud + diasParticulares;
    const diasSubsidioEsSalud = 0;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Bienestar Social - Red Huánuco';
    const worksheet = workbook.addWorksheet('Historial de CITTs');

    // Estilos para encabezados
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } }, // Azul acero
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
    
    // Si no hay licencias, poner una fila vacía
    if (trabajador.licencias.length === 0) {
      worksheet.addRow({
        nro: 1, nombres: apellidosNombres, cargo: trabajador.cargo,
        establecimiento: trabajador.establecimiento.nombre, dni: trabajador.dni,
        citt: 'SIN REGISTROS', inicio: '-', fin: '-', subsidio: '-', totalCitt: 0, diasSubsidios: 0
      });
    } else {
      // Agregar filas
      trabajador.licencias.forEach((lic, idx) => {
        const dateInicio = new Date(lic.fechaInicio);
        const dateFin = new Date(lic.fechaFin);
        const fInicio = new Date(dateInicio.toLocaleString('en-US', { timeZone: 'America/Lima' })).toLocaleDateString('es-PE');
        const fFin = new Date(dateFin.toLocaleString('en-US', { timeZone: 'America/Lima' })).toLocaleDateString('es-PE');
        
        worksheet.addRow({
          nro: 1, // Siempre 1 porque es 1 solo trabajador en este reporte, o el usuario quería un correlativo general. Asumimos 1.
          nombres: apellidosNombres.toUpperCase(),
          cargo: (trabajador.cargo || '').toUpperCase(),
          establecimiento: (trabajador.establecimiento.nombre || '').toUpperCase(),
          dni: trabajador.dni,
          citt: lic.numeroCertificado,
          inicio: fInicio,
          fin: fFin,
          subsidio: fInicio, // Lo igualamos al inicio para seguir el Excel manual
          totalCitt: lic.diasOtorgados,
          diasSubsidios: diasSubsidioEsSalud // Lo pondremos en la primera fila y luego combinaremos
        });
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
        // Merge Dias Subsidios Totales
        worksheet.mergeCells(`K${rowStart}:K${rowEnd}`);
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

