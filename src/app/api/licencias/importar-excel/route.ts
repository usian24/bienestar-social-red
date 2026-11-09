import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import * as XLSX from 'xlsx';
import { canAccessWorkerMicrored, requireStaffAccess } from '@/core/auth/rbac';
import { getCalendarDateStr, parseNormalizedCalendarDate } from '@/core/licencias/calculoSubsidios';

export async function POST(request: Request) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['GESTIONAR_LICENCIAS', 'SUBIR_CITT'],
    });
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No se encontraron archivos' }, { status: 400 });
    }

    const resultados = [];
    let procesadosCount = 0;
    let omitidosCount = 0;

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        
        // Usamos type 'array' y activamos cellDates para que las fechas lleguen como strings ISO o Date objects
        const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        
        // Convertir a JSON
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Las primeras filas pueden ser encabezados. Buscamos dónde empiezan los datos reales
        // Asumimos que los datos reales empiezan cuando la primera columna tiene un DNI (8 dígitos)
        for (let i = 0; i < rows.length; i++) {
          const row: any = rows[i];
          if (!row || row.length < 10) continue;
          
          const dniStr = String(row[0]).trim();
          // Validar que parece un DNI (8 dígitos)
          if (!/^\d{8}$/.test(dniStr)) continue;
          
          const dni = dniStr;
          // Buscar trabajador e incluir establecimiento para validar microred
          const trabajador = await prisma.trabajador.findUnique({
            where: { dni },
            include: { establecimiento: true },
          });
          if (!trabajador) {
            omitidosCount++;
            resultados.push({ file: file.name, dni, status: 'error', message: 'Trabajador no encontrado en BD' });
            continue;
          }

          if (!canAccessWorkerMicrored(ctx, trabajador.establecimiento?.microredId)) {
            omitidosCount++;
            resultados.push({ file: file.name, dni, status: 'error', message: 'Trabajador pertenece a otra microred (acceso restringido)' });
            continue;
          }

          const detalle = String(row[5] || '').trim().toUpperCase(); // "ESSALUD" o "PARTICULAR"
          const motivo = String(row[7] || '').trim(); // ej: "LICENCIA POR SALUD ESSALUD NºA-002-00046023-26"
          
          // Parsear fechas. xlsx puede devolver fechas como Date, números (serial de excel) o strings
          const parseDate = (val: any): Date | null => {
            if (val instanceof Date && !isNaN(val.getTime())) {
              const adjusted = new Date(val.getTime() + 5 * 60 * 60 * 1000);
              return parseNormalizedCalendarDate(adjusted.toISOString().slice(0, 10));
            }
            if (typeof val === 'number') {
              const serialDate = new Date((val - 25569) * 86400 * 1000);
              return isNaN(serialDate.getTime())
                ? null
                : parseNormalizedCalendarDate(serialDate.toISOString().slice(0, 10));
            }
            if (typeof val === 'string') {
              const s = val.trim();
              const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
              if (dmy) {
                const iso = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
                return parseNormalizedCalendarDate(iso);
              }
              return parseNormalizedCalendarDate(s);
            }
            return null;
          };

          const fechaInicio = parseDate(row[9]);
          const fechaFin = parseDate(row[10]);

          const dias = parseInt(row[11]) || 0;

          if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) {
             omitidosCount++;
             resultados.push({ file: file.name, dni, status: 'error', message: 'Fechas inválidas' });
             continue;
          }

          // Extraer número de certificado usando Regex si es posible, sino guardar un fragmento
          let numeroCertificado = "S/N";
          const certMatch = motivo.match(/[A-Z0-9]+-\d+-\d+(-\d+)?/);
          if (certMatch) {
             numeroCertificado = certMatch[0];
          } else if (motivo.length > 5) {
             numeroCertificado = motivo.substring(0, 50); // Cortar para evitar overflow
          }

          let origen = detalle === 'ESSALUD' ? 'ESSALUD_CITT' : 'PARTICULAR';
          let tipoLicencia = 'ENFERMEDAD_COMUN'; // Por defecto para esta importación

          // Evitar duplicados (misma persona, misma fecha calendario inicio, ya sea T00:00Z o T05:00Z)
          const inicioCalStr = getCalendarDateStr(fechaInicio);
          const dayStartUtc = new Date(`${inicioCalStr}T00:00:00.000Z`);
          const dayEndUtc = new Date(`${inicioCalStr}T23:59:59.999Z`);
          const existe = await prisma.licencia.findFirst({
            where: {
              trabajadorId: trabajador.id,
              fechaInicio: { gte: dayStartUtc, lte: dayEndUtc }
            }
          });

          if (existe) {
            omitidosCount++;
            resultados.push({ file: file.name, dni, status: 'skipped', message: 'Licencia duplicada para esta fecha' });
            continue;
          }

          // Insertar en la BD usando calendario UTC normalizado
          await prisma.licencia.create({
            data: {
              trabajadorId: trabajador.id,
              tipoLicencia: tipoLicencia as any,
              origen: origen as any,
              numeroCertificado,
              fechaInicio,
              fechaFin,
              diasOtorgados: dias,
              anioEjercicio: fechaInicio.getUTCFullYear(),
              mesEjercicio: fechaInicio.getUTCMonth() + 1,
              registradoPorId: ctx.userId
            }
          });

          procesadosCount++;
          resultados.push({ file: file.name, dni, status: 'success', message: 'Registrado correctamente' });
        }
        
      } catch (err: any) {
         resultados.push({ file: file.name, status: 'error', message: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      procesados: procesadosCount,
      omitidos: omitidosCount,
      detalles: resultados
    });

  } catch (error) {
    console.error("Error importando Excel:", error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
