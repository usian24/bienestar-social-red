import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/core/db/prisma';
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

    // 1. Optimizar imagen en memoria con sharp (Redimensionamiento inteligente + realce de trazos para OCR)
    // Reduce drásticamente el peso de ~4MB a ~200KB acelerando la subida y procesamiento x10
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

    // 2. Preparar imagen en base64 para Gemini Vision
    const base64Image = webpBuffer.toString('base64');
    const apiKey = process.env.GEMINI_API_KEY_SCANNER || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'No se pudo conectar a la IA por falta de API Key configurada.',
        datos: null,
        trabajador: null
      }, { status: 500 });
    }

    // 3. Prompt de extracción de alta precisión para CITT y Certificados Médicos Particulares (incluyendo letra manuscrita)
    const systemPrompt = `Eres un auditor médico experto de la Red de Salud Huánuco (DIRESA Huánuco - GOREHCO) y EsSalud Perú.
Tu tarea es examinar la fotografía de este documento y extraer de forma impecable los datos requeridos.

EL DOCUMENTO PUEDE SER:
1. CITT (Certificado de Incapacidad Temporal para el Trabajo de EsSalud): Documento digital impreso con logo de EsSalud.
2. CERTIFICADO MÉDICO PARTICULAR / MINSA / COLEGIO MÉDICO DEL PERÚ: Frecuentemente escrito a puño y letra (letra manuscrita o cursiva) por un médico cirujano.

PAUTAS CRÍTICAS PARA LECTURA DE CERTIFICADOS MANUSCRITOS:
- "dni": Busca cuidadosamente el DNI del paciente (ej: 'con DNI 46516392', 'DNI: ...', o 8 dígitos numéricos). Si no está legible, pon null.
- "apellidosNombres": Nombre y apellidos completos del paciente (ej: 'Pilar Soto Soto').
- "numeroCertificado": Si es CITT de EsSalud, busca el código tipo 'A-123-45678-24'. Si es Certificado Médico del Colegio Médico del Perú, busca el número correlativo impreso (ej: 'N° 3280683', 'N° ...').
- "origen": "ESSALUD_CITT" si es formato oficial EsSalud. Pon "PARTICULAR" si es del Colegio Médico del Perú, clínica, hospital MINSA o médico privado.
- "tipoLicencia": "MATERNIDAD" si es descanso pre/post natal (98 días). "PATERNIDAD" si es paternidad. Si es por enfermedad, dolor, contusión, accidente, etc., pon "ENFERMEDAD_COMUN".
- "fechaInicio": Fecha de inicio del descanso médico en formato YYYY-MM-DD. Si está escrito como '12/10/26' o '12/10/2026', conviértelo a '2026-10-12'.
- "fechaFin": Fecha de fin del descanso médico en formato YYYY-MM-DD. Si dice 'desde 12/10/26 al 16/10/26', 'fechaFin' es '2026-10-16'.
- "diasOtorgados": Cantidad entera de días de descanso otorgados (ambas fechas inclusive, ej: del 12 al 16 son 5 días).
- "medico": Nombre del médico que suscribe o figura en el sello (ej: 'Dr. José E. Baldera Aquino').
- "colegiatura": Número de colegiatura médica CMP (ej: '094296' o '94296').
- "diagnostico": Diagnóstico escrito y/o código CIE-10 (ej: 'Contusión en zona lumbosacro, CIE 10 - S30.0').

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

    // 4. Cadena activa de modelos Gemini: gemini-3.5-flash-lite como #1 indiscutible por fidelidad y calidad en manuscritos
    const modelosDisponibles = [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-flash-latest'
    ];

    let rawText: string | null = null;

    for (const modelo of modelosDisponibles) {
      try {
        console.log(`[OCR CITT] Iniciando análisis visual con modelo: ${modelo}...`);
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadGemini),
            signal: AbortSignal.timeout(38000) // 38s permite a Vision procesar certificados manuscritos sin corte prematuro
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || null;
          if (rawText) {
            console.log(`[OCR CITT] Reconocimiento exitoso con modelo: ${modelo}`);
            break;
          }
        } else if (geminiRes.status === 503 || geminiRes.status === 429) {
          console.warn(`[OCR CITT] Modelo ${modelo} saturado temporalmente (${geminiRes.status}), esperando 600ms antes de reintentar con el siguiente...`);
          await new Promise(r => setTimeout(r, 600));
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
                      rawText.match(/CITT\s*No\.?\s*:?\s*([A-Z0-9\-]+)/i) ||
                      rawText.match(/N[°º]\s*(\d{6,8})/i);
        if (certM) datosExtraidos.numeroCertificado = certM[1];
      }

      if (!datosExtraidos.apellidosNombres) {
        const nomM = jsonLimpio.match(/"apellidosNombres"\s*:\s*"([^"\r\n]+)"/i) ||
                     rawText.match(/Nombre\s+Asegurado\s*:?\s*([A-Z\s]{4,})/i);
        if (nomM) datosExtraidos.apellidosNombres = nomM[1].trim();
      }

      if (!datosExtraidos.fechaInicio) {
        const fIniM = jsonLimpio.match(/"fechaInicio"\s*:\s*"([^"\r\n]+)"/i) ||
                      rawText.match(/Fecha\s+de\s+Inicio\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i);
        if (fIniM) datosExtraidos.fechaInicio = fIniM[1];
      }

      if (!datosExtraidos.fechaFin) {
        const fFinM = jsonLimpio.match(/"fechaFin"\s*:\s*"([^"\r\n]+)"/i) ||
                      rawText.match(/Fecha\s+Fin\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i);
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
