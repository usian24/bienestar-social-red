import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export async function ensamblarExpedienteSubsidio(
  datosTrabajador: any, 
  rutasArchivosLocales: string[]
): Promise<Uint8Array> {
  // 1. Crear documento principal
  const pdfFinal = await PDFDocument.create();
  
  // Maquetado básico de la carátula (se puede ampliar con HTML -> PDF en generadorHtml.ts)
  const paginaPrincipal = pdfFinal.addPage([595.28, 841.89]); // A4 
  
  paginaPrincipal.drawText('DIRECCIÓN REGIONAL DE SALUD HUÁNUCO', { x: 150, y: 800, size: 12 });
  paginaPrincipal.drawText('RED DE SALUD HUÁNUCO - BIENESTAR SOCIAL', { x: 140, y: 780, size: 12 });
  
  paginaPrincipal.drawText(`INFORME TÉCNICO DE SUBSIDIO`, { x: 200, y: 740, size: 14 });
  
  paginaPrincipal.drawText(`Servidor: ${datosTrabajador.apellidosNombres}`, { x: 50, y: 700, size: 10 });
  paginaPrincipal.drawText(`DNI: ${datosTrabajador.dni}`, { x: 50, y: 680, size: 10 });
  paginaPrincipal.drawText(`Establecimiento: ${datosTrabajador.establecimiento}`, { x: 50, y: 660, size: 10 });
  
  paginaPrincipal.drawText(`TOTAL DÍAS EN EL AÑO: ${datosTrabajador.diasTotalesAnio}`, { x: 50, y: 620, size: 10 });
  paginaPrincipal.drawText(`DÍAS ASUMIDOS POR LA RED (1-20): ${datosTrabajador.diasEmpleador}`, { x: 50, y: 600, size: 10 });
  paginaPrincipal.drawText(`DÍAS A RECUPERAR ANTE ESSALUD: ${datosTrabajador.diasSubsidiados}`, { x: 50, y: 580, size: 10 });

  // 2. Fusionar Anexos (CITTs físicos guardados en el volumen)
  const uploadsDir = path.join(process.cwd(), 'storage_vol');

  for (const rutaRelativa of rutasArchivosLocales) {
    try {
      const rutaAbsoluta = path.join(uploadsDir, rutaRelativa);
      const archivoBuffer = await fs.readFile(rutaAbsoluta);
      
      const pdfAnexo = await PDFDocument.load(archivoBuffer);
      const paginasCopiadas = await pdfFinal.copyPages(pdfAnexo, pdfAnexo.getPageIndices());
      
      paginasCopiadas.forEach(pagina => pdfFinal.addPage(pagina));
    } catch (err) {
      console.warn(`No se pudo adjuntar el archivo ${rutaRelativa}`, err);
    }
  }

  // 3. Retornar bytes para enviar al cliente
  return await pdfFinal.save();
}

