import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/core/db/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'No autorizado. Inicie sesión.' }, { status: 401 });
    }

    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No se envió ninguna imagen o archivo.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Guardar la evidencia en public/uploads comprimida a WebP
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
    const fileName = `citt-scan-${uniqueSuffix}.webp`;
    const filePath = join(uploadDir, fileName);

    // Convertir y comprimir con sharp
    const webpBuffer = await sharp(buffer)
      .rotate() // Respeta orientación EXIF de la cámara del móvil
      .webp({ quality: 85 })
      .toBuffer();

    await writeFile(filePath, webpBuffer);
    const archivoRuta = `/uploads/${fileName}`;

    // 2. Preparar imagen en base64 para Gemini Vision
    const base64Image = webpBuffer.toString('base64');
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        archivoRuta,
        archivoNombre: fileName,
        mensaje: 'Imagen guardada. No se pudo conectar a la IA por falta de API Key.',
        datos: null,
        trabajador: null
      });
    }

    // 3. Prompt de extracción especializado en CITT / Certificados Médicos de Perú
    const systemPrompt = `Eres un auditor médico experto de la Red de Salud Huánuco (DIRESA Huánuco - GOREHCO) y EsSalud Perú.
Tu tarea es examinar la fotografía de este documento (CITT - Certificado de Incapacidad Temporal para el Trabajo de EsSalud, o Certificado Médico Particular / MINSA / Colegio Médico del Perú) y extraer de forma impecable los datos requeridos.

Extrae con absoluta exactitud los siguientes campos en formato JSON:
- "dni": Número de DNI del paciente/asegurado/servidor (debe tener exactamente 8 dígitos numéricos). Si no está nítido o no existe, usa null.
- "apellidosNombres": Nombres y apellidos completos del paciente tal como figuran en el certificado.
- "numeroCertificado": Número oficial del certificado (por ejemplo: "A-123-45678-24", "CITT N°...", o código impreso).
- "origen": "ESSALUD_CITT" si es el formato oficial con logo de EsSalud o dice CITT. Si es de una clínica, médico particular, hospital MINSA o receta/descanso particular, pon "PARTICULAR".
- "tipoLicencia": "MATERNIDAD" si especifica descanso prenatal, postnatal o maternidad (98 días). "PATERNIDAD" si especifica paternidad. En cualquier otro caso de enfermedad o accidente, pon "ENFERMEDAD_COMUN".
- "fechaInicio": Fecha en que inicia el descanso médico en formato ISO YYYY-MM-DD.
- "fechaFin": Fecha en que termina el descanso médico en formato ISO YYYY-MM-DD.
- "diasOtorgados": Número entero con la cantidad de días de descanso otorgados.
- "medico": Nombre completo del médico que suscribe el certificado.
- "colegiatura": Número de colegiatura del médico (CMP) si está visible.
- "diagnostico": Diagnóstico o código CIE-10 si está visible.

Responde ÚNICAMENTE un objeto JSON válido con estas claves exactas.`;

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
        temperature: 0.1,
        maxOutputTokens: 1000
      }
    };

    // 3. Cadena activa de modelos Gemini con timeout de 8s por modelo
    const modelosDisponibles = [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash'
    ];

    let rawText: string | null = null;

    for (const modelo of modelosDisponibles) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadGemini),
            signal: AbortSignal.timeout(8000)
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || null;
          if (rawText) {
            console.log(`[OCR CITT] Reconocimiento exitoso con modelo: ${modelo}`);
            break;
          }
        } else {
          console.warn(`[OCR CITT] Modelo ${modelo} respondió status ${geminiRes.status}`);
        }
      } catch (err: any) {
        console.warn(`[OCR CITT] Error llamando a ${modelo}:`, err.message);
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
      if (!datosExtraidos.dni) {
        const dniM = jsonLimpio.match(/"dni"\s*:\s*"?(\d{8})"?/i) || 
                     jsonLimpio.match(/D\.?N\.?I\.?\s*:?\s*(\d{8})/i) ||
                     rawText.match(/(?:DNI|D\.N\.I\.?)\s*[:.]?\s*(\d{8})/i);
        if (dniM) datosExtraidos.dni = dniM[1];
      }

      if (!datosExtraidos.numeroCertificado) {
        const certM = jsonLimpio.match(/"numeroCertificado"\s*:\s*"([^"\r\n]+)"/i) || 
                      rawText.match(/([A-Z]-\d{3}-\d{8}-\d{2})/i) ||
                      rawText.match(/CITT\s*No\.?\s*:?\s*([A-Z0-9\-]+)/i);
        if (certM) datosExtraidos.numeroCertificado = certM[1];
      }

      if (!datosExtraidos.apellidosNombres) {
        const nomM = jsonLimpio.match(/"apellidosNombres"\s*:\s*"([^"\r\n]+)"/i) ||
                     rawText.match(/Nombre\s+Asegurado\s*:?\s*([A-Z\s]{4,})/i);
        if (nomM) datosExtraidos.apellidosNombres = nomM[1].trim();
      }

      if (!datosExtraidos.fechaInicio) {
        const fIniM = jsonLimpio.match(/"fechaInicio"\s*:\s*"([^"\r\n]+)"/i) ||
                      rawText.match(/Fecha\s+de\s+Inicio\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
        if (fIniM) datosExtraidos.fechaInicio = fIniM[1];
      }

      if (!datosExtraidos.fechaFin) {
        const fFinM = jsonLimpio.match(/"fechaFin"\s*:\s*"([^"\r\n]+)"/i) ||
                      rawText.match(/Fecha\s+Fin\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
        if (fFinM) datosExtraidos.fechaFin = fFinM[1];
      }

      if (!datosExtraidos.diasOtorgados) {
        const diasM = jsonLimpio.match(/"diasOtorgados"\s*:\s*"?(\d+)"?/i) ||
                      rawText.match(/Total\s+de\s+D[ií]as\s*:?\s*(\d+)/i);
        if (diasM) datosExtraidos.diasOtorgados = parseInt(diasM[1], 10);
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

      // Normalizar fechas (ej. 11/09/2026 -> 2026-09-11)
      const parseFecha = (str: any) => {
        if (!str) return null;
        const s = String(str).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const partes = s.split(/[\/\-]/);
        if (partes.length === 3) {
          if (partes[0].length === 2 && partes[2].length === 4) {
            return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
          }
        }
        return s;
      };

      if (datosExtraidos.fechaInicio) datosExtraidos.fechaInicio = parseFecha(datosExtraidos.fechaInicio);
      if (datosExtraidos.fechaFin) datosExtraidos.fechaFin = parseFecha(datosExtraidos.fechaFin);
      if (datosExtraidos.diasOtorgados) datosExtraidos.diasOtorgados = parseInt(String(datosExtraidos.diasOtorgados).replace(/\D/g, ''), 10) || 1;
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
          microred: trab.establecimiento?.microred?.nombre || 'No asignada'
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
            microred: trabPorNombre.establecimiento?.microred?.nombre || 'No asignada'
          };
          if (!datosExtraidos.dni) {
            datosExtraidos.dni = trabPorNombre.dni;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      archivoRuta,
      archivoNombre: fileName,
      datos: datosExtraidos,
      trabajador: trabajadorEncontrado
    });

  } catch (error) {
    console.error('Error en /api/licencias/escanear-citt:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor procesando el CITT.' }, { status: 500 });
  }
}
