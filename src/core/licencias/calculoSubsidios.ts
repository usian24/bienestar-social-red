export const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
] as const;

export interface LicenciaCalculoInput {
  id?: string;
  tipoLicencia?: string | null;
  origen?: string | null;
  numeroCertificado?: string | null;
  colegiatura?: string | null;
  medico?: string | null;
  diagnostico?: string | null;
  familiarPaciente?: string | null;
  fechaInicio: string | Date;
  fechaFin: string | Date;
  diasOtorgados: number;
  creadoEn?: string | Date | null;
}

/**
 * Extrae la fecha calendario exacta ('YYYY-MM-DD') evitando desplazamientos por zona horaria
 * tanto para cadenas 'YYYY-MM-DD', timestamps 'T00:00:00.000Z' como 'T05:00:00.000Z'.
 */
export function getCalendarDateStr(input: string | Date | null | undefined): string {
  if (!input) return '';
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
    if (match) return match[1];
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
  }
  if (Number.isNaN(input.getTime())) return '';
  return input.toISOString().slice(0, 10);
}

/**
 * Convierte una fecha calendario ('YYYY-MM-DD' o ISO) a medianoche de Perú (05:00:00 UTC),
 * lo que garantiza que tanto en UTC como en America/Lima el año, mes y día coincidan exactamente.
 */
export function parseNormalizedCalendarDate(input: string | Date | null | undefined): Date | null {
  const dateStr = getCalendarDateStr(input);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;

  const utcCheck = new Date(Date.UTC(y, m - 1, d, 5, 0, 0));
  if (
    utcCheck.getUTCFullYear() !== y ||
    utcCheck.getUTCMonth() !== m - 1 ||
    utcCheck.getUTCDate() !== d
  ) {
    return null;
  }
  return utcCheck;
}

export function getCalendarYear(input: string | Date | null | undefined): number {
  const str = getCalendarDateStr(input);
  if (!str) return 0;
  return Number(str.slice(0, 4)) || 0;
}

export function getCalendarMonthZero(input: string | Date | null | undefined): number {
  const str = getCalendarDateStr(input);
  if (!str) return 0;
  return (Number(str.slice(5, 7)) || 1) - 1;
}

/**
 * Formatea una fecha calendario al estándar peruano 'DD/MM/YYYY' sin corrimientos de zona horaria.
 */
export function formatCalendarDateDMY(input: string | Date | null | undefined): string {
  const dateStr = getCalendarDateStr(input);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Suma (o resta) N días calendario a una fecha 'YYYY-MM-DD' usando aritmética UTC exacta.
 */
export function addDaysToCalendarDate(dateStr: string, days: number): string {
  const clean = getCalendarDateStr(dateStr);
  if (!clean) return '';
  const [y, m, d] = clean.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Genera nombres válidos y únicos de hojas Excel (<= 31 caracteres, sin caracteres inválidos).
 */
export function buildUniqueSheetName(
  baseName: string,
  suffix: string | number,
  usedNames: Set<string>
): string {
  const cleanBase = String(baseName || 'SIN MICRORED')
    .replace(/[*?:\\/[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const suffixStr = suffix !== '' && suffix !== null && suffix !== undefined ? ` ${suffix}` : '';
  const maxBaseLen = Math.max(1, 31 - suffixStr.length);
  const candidate = `${cleanBase.slice(0, maxBaseLen).trim()}${suffixStr}`.slice(0, 31).trim();

  if (!usedNames.has(candidate)) {
    usedNames.add(candidate);
    return candidate;
  }

  let counter = 2;
  while (true) {
    const tag = ` (${counter})`;
    const avail = Math.max(1, 31 - suffixStr.length - tag.length);
    const nextCandidate = `${cleanBase.slice(0, avail).trim()}${suffixStr}${tag}`.slice(0, 31).trim();
    if (!usedNames.has(nextCandidate)) {
      usedNames.add(nextCandidate);
      return nextCandidate;
    }
    counter++;
  }
}

export interface MonthCalendarChunk {
  startStr: string;
  endStr: string;
  days: number;
  year: number;
  month: number; // 0..11
}

/**
 * Divide un rango [inicioStr, finStr] ('YYYY-MM-DD') en bloques mensuales usando calendario UTC puro.
 */
export function splitIntoMonthsCalendar(inicioStr: string, finStr: string): MonthCalendarChunk[] {
  const startClean = getCalendarDateStr(inicioStr);
  const endClean = getCalendarDateStr(finStr);
  if (!startClean || !endClean || startClean > endClean) return [];

  const chunks: MonthCalendarChunk[] = [];
  const [endY, endM, endD] = endClean.split('-').map(Number);
  const endUtc = Date.UTC(endY, endM - 1, endD);

  let [curY, curM, curD] = startClean.split('-').map(Number);
  let curUtc = Date.UTC(curY, curM - 1, curD);

  while (curUtc <= endUtc) {
    const endOfMonthDate = new Date(Date.UTC(curY, curM, 0));
    const endOfMonthUtc = endOfMonthDate.getTime();
    const chunkEndUtc = endUtc < endOfMonthUtc ? endUtc : endOfMonthUtc;

    const days = Math.floor((chunkEndUtc - curUtc) / (1000 * 60 * 60 * 24)) + 1;

    chunks.push({
      startStr: new Date(curUtc).toISOString().slice(0, 10),
      endStr: new Date(chunkEndUtc).toISOString().slice(0, 10),
      days,
      year: curY,
      month: curM - 1,
    });

    curM += 1;
    if (curM > 12) {
      curM = 1;
      curY += 1;
    }
    curD = 1;
    curUtc = Date.UTC(curY, curM - 1, curD);
  }

  return chunks;
}

function compareLicenciasCronologico(a: LicenciaCalculoInput, b: LicenciaCalculoInput): number {
  const aIni = getCalendarDateStr(a.fechaInicio);
  const bIni = getCalendarDateStr(b.fechaInicio);
  if (aIni !== bIni) return aIni.localeCompare(bIni);
  const aCre = a.creadoEn ? new Date(a.creadoEn).getTime() : 0;
  const bCre = b.creadoEn ? new Date(b.creadoEn).getTime() : 0;
  return aCre - bCre;
}

export interface ResumenSaludPorAnio {
  totalSalud: number;
  diasRedSalud: number;
  diasSubsidioEsSalud: number;
  diasRestantesRed: number;
  diasLey30012: number;
}

export interface ResumenSaludTrabajador {
  essalud: number;
  particulares: number;
  perdidos: number;
  diasLey30012: number;
  diasRedSalud: number;
  diasRed: number;
  diasSubsidioEsSalud: number;
  totalDias: number;
  porAnio: Record<number, ResumenSaludPorAnio>;
}

/**
 * Regla de los 20 días por AÑO CALENDARIO estricta sobre Salud (ENFERMEDAD_COMUN + ACCIDENTE_COMUN).
 * - ESSALUD_CITT y PARTICULAR cuentan por igual.
 * - PARTICULAR_PERDIDO no suma para la Red ni para Subsidio.
 * - LEY_30012 es 100% asumida por la Red y nunca consume los 20 días de enfermedad ni genera subsidio EsSalud.
 */
export function calcularResumenSaludTrabajador(licencias: LicenciaCalculoInput[]): ResumenSaludTrabajador {
  const ordenadas = [...licencias].sort(compareLicenciasCronologico);

  let essalud = 0;
  let particulares = 0;
  let perdidos = 0;
  let diasLey30012 = 0;

  const porAnioMap = new Map<number, {
    totalSalud: number;
    diasRedSalud: number;
    diasSubsidioEsSalud: number;
    redRestantes: number;
    diasLey30012: number;
  }>();

  const ensureAnio = (yr: number) => {
    let entry = porAnioMap.get(yr);
    if (!entry) {
      entry = { totalSalud: 0, diasRedSalud: 0, diasSubsidioEsSalud: 0, redRestantes: 20, diasLey30012: 0 };
      porAnioMap.set(yr, entry);
    }
    return entry;
  };

  for (const lic of ordenadas) {
    const tipo = lic.tipoLicencia || 'ENFERMEDAD_COMUN';
    const origen = lic.origen || 'ESSALUD_CITT';
    const dias = Number(lic.diasOtorgados) || 0;
    const yr = getCalendarYear(lic.fechaInicio) || new Date().getUTCFullYear();

    if (tipo !== 'ENFERMEDAD_COMUN' && tipo !== 'ACCIDENTE_COMUN' && tipo !== 'LEY_30012') {
      continue;
    }

    if (origen === 'ESSALUD_CITT') essalud += dias;
    else if (origen === 'PARTICULAR') particulares += dias;
    else if (origen === 'PARTICULAR_PERDIDO') {
      perdidos += dias;
      continue; // Los certificados perdidos no suman para la Red ni para el Subsidio
    }

    const anioEntry = ensureAnio(yr);

    if (tipo === 'LEY_30012') {
      diasLey30012 += dias;
      anioEntry.diasLey30012 += dias;
      continue; // Ley 30012 no consume cuota de los 20 días de enfermedad ni genera subsidio
    }

    const redDays = Math.min(dias, anioEntry.redRestantes);
    const subDays = dias - redDays;
    anioEntry.redRestantes -= redDays;
    anioEntry.totalSalud += dias;
    anioEntry.diasRedSalud += redDays;
    anioEntry.diasSubsidioEsSalud += subDays;
  }

  let diasRedSalud = 0;
  let diasSubsidioEsSalud = 0;
  const porAnio: Record<number, ResumenSaludPorAnio> = {};

  for (const [yr, data] of porAnioMap.entries()) {
    diasRedSalud += data.diasRedSalud;
    diasSubsidioEsSalud += data.diasSubsidioEsSalud;
    porAnio[yr] = {
      totalSalud: data.totalSalud,
      diasRedSalud: data.diasRedSalud,
      diasSubsidioEsSalud: data.diasSubsidioEsSalud,
      diasRestantesRed: data.redRestantes,
      diasLey30012: data.diasLey30012,
    };
  }

  const diasRed = diasRedSalud + diasLey30012;
  const totalDias = diasRed + diasSubsidioEsSalud;

  return {
    essalud,
    particulares,
    perdidos,
    diasLey30012,
    diasRedSalud,
    diasRed,
    diasSubsidioEsSalud,
    totalDias,
    porAnio,
  };
}

export interface FilaHistorialSalud {
  origenLabel: string;
  numeroCertificado: string;
  origen: string;
  colegiatura: string | null;
  medico: string | null;
  diagnostico: string | null;
  fechaInicio: string;
  fechaFin: string;
  fin20Dias: string;
  subsidioStart: string;
  subsidioEnd: string;
  diasOtorgados: number;
  redDaysUsed: number;
  subsidioDays: number;
  isRed: boolean;
  esPerdido: boolean;
}

/**
 * Calcula filas detalladas para Historial Personal de Salud (Excel personal, PDF personal y Previsualizador modal)
 * respetando cronología ascendente, reinicio anual de 20 días y exclusión de PARTICULAR_PERDIDO / LEY_30012.
 */
export function calcularHistorialDetalladoSalud(licencias: LicenciaCalculoInput[]): {
  rows: FilaHistorialSalud[];
  totalSubsidioGlobal: number;
} {
  const soloSalud = licencias
    .filter((l) => l.tipoLicencia === 'ENFERMEDAD_COMUN' || l.tipoLicencia === 'ACCIDENTE_COMUN')
    .sort(compareLicenciasCronologico);

  let currentYear = 0;
  let diasRedRestantes = 20;
  let historicFin20Str = '';
  let totalSubsidioGlobal = 0;

  const rows: FilaHistorialSalud[] = [];

  for (const lic of soloSalud) {
    const inicioStr = getCalendarDateStr(lic.fechaInicio);
    const finStr = getCalendarDateStr(lic.fechaFin) || inicioStr;
    const licYear = getCalendarYear(inicioStr);
    const dias = Number(lic.diasOtorgados) || 0;

    if (licYear !== currentYear) {
      currentYear = licYear;
      diasRedRestantes = 20;
      historicFin20Str = '';
    }

    const esPerdido = lic.origen === 'PARTICULAR_PERDIDO';
    let redDaysUsed = 0;
    let subsidioDays = 0;
    let fin20Dias = '';
    let subsidioStart = '';
    let subsidioEnd = '';

    if (!esPerdido && dias > 0) {
      redDaysUsed = Math.min(dias, diasRedRestantes);
      subsidioDays = dias - redDaysUsed;
      diasRedRestantes -= redDaysUsed;

      if (redDaysUsed > 0 && diasRedRestantes === 0 && !historicFin20Str && inicioStr) {
        const fin20DateStr = addDaysToCalendarDate(inicioStr, redDaysUsed - 1);
        historicFin20Str = formatCalendarDateDMY(fin20DateStr);
      }

      if (subsidioDays > 0 && inicioStr) {
        const subStartDateStr = addDaysToCalendarDate(inicioStr, redDaysUsed);
        subsidioStart = formatCalendarDateDMY(subStartDateStr);
        subsidioEnd = formatCalendarDateDMY(finStr);
        fin20Dias = historicFin20Str;
        totalSubsidioGlobal += subsidioDays;
      }
    }

    const numeroCertificado = lic.numeroCertificado || 'S/N';
    const colegiatura = lic.colegiatura || null;

    rows.push({
      origenLabel: colegiatura ? `${numeroCertificado} (CMP: ${colegiatura})` : numeroCertificado,
      numeroCertificado,
      origen: lic.origen || 'ESSALUD_CITT',
      colegiatura,
      medico: lic.medico || null,
      diagnostico: lic.diagnostico || null,
      fechaInicio: formatCalendarDateDMY(inicioStr),
      fechaFin: formatCalendarDateDMY(finStr),
      fin20Dias,
      subsidioStart,
      subsidioEnd,
      diasOtorgados: dias,
      redDaysUsed,
      subsidioDays,
      isRed: redDaysUsed > 0,
      esPerdido,
    });
  }

  return { rows, totalSubsidioGlobal };
}

export interface ChunkReporteProcesado<T extends LicenciaCalculoInput = LicenciaCalculoInput> {
  startStr: string;
  endStr: string;
  days: number;
  year: number;
  month: number; // 0..11
  redDaysInChunk: number;
  subsidioDaysInChunk: number;
  fin20Dias: string;
  subsidioStartStr: string;
  subsidioEndStr: string;
  origInicioFormatted: string;
  origFinFormatted: string;
  lic: T;
}

/**
 * Segmenta en chunks mensuales separando estrictamente cada régimen:
 * - ENFERMEDAD_COMUN / ACCIDENTE_COMUN: Regla acumulativa anual de 20 días (ESSALUD_CITT y PARTICULAR).
 * - MATERNIDAD: 100% subsidio EsSalud desde el día 1 (no consume cuota de enfermedad).
 * - PATERNIDAD y LEY_30012: 100% asumida por la Red (0 subsidio, no consume cuota de enfermedad).
 * - PARTICULAR_PERDIDO: 0 días Red y 0 días Subsidio.
 */
export function calcularChunksReportes<T extends LicenciaCalculoInput>(
  licencias: T[]
): ChunkReporteProcesado<T>[] {
  const ordenadas = [...licencias].sort(compareLicenciasCronologico);

  let currentIllnessYear = 0;
  let diasRedRestantes = 20;
  let historicFin20Str = '';

  const allChunks: ChunkReporteProcesado<T>[] = [];

  for (const lic of ordenadas) {
    const inicioStr = getCalendarDateStr(lic.fechaInicio);
    const finStr = getCalendarDateStr(lic.fechaFin) || inicioStr;
    if (!inicioStr || !finStr) continue;

    const origInicioFormatted = formatCalendarDateDMY(inicioStr);
    const origFinFormatted = formatCalendarDateDMY(finStr);
    const chunks = splitIntoMonthsCalendar(inicioStr, finStr);

    const tipo = lic.tipoLicencia || 'ENFERMEDAD_COMUN';
    const origen = lic.origen || 'ESSALUD_CITT';
    const esPerdido = origen === 'PARTICULAR_PERDIDO';
    const licYear = getCalendarYear(inicioStr);

    if (tipo === 'ENFERMEDAD_COMUN' || tipo === 'ACCIDENTE_COMUN') {
      if (licYear !== currentIllnessYear) {
        currentIllnessYear = licYear;
        diasRedRestantes = 20;
        historicFin20Str = '';
      }
    }

    for (const chunk of chunks) {
      let redDaysInChunk = 0;
      let subsidioDaysInChunk = 0;
      let fin20Dias = '';
      let subsidioStartStr = '';
      let subsidioEndStr = '';

      if (!esPerdido) {
        if (tipo === 'MATERNIDAD') {
          redDaysInChunk = 0;
          subsidioDaysInChunk = chunk.days;
          subsidioStartStr = formatCalendarDateDMY(chunk.startStr);
          subsidioEndStr = formatCalendarDateDMY(chunk.endStr);
        } else if (tipo === 'PATERNIDAD' || tipo === 'LEY_30012') {
          redDaysInChunk = chunk.days;
          subsidioDaysInChunk = 0;
        } else {
          redDaysInChunk = Math.min(chunk.days, diasRedRestantes);
          subsidioDaysInChunk = chunk.days - redDaysInChunk;
          diasRedRestantes -= redDaysInChunk;

          if (redDaysInChunk > 0 && diasRedRestantes === 0 && !historicFin20Str) {
            const fin20DateStr = addDaysToCalendarDate(chunk.startStr, redDaysInChunk - 1);
            historicFin20Str = formatCalendarDateDMY(fin20DateStr);
          }

          if (subsidioDaysInChunk > 0) {
            const subStartDateStr = addDaysToCalendarDate(chunk.startStr, redDaysInChunk);
            subsidioStartStr = formatCalendarDateDMY(subStartDateStr);
            subsidioEndStr = formatCalendarDateDMY(chunk.endStr);
            fin20Dias = historicFin20Str;
          }
        }
      }

      allChunks.push({
        startStr: chunk.startStr,
        endStr: chunk.endStr,
        days: chunk.days,
        year: chunk.year,
        month: chunk.month,
        redDaysInChunk,
        subsidioDaysInChunk,
        fin20Dias,
        subsidioStartStr,
        subsidioEndStr,
        origInicioFormatted,
        origFinFormatted,
        lic,
      });
    }
  }

  return allChunks;
}

