import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/core/db/prisma';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const inicioT = Date.now();
  console.log(`[OCR CITT] Petición POST recibida en el servidor. Verificando sesión...`);
  try {
    // Protección contra bloqueos de NextAuth si la IP de red cambia
    const sessionPromise = getServerSession(authOptions);
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Auth timeout')), 4000)
    );
    const session = await Promise.race([sessionPromise, timeoutPromise]).catch((e) => {
      console.warn('[OCR CITT] Aviso en getServerSession (timeout o error):', e.message);
      return null;
    });

    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'No autorizado. Inicie sesión.' }, { status: 401 });
    }

    let buffer: Buffer;
    let fileName = 'citt-scan.jpg';
    let mimeType = 'image/jpeg';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const bodyJson = await req.json();
      const { imagenBase64, nombreArchivo, tipoMime } = bodyJson;

      if (!imagenBase64) {
        return NextResponse.json({ success: false, error: 'No se envió ninguna imagen o archivo.' }, { status: 400 });
      }

      fileName = nombreArchivo || 'citt-scan.jpg';
      mimeType = tipoMime || 'image/jpeg';
      const base64Data = String(imagenBase64).replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
      console.log(`[OCR CITT] Imagen recibida vía JSON ultrarrápido: "${fileName}" (${Math.round(buffer.length / 1024)} KB) en ${Date.now() - inicioT}ms`);
    } else {
      const data = await req.formData();
      const file: File | null = data.get('file') as unknown as File;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No se envió ninguna imagen o archivo.' }, { status: 400 });
      }

      fileName = file.name;
      mimeType = file.type;
      console.log(`[OCR CITT] Archivo recibido vía FormData: "${file.name}" (${Math.round(file.size / 1024)} KB, tipo: ${file.type}) en ${Date.now() - inicioT}ms`);

      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    }

    // 1. Optimizar imagen en memoria con sharp (Redimensionamiento inteligente + realce de trazos para OCR)
    const webpBuffer = await sharp(buffer)
      .rotate() // Respeta orientación EXIF de la cámara del móvil
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true
      })
      .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.7 }) // Realce de contraste para letra manuscrita a lapicero
      .webp({ quality: 85 })
      .toBuffer();

    console.log(`[OCR CITT] Imagen lista para IA: ${Math.round(webpBuffer.length / 1024)} KB en ${Date.now() - inicioT}ms`);

    // 2. Preparar imagen en base64 para Gemini Vision
    const base64Image = webpBuffer.toString('base64');
    
    // Conjunto de API keys disponibles para rotación resiliente (Scanner, Chat, Respaldo)
    const apiKeys = [
      process.env.GEMINI_API_KEY_SCANNER,
      process.env.GEMINI_API_KEY_CHAT,
      process.env.GEMINI_API_KEY
    ].filter(Boolean) as string[];

    if (apiKeys.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo conectar a la IA por falta de API Key configurada.',
        datos: null,
        trabajador: null
      }, { status: 500 });
    }

    // 3. Prompt de extracción de alta precisión para CITT, Certificados Médicos Particulares y MINSA Ley Nº 30012
    const systemPrompt = `Eres un auditor médico experto de la Red de Salud Huánuco (DIRESA Huánuco - GOREHCO) y EsSalud Perú.
Tu tarea es examinar la fotografía de este documento y extraer de forma impecable los datos requeridos.

EL DOCUMENTO PUEDE SER:
1. FORMATO DE CERTIFICADO MÉDICO LEY Nº 30012 (MINSA / Clínicas / Hospitales / IREN):
   - Encabezado: "FORMATO DE CERTIFICADO MÉDICO LEY Nº 30012", "Ley que concede el derecho de licencia a trabajadores con familiares directos con enfermedad grave o terminal o sufran accidente grave".
   - Contiene dos bloques de personas: "DATOS DEL PACIENTE" y "DATOS DEL FAMILIAR DIRECTO".
   - ¡REGLA DE ORO VITAL!: El paciente es el enfermo/hospitalizado, pero la persona con DERECHO A LA LICENCIA (trabajador de la Red de Salud) es el FAMILIAR DIRECTO.
   - "tipoLicencia": DEBE SER EXACTAMENTE "LEY_30012".
   - "origen": "PARTICULAR".
   - "dni": Extrae OBLIGATORIAMENTE el DNI de 8 dígitos de la sección "DATOS DEL FAMILIAR DIRECTO" (NO del paciente).
   - "apellidosNombres": Extrae los nombres y apellidos de "DATOS DEL FAMILIAR DIRECTO".
   - "numeroCertificado": Si tiene código correlativo o N° de historia clínica, úsalo (ej: 'HC-73512067' o el número impreso). Si no hay correlativo, pon 'LEY-30012'.
   - "fechaInicio" y "fechaFin": Busca las fechas de hospitalización o descanso indicadas (ej: 'DEL 07/10/26 AL 14/10/26' -> fechaInicio: '2026-10-07', fechaFin: '2026-10-14').
   - "diasOtorgados": Cantidad entera de días del periodo (ambas fechas inclusive, ej: del 7 al 14 son 8 días).
   - "diagnostico": Diagnóstico del paciente con CIE-10 e información del familiar (ej: 'LINFOMA NO HODGKIN DIFUSO DE CÉLULAS GRANDES (C83.3) - Paciente: Justina Morduee (Familiar Directo)').
   - "medico" y "colegiatura": Nombre del médico oncólogo o tratante y su colegiatura CMP (ej: 'Dr. Jorge A. Zegarra Cárdenas', '60354').

2. CITT (Certificado de Incapacidad Temporal para el Trabajo de EsSalud): Documento digital impreso con logo de EsSalud.
   - "origen": "ESSALUD_CITT".
   - "dni": DNI del asegurado.

3. CERTIFICADO MÉDICO PARTICULAR / COLEGIO MÉDICO DEL PERÚ: Frecuentemente manuscrito.
   - "origen": "PARTICULAR".
   - "dni": DNI del paciente/trabajador.

OTRAS REGLAS:
- "tipoLicencia": "LEY_30012" si es Ley 30012. "MATERNIDAD" si es descanso pre/post natal (98 días). "PATERNIDAD" si es paternidad. Si es por enfermedad común o accidente común, pon "ENFERMEDAD_COMUN".
- Formato de fechas: Siempre YYYY-MM-DD. Si está como '07/10/26' o '07/10/2026', conviértelo a '2026-10-07'.
- "colegiatura": Solo dígitos del CMP (ej: '60354').

Responde ÚNICAMENTE un objeto JSON válido con estas claves exactas.`;

    const schemaCitt = {
      type: "OBJECT",
      properties: {
        dni: { type: "STRING", description: "DNI de 8 dígitos del trabajador (en Ley 30012 es el FAMILIAR DIRECTO; en CITT es el paciente asegurado)" },
        apellidosNombres: { type: "STRING", description: "Apellidos y nombres completos del trabajador (en Ley 30012 es el familiar directo)" },
        numeroCertificado: { type: "STRING", description: "Código o correlativo del certificado o historia clínica (ej: A-230-00025013-20, HC-73512067, o LEY-30012)" },
        origen: { type: "STRING", enum: ["ESSALUD_CITT", "PARTICULAR"], description: "ESSALUD_CITT si es EsSalud, o PARTICULAR si es particular/MINSA/Ley 30012" },
        tipoLicencia: { type: "STRING", enum: ["ENFERMEDAD_COMUN", "ACCIDENTE_COMUN", "MATERNIDAD", "PATERNIDAD", "LEY_30012"], description: "Tipo de licencia detectada" },
        fechaInicio: { type: "STRING", description: "Fecha de inicio del descanso u hospitalización en formato YYYY-MM-DD" },
        fechaFin: { type: "STRING", description: "Fecha de fin del descanso u hospitalización en formato YYYY-MM-DD" },
        diasOtorgados: { type: "INTEGER", description: "Número entero de días otorgados" },
        medico: { type: "STRING", description: "Nombre completo del médico tratante que firma o sella" },
        colegiatura: { type: "STRING", description: "Número de colegiatura CMP del médico" },
        diagnostico: { type: "STRING", description: "Diagnóstico médico y/o código CIE-10 (incluyendo paciente y parentesco en Ley 30012)" },
        familiarPaciente: { type: "STRING", description: "En formato Ley Nº 30012: Nombre completo del familiar/paciente atendido y parentesco (ej: 'Justina Morduee Pérez (Madre)'). De lo contrario dejar vacío." }
      },
      required: ["dni", "numeroCertificado", "fechaInicio", "fechaFin", "diasOtorgados"]
    };

    const payloadGemini = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inline_data: {
                mime_type: 'image/webp',
                data: base64Image
              }
            },
            {
              text: systemPrompt
            }
          ]
        }
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: schemaCitt,
        temperature: 0.1,
        maxOutputTokens: 2000
      }
    };

    // 4. Cadena activa de modelos Gemini: gemini-3.5-flash-lite prioritario con rotación de claves
    // Probado en vivo: gemini-3.5-flash-lite responde en 3.6s - 5.4s con 100% éxito en las 3 llaves
    const modelosDisponibles = [
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash'
    ];

    let rawText: string | null = null;
    const timeoutMs = 25000; // 25 segundos para asegurar respuesta completa en documentos complejos o manuscritos

    for (const modelo of modelosDisponibles) {
      if (rawText) break;
      for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[i];
        try {
          console.log(`[OCR CITT] Probando ${modelo} con clave ${i + 1}/${apiKeys.length} (límite: ${timeoutMs / 1000}s)...`);
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payloadGemini),
              signal: AbortSignal.timeout(timeoutMs)
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || null;
            if (rawText) {
              console.log(`[OCR CITT] Reconocimiento exitoso con ${modelo} (clave ${i + 1}) en ${Date.now() - inicioT}ms`);
              break;
            }
          } else if (geminiRes.status === 429) {
            console.warn(`[OCR CITT] Cuota ocupada en clave ${i + 1} para ${modelo} (429), rotando de inmediato a la siguiente clave...`);
            continue;
          } else if (geminiRes.status === 503) {
            console.warn(`[OCR CITT] Modelo ${modelo} con alta demanda temporal (503), rotando clave...`);
            continue;
          } else {
            console.warn(`[OCR CITT] Modelo ${modelo} respondió HTTP ${geminiRes.status}`);
            continue;
          }
        } catch (err: any) {
          console.warn(`[OCR CITT] Error o timeout en ${modelo} con clave ${i + 1}:`, err.message);
          continue;
        }
      }
    }

    let datosExtraidos: any = null;
    if (rawText) {
      const jsonLimpio = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      try {
        datosExtraidos = JSON.parse(jsonLimpio);
      } catch (e) {
        console.warn('Error en JSON.parse, aplicando extracción resiliente por expresiones regulares:', e);
        datosExtraidos = {};
      }

      if (!datosExtraidos || typeof datosExtraidos !== 'object') {
        datosExtraidos = {};
      }

      // Suplementación y validación con expresiones regulares de alta precisión
      // Detección proactiva de Ley 30012 (MINSA Formato Familiar Directo)
      const esLey30012 = /30012/i.test(rawText || '') ||
                         /FAMILIAR(?:ES)?\s+DIRECTO/i.test(rawText || '') ||
                         datosExtraidos.tipoLicencia === 'LEY_30012';

      if (esLey30012) {
        datosExtraidos.tipoLicencia = 'LEY_30012';
        datosExtraidos.origen = 'PARTICULAR';

        // En Ley 30012, el trabajador asegurado es el FAMILIAR DIRECTO, no el paciente enfermo
        const dniFamiliarM = rawText.match(/(?:FAMILIAR\s+DIRECTO|DATOS\s+DEL\s+FAMILIAR)[\s\S]{1,250}?(?:DNI|DOCUMENTO)?\s*[:.]?\s*(\d{8})/i);
        if (dniFamiliarM) {
          datosExtraidos.dni = dniFamiliarM[1];
        }
      }

      if (!datosExtraidos.dni) {
        const dniM = jsonLimpio.match(/"dni"\s*:\s*"?(\d{8})"?/i) || 
                     jsonLimpio.match(/D\.?N\.?I\.?\s*[:.]?\s*"?(\d{8})"?/i) ||
                     rawText.match(/(?:DNI|D\.N\.I\.?|DOCUMENTO)\s*[:.]?\s*(\d{8})/i);
        if (dniM) datosExtraidos.dni = dniM[1];
      }

      if (!datosExtraidos.numeroCertificado) {
        const certM = jsonLimpio.match(/"numeroCertificado"\s*:\s*"([^"\r\n]+)"/i) || 
                      rawText.match(/([A-Z]-\d{3,4}-\d{4,10}-\d{2})/i) ||
                      rawText.match(/CITT\s*(?:N[°ºo\.]*)?\s*[:.]?\s*([A-Z0-9\-]+)/i) ||
                      rawText.match(/N[°º]\s*(\d{6,8})/i);
        if (certM) {
          datosExtraidos.numeroCertificado = certM[1];
        } else if (esLey30012) {
          const hcM = rawText.match(/(?:Historia\s+Cl[íi]nica|H\.C\.)\s*[:.]?\s*([A-Z0-9\-]+)/i);
          datosExtraidos.numeroCertificado = hcM ? `HC-${hcM[1]}` : 'LEY-30012';
        }
      }

      if (!datosExtraidos.apellidosNombres) {
        const nomM = jsonLimpio.match(/"apellidosNombres"\s*:\s*"([^"\r\n]+)"/i) ||
                     rawText.match(/(?:Nombre|Asegurado|Paciente)\s*[:.]?\s*([A-ZÁÉÍÓÚÑa-záéíóúñ,\s]{4,50})/i);
        if (nomM) datosExtraidos.apellidosNombres = nomM[1].trim();
      }

      if (!datosExtraidos.fechaInicio) {
        const fIniM = jsonLimpio.match(/"fechaInicio"\s*:\s*"([^"\r\n]+)"/i) ||
                      rawText.match(/(?:Desde|Inicio|A partir del)\s*[:.]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ||
                      rawText.match(/Fecha\s+de\s+Inicio\s*[:.]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
        if (fIniM) datosExtraidos.fechaInicio = fIniM[1];
      }

      if (!datosExtraidos.fechaFin) {
        const fFinM = jsonLimpio.match(/"fechaFin"\s*:\s*"([^"\r\n]+)"/i) ||
                      rawText.match(/(?:Hasta|Fin|T[ée]rmino)\s*[:.]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ||
                      rawText.match(/Fecha\s+Fin\s*[:.]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
        if (fFinM) datosExtraidos.fechaFin = fFinM[1];
      }

      if (!datosExtraidos.diasOtorgados) {
        const diasM = jsonLimpio.match(/"diasOtorgados"\s*:\s*"?(\d+)"?/i) ||
                      rawText.match(/(?:Total\s+de\s+D[ií]as|Total|D[ií]as\s+Otorgados)\s*[:.]?\s*(\d+)/i) ||
                      rawText.match(/(\d+)\s+d[ií]as/i);
        if (diasM) datosExtraidos.diasOtorgados = parseInt(diasM[1], 10);
      }

      if (!datosExtraidos.medico) {
        const medM = jsonLimpio.match(/"medico"\s*:\s*"([^"\r\n]+)"/i) ||
                     rawText.match(/(?:Dr\.|Dra\.|M[ée]dico(?:\s+Tratante)?)\s*[:.]?\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\.\s]{4,40})/i);
        if (medM) datosExtraidos.medico = medM[1].trim();
      }

      if (!datosExtraidos.colegiatura) {
        const colM = jsonLimpio.match(/"colegiatura"\s*:\s*"([^"\r\n]+)"/i) ||
                     rawText.match(/(?:CMP|C\.M\.P\.?|Colegiatura)\s*[:.]?\s*(\d{4,7})/i);
        if (colM) datosExtraidos.colegiatura = colM[1];
      }

      if (!datosExtraidos.diagnostico) {
        const diagM = jsonLimpio.match(/"diagnostico"\s*:\s*"([^"\r\n]+)"/i) ||
                      rawText.match(/(?:Diagn[oó]stico|CIE-?10)\s*[:.]?\s*([^\r\n,]{4,60})/i);
        if (diagM) datosExtraidos.diagnostico = diagM[1].trim();
      }

      if (!datosExtraidos.familiarPaciente) {
        const famM = jsonLimpio.match(/"familiarPaciente"\s*:\s*"([^"\r\n]+)"/i) ||
                     rawText.match(/(?:Familiar(?:\s+Directo)?|Paciente(?:\s+Atendido)?)\s*[:.]?\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\.\s\(\)]{4,50})/i);
        if (famM) datosExtraidos.familiarPaciente = famM[1].trim();
      }
    }

    // Normalizar datos extraídos
    if (datosExtraidos) {
      // Normalizar DNI
      if (datosExtraidos.dni) {
        const soloDigitos = String(datosExtraidos.dni).replace(/\D/g, '');
        if (soloDigitos.length >= 8) {
          datosExtraidos.dni = soloDigitos.slice(-8);
        }
      }

      // Normalizar fechas (ej. 12/10/26 o 12/10/2026 -> 2026-10-12)
      const parseFecha = (str: any) => {
        if (!str) return null;
        const s = String(str).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const partes = s.split(/[\/\-]/);
        if (partes.length === 3) {
          // DD/MM/YYYY o DD-MM-YYYY
          if (partes[0].length <= 2 && partes[2].length === 4) {
            return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
          }
          // DD/MM/YY (ej: 12/10/26 -> 2026-10-12)
          if (partes[0].length <= 2 && partes[2].length === 2) {
            const yy = parseInt(partes[2], 10);
            const anioCompleto = yy < 50 ? `20${partes[2]}` : `19${partes[2]}`;
            return `${anioCompleto}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
          }
          // YYYY/MM/DD
          if (partes[0].length === 4 && partes[2].length <= 2) {
            return `${partes[0]}-${partes[1].padStart(2, '0')}-${partes[2].padStart(2, '0')}`;
          }
        }
        return s;
      };

      if (datosExtraidos.fechaInicio) datosExtraidos.fechaInicio = parseFecha(datosExtraidos.fechaInicio);
      if (datosExtraidos.fechaFin) datosExtraidos.fechaFin = parseFecha(datosExtraidos.fechaFin);

      // Si no vino diasOtorgados o es 0, calcular automáticamente a partir de fechaInicio y fechaFin
      if (datosExtraidos.fechaInicio && datosExtraidos.fechaFin) {
        try {
          const dIni = new Date(datosExtraidos.fechaInicio + 'T00:00:00');
          const dFin = new Date(datosExtraidos.fechaFin + 'T00:00:00');
          if (!isNaN(dIni.getTime()) && !isNaN(dFin.getTime()) && dFin >= dIni) {
            const diffDias = Math.round((dFin.getTime() - dIni.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            if (!datosExtraidos.diasOtorgados || datosExtraidos.diasOtorgados <= 0) {
              datosExtraidos.diasOtorgados = diffDias;
            }
          }
        } catch (e) {}
      }

      if (datosExtraidos.diasOtorgados) {
        datosExtraidos.diasOtorgados = parseInt(String(datosExtraidos.diasOtorgados).replace(/\D/g, ''), 10) || 1;
      }
    }

    // 4. Búsqueda automática del trabajador en la base de datos de la Red de Salud
    let trabajadorEncontrado: any = null;

    if (datosExtraidos?.dni && /^\d{8}$/.test(String(datosExtraidos.dni).trim())) {
      const dniLimpio = String(datosExtraidos.dni).trim();
      const trab = await prisma.trabajador.findUnique({
        where: { dni: dniLimpio },
        include: {
          establecimiento: {
            include: { microred: true }
          }
        }
      });

      if (trab) {
        trabajadorEncontrado = {
          id: trab.id,
          dni: trab.dni,
          nombres: trab.nombres,
          apellidos: trab.apellidos,
          apellidosNombres: `${trab.apellidos}, ${trab.nombres}`,
          cargo: trab.cargo,
          condicionLaboral: trab.condicionLaboral,
          establecimiento: trab.establecimiento?.nombre || 'No asignado',
          microred: trab.establecimiento?.microred?.nombre || 'No asignada',
          microredId: trab.establecimiento?.microredId || null
        };
      }
    }

    // Si no se encontró por DNI pero vino nombre, intentar búsqueda secundaria por nombre
    if (!trabajadorEncontrado && datosExtraidos?.apellidosNombres) {
      const palabras = String(datosExtraidos.apellidosNombres)
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter(w => w.length >= 3);

      if (palabras.length >= 2) {
        const trabPorNombre = await prisma.trabajador.findFirst({
          where: {
            AND: palabras.slice(0, 3).map(p => ({
              OR: [
                { nombres: { contains: p, mode: 'insensitive' as const } },
                { apellidos: { contains: p, mode: 'insensitive' as const } }
              ]
            }))
          },
          include: {
            establecimiento: {
              include: { microred: true }
            }
          }
        });

        if (trabPorNombre) {
          trabajadorEncontrado = {
            id: trabPorNombre.id,
            dni: trabPorNombre.dni,
            nombres: trabPorNombre.nombres,
            apellidos: trabPorNombre.apellidos,
            apellidosNombres: `${trabPorNombre.apellidos}, ${trabPorNombre.nombres}`,
            cargo: trabPorNombre.cargo,
            condicionLaboral: trabPorNombre.condicionLaboral,
            establecimiento: trabPorNombre.establecimiento?.nombre || 'No asignado',
            microred: trabPorNombre.establecimiento?.microred?.nombre || 'No asignada',
            microredId: trabPorNombre.establecimiento?.microredId || null
          };
          if (!datosExtraidos.dni) {
            datosExtraidos.dni = trabPorNombre.dni;
          }
        }
      }
    }

    // 5. Verificación de Seguridad y RBAC por Microred
    const userRol = (session.user as any)?.rol;
    const userMicroredId = (session.user as any)?.microredId ? Number((session.user as any).microredId) : null;
    const userMicroredNombre = (session.user as any)?.microredNombre || 'Sede Local';
    const isSuperAdmin = userRol === 'SUPER_ADMIN';

    let bloqueadoPorMicrored = false;
    let mensajeMicrored = '';

    if (trabajadorEncontrado && !isSuperAdmin && userMicroredId) {
      if (trabajadorEncontrado.microredId && trabajadorEncontrado.microredId !== userMicroredId) {
        bloqueadoPorMicrored = true;
        mensajeMicrored = `Este servidor pertenece a la microred "${trabajadorEncontrado.microred}". Tu cuenta sólo tiene permisos para gestionar personal de la microred "${userMicroredNombre}". Solo el Super Admin puede registrar descansos médicos de otras sedes.`;
      }
    }

    // Si la imagen no arrojó ningún dato legible
    if (!datosExtraidos || (!datosExtraidos.dni && !datosExtraidos.numeroCertificado && !datosExtraidos.apellidosNombres && !datosExtraidos.medico)) {
      return NextResponse.json({
        success: false,
        error: 'No se detectaron datos legibles en la imagen escaneada. Asegúrese de enfocar bien el documento con buena iluminación, o complete el registro en la pestaña Formulario Manual.',
        datos: null,
        trabajador: null
      });
    }

    return NextResponse.json({
      success: true,
      datos: datosExtraidos,
      trabajador: trabajadorEncontrado,
      bloqueadoPorMicrored,
      mensajeMicrored,
      microredTrabajador: trabajadorEncontrado?.microred || null,
      microredUsuario: userMicroredNombre
    });

  } catch (error) {
    console.error('Error en /api/licencias/escanear-citt:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor procesando el CITT.' }, { status: 500 });
  }
}
