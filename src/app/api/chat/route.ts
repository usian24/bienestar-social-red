import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/core/db/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado. Inicie sesión.' }, { status: 401 });
    }

    const body = await request.json();
    const { mensaje, historial = [] } = body;

    if (!mensaje || typeof mensaje !== 'string') {
      return NextResponse.json({ error: 'Mensaje inválido' }, { status: 400 });
    }

    const user = session.user as any;
    const rol = user.rol || 'CONSULTA';
    const dni = user.email || '';
    const nombre = user.name || 'Servidor';
    const userMicroredId = user.microredId;
    const esSuperAdmin = rol === 'SUPER_ADMIN';

    // 1. DETECCIÓN INTELIGENTE DE BÚSQUEDA DE TRABAJADOR (PODER ABSOLUTO PARA SUPER ADMIN / ADM)
    let personaConsultada: any = null;

    // Buscar si hay un DNI de 8 dígitos en la pregunta (ej: "74425510")
    const matchDni = mensaje.match(/\b\d{8}\b/);
    if (matchDni && (esSuperAdmin || rol !== 'TRABAJADOR' || matchDni[0] === dni)) {
      const dniBuscado = matchDni[0];
      const trab = await prisma.trabajador.findUnique({
        where: { dni: dniBuscado },
        include: {
          establecimiento: { include: { microred: true } },
          licencias: { orderBy: { fechaInicio: 'asc' } }
        }
      });
      if (trab) {
        personaConsultada = formatearTrabajadorParaContexto(trab);
      }
    } else if (esSuperAdmin || rol !== 'TRABAJADOR') {
      // Si no es un DNI numérico pero el Super Admin busca por nombres o apellidos
      const stopWords = new Set([
        'hola', 'buenas', 'busca', 'buscar', 'dime', 'sobre', 'persona', 'trabajador', 'datos', 
        'informacion', 'expediente', 'licencia', 'licencias', 'cuantos', 'dias', 'quien', 'este', 
        'esta', 'salud', 'citt', 'favor', 'por', 'tiene', 'ver', 'mostrar'
      ]);
      const palabras = mensaje
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.has(w.toLowerCase()));

      if (palabras.length > 0) {
        const orConditions = palabras.flatMap(p => [
          { nombres: { contains: p, mode: 'insensitive' as const } },
          { apellidos: { contains: p, mode: 'insensitive' as const } }
        ]);

        const trab = await prisma.trabajador.findFirst({
          where: { OR: orConditions },
          include: {
            establecimiento: { include: { microred: true } },
            licencias: { orderBy: { fechaInicio: 'asc' } }
          }
        });

        if (trab) {
          personaConsultada = formatearTrabajadorParaContexto(trab);
        }
      }
    }

    // 2. CONSTRUIR MICRO-CONTEXTO SEGÚN ROL Y BÚSQUEDA
    let contextoCompacto: any = {
      rol,
      nombre,
      fechaActual: new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' })
    };

    if (personaConsultada) {
      contextoCompacto.personaConsultada = personaConsultada;
    }

    if (rol === 'TRABAJADOR') {
      // Si es trabajador y no buscó a nadie, cargamos sus propios datos
      if (!personaConsultada) {
        const trabajadorPropio = await prisma.trabajador.findUnique({
          where: { dni },
          include: {
            establecimiento: { include: { microred: true } },
            licencias: { orderBy: { fechaInicio: 'asc' } }
          }
        });
        if (trabajadorPropio) {
          contextoCompacto.misDatos = formatearTrabajadorParaContexto(trabajadorPropio);
        }
      }
    } else {
      // Administrador / SuperAdmin: Jurisdicción y KPIs globales
      const whereCl: any = {};
      if (!esSuperAdmin && userMicroredId) {
        whereCl.establecimiento = { microredId: Number(userMicroredId) };
      }

      const totalTrabajadores = await prisma.trabajador.count({ where: whereCl });
      const licenciasTotales = await prisma.licencia.count({
        where: { trabajador: whereCl }
      });

      // Conteo y detalle de alertas particulares
      const particulares = await prisma.licencia.findMany({
        where: {
          origen: 'PARTICULAR',
          trabajador: whereCl
        },
        include: {
          trabajador: {
            select: { nombres: true, apellidos: true, dni: true }
          }
        },
        orderBy: { creadoEn: 'asc' }
      });

      const hoy = new Date().getTime();
      let vencidos = 0, rojos = 0, amarillos = 0;
      const alertasCriticasList: any[] = [];

      particulares.forEach(p => {
        const diffDias = Math.ceil(Math.abs(hoy - new Date(p.creadoEn).getTime()) / (1000 * 60 * 60 * 24));
        let nivel = 'VERDE';
        if (diffDias >= 30) { vencidos++; nivel = 'VENCIDO'; }
        else if (diffDias >= 25) { rojos++; nivel = 'ROJO'; }
        else if (diffDias >= 15) { amarillos++; nivel = 'AMARILLO'; }

        if (nivel !== 'VERDE' && alertasCriticasList.length < 5) {
          alertasCriticasList.push({
            servidor: `${p.trabajador.apellidos}, ${p.trabajador.nombres}`,
            dni: p.trabajador.dni,
            certificado: p.numeroCertificado,
            diasTranscurridos: diffDias,
            nivel
          });
        }
      });

      contextoCompacto.jurisdiccion = esSuperAdmin ? 'Toda la Red de Salud Huánuco (13 Microredes)' : 'Microred Asignada';
      contextoCompacto.kpis = {
        totalTrabajadores,
        licenciasTotales,
        alertasCITT: { vencidos, rojos, amarillos },
        alertasCriticasUrgentes: alertasCriticasList
      };
    }

    // 3. VENTANA DESLIZANTE DE HISTORIAL (Últimos 4 mensajes)
    const ultimosMensajes = (Array.isArray(historial) ? historial : []).slice(-4).map((m: any) => ({
      role: m.remitente === 'asistente' ? 'model' : 'user',
      parts: [{ text: String(m.texto || '').slice(0, 500) }]
    }));

    // 4. SYSTEM PROMPT CON PODER ABSOLUTO
    const systemInstruction = `Eres "BienestarBot", el Asistente Oficial con Inteligencia Artificial del Módulo de Bienestar Social de la Red de Salud Huánuco (DIRESA Huánuco - GOREHCO).
Tu objetivo es orientar a los trabajadores y a la Jefatura/Super Administrador con máxima precisión sobre licencias médicas, descansos y subsidios.

Normativa y Reglas de Oro de Bienestar Social:
1. Salud (Enfermedad común y Accidente común): La Red de Salud Huánuco (empleador) asume únicamente los primeros 20 días en el año calendario. A partir del día 21 acumulado, corresponde Subsidio por Incapacidad Temporal para el Trabajo asumido por EsSalud.
2. Certificados médicos particulares: Deben canjearse obligatoriamente por el CITT oficial de EsSalud antes de 30 días para tramitar el reembolso del subsidio.
3. Maternidad (Ley 26644): 98 días subsidiados al 100% por EsSalud desde el día 1 (no rige la regla de los primeros 20 días de la Red).
4. Paternidad (Ley 30807): 10 días calendario con goce de haber asumidos 100% por la Red (no subsidiado).
5. Ley 30012: Hasta 7 días con goce de haber por familiar directo en estado grave o terminal.

Poder de Consulta de Expedientes:
- Si en el contexto existe el campo "personaConsultada", significa que el usuario buscó a esa persona (por DNI o por nombre). Responde con todos los detalles de su expediente: nombres completos, DNI, cargo, establecimiento, microred, días asumidos por la Red (1 al 20), días de subsidio ante EsSalud (día 21+) y lista de certificados médicos.
- Si el usuario es TRABAJADOR y pregunta por sus días, usa "misDatos".
- Si consultan sobre alertas o semáforos, utiliza "kpis.alertasCriticasUrgentes".

Contexto actual de datos en tiempo real de la Base de Datos:
${JSON.stringify(contextoCompacto)}

Instrucciones de Respuesta:
- Responde siempre en español, con tono formal, profesional y empático.
- Estructura las respuestas con negritas y viñetas para que sean fáciles de leer.
- Si te piden datos de una persona específica y está en "personaConsultada", detalla sus cifras exactas sin inventar nada.`;

    // 5. LLAMADA A GEMINI FLASH LITE CON FALLBACK RESILIENTE
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        respuesta: generarRespuestaDirecta(contextoCompacto, mensaje),
        origen: 'fallback_sin_api_key'
      });
    }

    try {
      const payloadGemini = {
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          ...ultimosMensajes,
          {
            role: 'user',
            parts: [{ text: mensaje }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 750,
          topP: 0.8
        }
      };

      const resGemini = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadGemini)
        }
      );

      if (!resGemini.ok) {
        const errorText = await resGemini.text();
        console.warn('Fallo en Gemini API, activando fallback inteligente:', resGemini.status, errorText);
        return NextResponse.json({
          respuesta: generarRespuestaDirecta(contextoCompacto, mensaje),
          origen: 'fallback_sistema'
        });
      }

      const dataGemini = await resGemini.json();
      const respuestaTexto = dataGemini?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!respuestaTexto) {
        return NextResponse.json({
          respuesta: generarRespuestaDirecta(contextoCompacto, mensaje),
          origen: 'fallback_sistema'
        });
      }

      return NextResponse.json({
        respuesta: respuestaTexto,
        origen: 'gemini_flash_lite'
      });

    } catch (apiError) {
      console.error('Error de conexión con Gemini:', apiError);
      return NextResponse.json({
        respuesta: generarRespuestaDirecta(contextoCompacto, mensaje),
        origen: 'fallback_sistema'
      });
    }

  } catch (error) {
    console.error('Error en POST /api/chat:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// Función auxiliar para formatear los datos de un trabajador
function formatearTrabajadorParaContexto(trabajador: any) {
  let diasEssalud = 0;
  let diasParticulares = 0;
  let diasPerdidos = 0;

  trabajador.licencias.forEach((lic: any) => {
    if (lic.tipoLicencia === 'ENFERMEDAD_COMUN' || lic.tipoLicencia === 'ACCIDENTE_COMUN') {
      if (lic.origen === 'ESSALUD_CITT') diasEssalud += lic.diasOtorgados;
      else if (lic.origen === 'PARTICULAR') diasParticulares += lic.diasOtorgados;
      else if (lic.origen === 'PARTICULAR_PERDIDO') diasPerdidos += lic.diasOtorgados;
    }
  });

  const totalDiasSalud = diasEssalud + diasParticulares;
  const diasRed = Math.min(totalDiasSalud, 20);
  const diasSubsidioEsSalud = Math.max(0, totalDiasSalud - 20);
  const diasRestantesRed = Math.max(0, 20 - totalDiasSalud);

  return {
    dni: trabajador.dni,
    apellidosNombres: `${trabajador.apellidos}, ${trabajador.nombres}`,
    cargo: trabajador.cargo,
    condicionLaboral: trabajador.condicionLaboral || 'No especificada',
    establecimiento: trabajador.establecimiento?.nombre || 'No asignado',
    microred: trabajador.establecimiento?.microred?.nombre || 'No asignada',
    balanceSalud: {
      totalDiasSalud,
      diasRed,
      diasSubsidioEsSalud,
      diasRestantesRed,
      diasEssalud,
      diasParticulares,
      diasPerdidos
    },
    totalLicencias: trabajador.licencias.length,
    ultimasLicencias: trabajador.licencias.slice(-6).map((l: any) => ({
      tipo: l.tipoLicencia,
      origen: l.origen,
      certificado: l.numeroCertificado,
      inicio: l.fechaInicio ? new Date(l.fechaInicio).toLocaleDateString('es-PE') : '',
      fin: l.fechaFin ? new Date(l.fechaFin).toLocaleDateString('es-PE') : '',
      dias: l.diasOtorgados
    }))
  };
}

// Fallback garantizado: si la IA se queda sin cuota o hay micro-corte de red
function generarRespuestaDirecta(contexto: any, pregunta: string): string {
  const p = pregunta.toLowerCase();

  // 1. Si se consultó una persona específica
  if (contexto.personaConsultada) {
    const pc = contexto.personaConsultada;
    const b = pc.balanceSalud;
    return `📋 **Expediente del Servidor:** ${pc.apellidosNombres}
• **DNI:** ${pc.dni}
• **Cargo:** ${pc.cargo} (${pc.condicionLaboral})
• **Lugar de Trabajo:** ${pc.establecimiento} — Microred: ${pc.microred}

📊 **Liquidación de Descansos Médicos (Salud):**
• **Total acumulado en el año:** ${b.totalDiasSalud} días.
• **Días asumidos por la Red (1 al 20):** ${b.diasRed} días ${b.diasRestantesRed > 0 ? `(le restan ${b.diasRestantesRed} días cubiertos por la Red)` : '(tope anual cubierto)'}.
• **Días en Subsidio ante EsSalud (día 21 en adelante):** ${b.diasSubsidioEsSalud} días.
• **Certificados registrados:** ${pc.totalLicencias} en total (${b.diasEssalud} días CITT, ${b.diasParticulares} días particulares).`;
  }

  // 2. Si el usuario es Trabajador consultando sus datos
  if (contexto.misDatos) {
    const md = contexto.misDatos;
    const b = md.balanceSalud;
    return `Hola ${md.apellidosNombres}. Según tu expediente en la Red de Salud Huánuco:
• Has acumulado **${b.totalDiasSalud} días** de descanso médico en el año.
• Días asumidos por la Red (1 al 20): **${b.diasRed} días** ${b.diasRestantesRed > 0 ? `(te quedan ${b.diasRestantesRed} días de cobertura directa)` : '(límite anual alcanzado)'}.
• Días en trámite de subsidio EsSalud (día 21 en adelante): **${b.diasSubsidioEsSalud} días**.`;
  }

  // 3. Alertas administrativas
  if (p.includes('alerta') || p.includes('semaforo') || p.includes('vencid') || p.includes('citt') || p.includes('rojo')) {
    const a = contexto.kpis?.alertasCITT || { vencidos: 0, rojos: 0, amarillos: 0 };
    return `🚦 **Estado del Semáforo de Canjes de CITT (${contexto.jurisdiccion}):**
• **Vencidos (30+ días):** ${a.vencidos} certificados
• **Críticos / Rojos (25 a 29 días):** ${a.rojos} certificados
• **En riesgo / Amarillos (15 a 24 días):** ${a.amarillos} certificados

Recuerda que ante EsSalud, los descansos médicos particulares prescriben si no se canjean dentro de los plazos reglamentarios.`;
  }

  return `🏛️ **Panel de Bienestar Social (${contexto.jurisdiccion}):**
• Servidores registrados: **${contexto.kpis?.totalTrabajadores || 0}**
• Licencias totales en el sistema: **${contexto.kpis?.licenciasTotales || 0}**
Puedes consultarme por cualquier servidor ingresando su **número de DNI** (ej: 74425510) o sus nombres y apellidos.`;
}
