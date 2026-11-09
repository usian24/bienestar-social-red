import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import * as XLSX from 'xlsx';
import { canAccessWorkerMicrored, requireStaffAccess } from '@/core/auth/rbac';

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
          
          // Parsear fechas. xlsx puede devolver fechas como números (serial de excel) o strings ("2026-08-01")
          let fechaInicio: Date | null = null;
          let fechaFin: Date | null = null;
          
          const parseDate = (val: any) => {
             let d = null;
             if (val instanceof Date) {
                 d = val;
             } else if (typeof val === 'number') {
                 d = new Date((val - 25569) * 86400 * 1000);
             } else if (typeof val === 'string') {
                 d = new Date(val);
             }
             
             if (d && !isNaN(d.getTime())) {
                 // Las fechas llegan como medianoche UTC (ej. 2026-08-01T00:00:00.000Z).
                 // Le sumamos 5 horas para que sea 05:00:00 UTC, lo que equivale a la medianoche exacta en Perú (UTC-5).
                 return new Date(d.getTime() + (5 * 60 * 60 * 1000));
             }
             return null;
          };

          fechaInicio = parseDate(row[9]);
          fechaFin = parseDate(row[10]);
          
          const dias = parseInt(row[11]) || 0;

          if (!fechaInicio || !fechaFin || isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
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

          // Evitar duplicados (misma persona, misma fecha inicio)
          const existe = await prisma.licencia.findFirst({
            where: {
              trabajadorId: trabajador.id,
              fechaInicio: fechaInicio
            }
          });

          if (existe) {
            omitidosCount++;
            resultados.push({ file: file.name, dni, status: 'skipped', message: 'Licencia duplicada para esta fecha' });
            continue;
          }

          // Insertar en la BD
          await prisma.licencia.create({
            data: {
              trabajadorId: trabajador.id,
              tipoLicencia: tipoLicencia as any,
              origen: origen as any,
              numeroCertificado,
              fechaInicio,
              fechaFin,
              diasOtorgados: dias,
              anioEjercicio: fechaInicio.getFullYear(),
              mesEjercicio: fechaInicio.getMonth() + 1,
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
