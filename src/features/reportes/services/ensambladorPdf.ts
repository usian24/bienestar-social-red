import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

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

  // 2. Fusionar Anexos (PDFs o imágenes guardadas en storage_vol/evidencias, con protección anti path-traversal)
  const storageRoot = path.resolve(process.cwd(), 'storage_vol');
  const evidenciasRoot = path.resolve(storageRoot, 'evidencias');

  for (const rutaRelativa of rutasArchivosLocales) {
    try {
      let limpia = String(rutaRelativa || '').trim();
      if (!limpia || limpia.includes('\0')) continue;
      if (limpia.startsWith('/api/evidencias/')) {
        limpia = 'evidencias/' + limpia.slice('/api/evidencias/'.length);
      } else if (limpia.startsWith('/uploads/')) {
        limpia = 'evidencias/' + limpia.slice('/uploads/'.length);
      } else {
        limpia = limpia.replace(/^\/+/, '');
        if (!limpia.startsWith('evidencias/') && !limpia.includes('/') && !limpia.includes('\\')) {
          limpia = 'evidencias/' + limpia;
        }
      }

      const rutaAbsoluta = path.resolve(storageRoot, limpia);
      if (
        !rutaAbsoluta.startsWith(storageRoot + path.sep) ||
        !rutaAbsoluta.startsWith(evidenciasRoot + path.sep)
      ) {
        console.warn(`Ruta fuera de storage_vol/evidencias rechazada: ${rutaRelativa}`);
        continue;
      }

      const archivoBuffer = await fs.readFile(rutaAbsoluta);
      const isPdf =
        rutaAbsoluta.toLowerCase().endsWith('.pdf') ||
        archivoBuffer.subarray(0, 4).toString('ascii') === '%PDF';

      if (isPdf) {
        const pdfAnexo = await PDFDocument.load(archivoBuffer);
        const paginasCopiadas = await pdfFinal.copyPages(pdfAnexo, pdfAnexo.getPageIndices());
        paginasCopiadas.forEach((pagina) => pdfFinal.addPage(pagina));
      } else {
        // Convertir cualquier imagen soportada (JPG/PNG/WEBP) a PNG compatible con pdf-lib
        const pngBuffer = await sharp(archivoBuffer).rotate().png().toBuffer();
        const embeddedImg = await pdfFinal.embedPng(pngBuffer);
        const page = pdfFinal.addPage([595.28, 841.89]);
        const maxW = 515.28;
        const maxH = 761.89;
        const scale = Math.min(maxW / embeddedImg.width, maxH / embeddedImg.height, 1);
        const w = embeddedImg.width * scale;
        const h = embeddedImg.height * scale;
        page.drawImage(embeddedImg, {
          x: (595.28 - w) / 2,
          y: (841.89 - h) / 2,
          width: w,
          height: h,
        });
      }
    } catch (err) {
      console.warn(`No se pudo adjuntar el archivo ${rutaRelativa}`, err);
    }
  }

  // 3. Retornar bytes para enviar al cliente
  return await pdfFinal.save();
}

