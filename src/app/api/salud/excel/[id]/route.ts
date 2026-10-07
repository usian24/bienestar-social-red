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
          where: { tipoLicencia: { in: ['ENFERMEDAD_COMUN', 'ACCIDENTE_COMUN'] } },
          orderBy: { fechaInicio: 'asc' }
        }
      }
    });

    if (!trabajador) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 });
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
    
    // Si no hay licencias, poner una fila vacía
    if (trabajador.licencias.length === 0) {
      worksheet.addRow({
        nro: 1, nombres: apellidosNombres, cargo: trabajador.cargo, condicion: trabajador.condicionLaboral,
        establecimiento: trabajador.establecimiento.nombre, dni: trabajador.dni,
        citt: 'SIN REGISTROS', inicio: '-', fin: '-', fin20: '-', subsidio: '-', totalCitt: 0, diasSubsidios: 0
      });
    } else {
      let currentYearForPrecalc = 0;
      let diasRedRestantes = 20;
      let totalSubsidioGlobal = 0;

      // Pre-calcular el subsidio global
      trabajador.licencias.forEach((lic) => {
        const licYear = new Date(lic.fechaInicio).getFullYear();
        if (licYear !== currentYearForPrecalc) {
          currentYearForPrecalc = licYear;
          diasRedRestantes = 20;
        }
        const redDays = Math.min(lic.diasOtorgados, diasRedRestantes);
        const subDays = lic.diasOtorgados - redDays;
        diasRedRestantes -= redDays;
        totalSubsidioGlobal += subDays;
      });

      let currentYearForRender = 0;
      diasRedRestantes = 20; // Reiniciar para el renderizado
      let historicFin20Str = '';

      // Calcular filas
      trabajador.licencias.forEach((lic) => {
        const licYear = new Date(lic.fechaInicio).getFullYear();
        if (licYear !== currentYearForRender) {
          currentYearForRender = licYear;
          diasRedRestantes = 20;
          historicFin20Str = '';
        }

        const dateInicio = new Date(lic.fechaInicio);
        const dateFin = new Date(lic.fechaFin);

        // Mantener las fechas locales correctas usando UTC
        const fInicio = dateInicio.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
        const fFin = dateFin.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
        
        let redDaysUsed = 0;
        let subsidioDays = 0;
        let fin20Str = '';
        let subsidioInicioStr = '';

        redDaysUsed = Math.min(lic.diasOtorgados, diasRedRestantes);
        subsidioDays = lic.diasOtorgados - redDaysUsed;
        diasRedRestantes -= redDaysUsed;
        
        if (redDaysUsed > 0 && diasRedRestantes === 0 && !historicFin20Str) {
           const fin20Obj = new Date(dateInicio.getTime());
           fin20Obj.setDate(fin20Obj.getDate() + redDaysUsed - 1);
           historicFin20Str = fin20Obj.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
        }

        if (subsidioDays > 0) {
           const subStartObj = new Date(dateInicio.getTime());
           subStartObj.setDate(subStartObj.getDate() + redDaysUsed);
           subsidioInicioStr = subStartObj.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
           
           fin20Str = historicFin20Str;
        }

        const newRow = worksheet.addRow({
          nro: 1, // Siempre 1
          nombres: apellidosNombres.toUpperCase(),
          cargo: (trabajador.cargo || '').toUpperCase(),
          condicion: (trabajador.condicionLaboral || '').toUpperCase(),
          establecimiento: (trabajador.establecimiento.nombre || '').toUpperCase(),
          dni: trabajador.dni,
          citt: lic.numeroCertificado,
          inicio: fInicio,
          fin: fFin,
          fin20: fin20Str,
          subsidio: subsidioInicioStr, 
          totalCitt: lic.diasOtorgados,
          diasSubsidios: totalSubsidioGlobal 
        });

        // Pintar de azul clarito ("azito") la celda TOTAL DE DIAS (columna 12) si consumió días de la RED
        if (redDaysUsed > 0) {
            newRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } } as ExcelJS.Fill;
        }
      });

      // Combinar celdas para el trabajador (solo si hay más de 1 licencia)
      if (trabajador.licencias.length > 1) {
        const rowStart = 2; // Fila 1 es cabecera
        const rowEnd = rowStart + trabajador.licencias.length - 1;
        
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
