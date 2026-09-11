import ExcelJS from 'exceljs';
import { TipoLicencia, OrigenCertificado } from '@prisma/client';

export interface FilaExcelAsistencia {
  dni: string;
  apellidosNombres: string;
  cargo: string;
  condicionLaboral: string;
  establecimiento: string;
  microred: string;
  tipoLicencia: TipoLicencia;
  origen: OrigenCertificado;
  numeroCertificado: string;
  fechaInicio: Date;
  fechaFin: Date;
  diasOtorgados: number;
}

export async function parsearMatrizAsistencias(buffer: Buffer): Promise<FilaExcelAsistencia[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  const registros: FilaExcelAsistencia[] = [];
  
  // Procesamiento por streams/lotes
  worksheet.eachRow((row, rowNumber) => {
    // Asumimos que la fila 1 son encabezados
    if (rowNumber === 1) return;
    
    const rowValues = row.values as any[];
    
    try {
      registros.push({
        dni: String(rowValues[1] || '').trim(),
        apellidosNombres: String(rowValues[2] || '').trim(),
        cargo: String(rowValues[3] || '').trim(),
        establecimiento: String(rowValues[4] || '').trim(),
        microred: String(rowValues[5] || '').trim(),
        condicionLaboral: String(rowValues[6] || '').trim(),
        tipoLicencia: parseTipoLicencia(String(rowValues[7] || '')),
        origen: parseOrigenCertificado(String(rowValues[8] || '')),
        numeroCertificado: String(rowValues[9] || '').trim(),
        fechaInicio: new Date(rowValues[10]),
        fechaFin: new Date(rowValues[11]),
        diasOtorgados: Number(rowValues[12]) || 0
      });
    } catch (e) {
      console.warn(`Error parseando fila ${rowNumber}: `, e);
    }
  });

  return registros;
}

function parseTipoLicencia(valor: string): TipoLicencia {
  const v = valor.toUpperCase();
  if (v.includes('MATERNIDAD')) return TipoLicencia.MATERNIDAD;
  if (v.includes('PATERNIDAD')) return TipoLicencia.PATERNIDAD;
  if (v.includes('30012') || v.includes('FAMILIAR')) return TipoLicencia.LEY_30012;
  if (v.includes('ACCIDENTE')) return TipoLicencia.ACCIDENTE_COMUN;
  return TipoLicencia.ENFERMEDAD_COMUN;
}

function parseOrigenCertificado(valor: string): OrigenCertificado {
  const v = valor.toUpperCase();
  if (v.includes('CITT') || v.includes('ESSALUD')) return OrigenCertificado.ESSALUD_CITT;
  return OrigenCertificado.PARTICULAR;
}

