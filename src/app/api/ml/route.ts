import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { requireStaffAccess } from '@/core/auth/rbac';

const execPromise = util.promisify(exec);

const INSIGHTS_PATH = path.join(process.cwd(), 'ml_engine', 'output', 'ml_insights.json');
const PYTHON_PATH = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
const TRAIN_SCRIPT = path.join(process.cwd(), 'ml_engine', 'train_all_models.py');
const EXTRACT_SCRIPT = path.join(process.cwd(), 'ml_engine', 'extract_from_db.js');

const normalizeMr = (s: string) =>
  s
    ? s
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/^MICRO\s*RED\s+/i, '')
        .replace(/^MR\s+/i, '')
        .replace(/SAN\s*FCO\.?/i, 'SAN FRANCISCO')
        .replace(/STA\.?/i, 'SANTA')
        .replace(/\./g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

const matchMr = (a: string, b: string) => {
  const na = normalizeMr(a);
  const nb = normalizeMr(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAccess();
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    if (!fs.existsSync(INSIGHTS_PATH)) {
      return NextResponse.json(
        {
          error: 'Los modelos de Machine Learning no han sido entrenados todavía.',
          necesitaEntrenamiento: true,
        },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(INSIGHTS_PATH, 'utf-8');
    const data = JSON.parse(fileContent);

    const esSuperAdmin = ctx.isSuperAdmin;
    const { searchParams } = new URL(request.url);
    const requestedMicrored = searchParams.get('microred');
    const userMicroredNombre = ctx.microredNombre;

    if (!esSuperAdmin && !userMicroredNombre) {
      return NextResponse.json({ error: 'Su cuenta no tiene una microred asignada.' }, { status: 403 });
    }

    const microredFiltro = !esSuperAdmin
      ? userMicroredNombre
      : requestedMicrored && requestedMicrored !== 'TODAS'
      ? requestedMicrored
      : null;

    data.esSuperAdmin = esSuperAdmin;
    data.usuarioMicrored = userMicroredNombre || null;
    data.yaSegmentadoPorServidor = false;

    if (microredFiltro) {
      // Cuota real de la microred basada en subsidios/días de salud respecto al consolidado provincial
      let ratio = 0;
      let mrPersonalTotal = 0;

      if (Array.isArray(data.modelo4_clustering?.microredesDetalle)) {
        const detalles = data.modelo4_clustering.microredesDetalle as any[];
        const mrMatches = detalles.filter((m) => matchMr(m.microred, microredFiltro));
        mrPersonalTotal = mrMatches.reduce((s, m) => s + (m.totalPersonal || 0), 0);

        const totalSubProv = detalles.reduce((s, m) => s + (m.diasSubsidioReales || 0), 0);
        const totalSaludProv = detalles.reduce((s, m) => s + (m.diasSaludTotales || 0), 0);

        if (totalSubProv > 0) {
          const mrSub = mrMatches.reduce((s, m) => s + (m.diasSubsidioReales || 0), 0);
          ratio = mrSub / totalSubProv;
        } else if (totalSaludProv > 0) {
          const mrSalud = mrMatches.reduce((s, m) => s + (m.diasSaludTotales || 0), 0);
          ratio = mrSalud / totalSaludProv;
        }
      }

      // 1. Filtrar Casos Atípicos (Modelo 2) - Estrictamente de la microred
      if (data.modelo2_anomalias?.topCasosAtipicos) {
        const filtrados = data.modelo2_anomalias.topCasosAtipicos.filter((c: any) =>
          matchMr(c.microred, microredFiltro)
        );
        data.modelo2_anomalias.topCasosAtipicos = filtrados;
        data.modelo2_anomalias.totalAtipicos = filtrados.length;
        if (mrPersonalTotal > 0) {
          data.modelo2_anomalias.totalAnalizados = mrPersonalTotal;
          const cntCrit = filtrados.filter((c: any) => c.scoreRiesgo >= 95).length;
          const cntMod = filtrados.filter((c: any) => c.scoreRiesgo >= 80 && c.scoreRiesgo < 95).length;
          const cntMon = filtrados.filter((c: any) => c.scoreRiesgo >= 60 && c.scoreRiesgo < 80).length;
          const cntNorm = Math.max(0, mrPersonalTotal - cntCrit - cntMod - cntMon);
          data.modelo2_anomalias.distribucionRiesgo = [
            { rango: 'Riesgo Normal (0% - 60%)', total: cntNorm, pct: Number(((cntNorm / mrPersonalTotal) * 100).toFixed(1)), nivel: 'normal' },
            { rango: 'Bajo Monitoreo (60% - 80%)', total: cntMon, pct: Number(((cntMon / mrPersonalTotal) * 100).toFixed(1)), nivel: 'monitoreo' },
            { rango: 'Alerta Moderada (80% - 94%)', total: cntMod, pct: Number(((cntMod / mrPersonalTotal) * 100).toFixed(1)), nivel: 'moderada' },
            { rango: 'Alerta Critica (95% - 100%)', total: cntCrit, pct: Number(((cntCrit / mrPersonalTotal) * 100).toFixed(1)), nivel: 'critica' },
          ];
        }
      }

      // 2. Filtrar Certificados en Riesgo (Modelo 3) - Estrictamente de la microred
      if (data.modelo3_riesgo_citt?.topCertificadosRiesgo) {
        const certsFiltrados = data.modelo3_riesgo_citt.topCertificadosRiesgo.filter((c: any) =>
          matchMr(c.microred, microredFiltro)
        );
        data.modelo3_riesgo_citt.topCertificadosRiesgo = certsFiltrados;
        data.modelo3_riesgo_citt.resumenAlertas = {
          criticos: certsFiltrados.filter((c: any) => c.nivelRiesgo === 'CRÍTICO').length,
          moderados: certsFiltrados.filter((c: any) => c.nivelRiesgo === 'MODERADO').length,
          bajo: certsFiltrados.filter((c: any) => c.nivelRiesgo === 'BAJO').length,
        };
      }

      // 3. Modelo 1 Forecasting - Historial real de la microred + proyecciones escaladas por cuota real
      if (data.modelo1_forecasting) {
        if (Array.isArray(data.modelo1_forecasting.proyeccionesProximosMeses)) {
          data.modelo1_forecasting.proyeccionesProximosMeses =
            data.modelo1_forecasting.proyeccionesProximosMeses.map((p: any) => ({
              ...p,
              diasSubsidioEstimados: Math.round((p.diasSubsidioEstimados || 0) * ratio),
              rangoMin: Math.round((p.rangoMin || 0) * ratio),
              rangoMax: Math.round((p.rangoMax || 0) * ratio),
              montoEstimadoRecupero: Math.round((p.montoEstimadoRecupero || 0) * ratio * 100) / 100,
            }));
        }

        const porMr = data.modelo1_forecasting.historialPorMicrored;
        if (porMr && typeof porMr === 'object') {
          const matchingKeys = Object.keys(porMr).filter((k) => matchMr(k, microredFiltro));
          if (matchingKeys.length > 0 && Array.isArray(data.modelo1_forecasting.historialMensual)) {
            const baseMonths = data.modelo1_forecasting.historialMensual as any[];
            data.modelo1_forecasting.historialMensual = baseMonths.map((bm, idx) => {
              let sub = 0;
              let salud = 0;
              for (const k of matchingKeys) {
                const entry = porMr[k]?.[idx];
                if (entry) {
                  sub += entry.diasSubsidio || 0;
                  salud += entry.totalDiasSalud || 0;
                }
              }
              return { ...bm, diasSubsidio: sub, totalDiasSalud: salud };
            });
          } else if (Array.isArray(data.modelo1_forecasting.historialMensual)) {
            data.modelo1_forecasting.historialMensual = data.modelo1_forecasting.historialMensual.map((bm: any) => ({
              ...bm,
              diasSubsidio: Math.round((bm.diasSubsidio || 0) * ratio),
              totalDiasSalud: Math.round((bm.totalDiasSalud || 0) * ratio),
            }));
          }
          if (!esSuperAdmin) {
            delete data.modelo1_forecasting.historialPorMicrored;
          }
        }
      }

      // 4. Modelo 5 Procedencia (Solo establecimientos de la microred y métricas filtradas)
      if (data.modelo5_origen_canjes?.establecimientos) {
        const estFiltrados = data.modelo5_origen_canjes.establecimientos.filter((e: any) =>
          matchMr(e.microred, microredFiltro)
        );
        data.modelo5_origen_canjes.establecimientos = estFiltrados;
        data.totalEstablecimientos = estFiltrados.length;

        const sumEss = estFiltrados.reduce((s: number, e: any) => s + (e.cantEsSalud || 0), 0);
        const sumPart = estFiltrados.reduce((s: number, e: any) => s + (e.cantParticular || 0), 0);
        const totEst = sumEss + sumPart;
        if (data.modelo5_origen_canjes.metricas) {
          data.modelo5_origen_canjes.metricas.totalAnalizadas = totEst;
          if (totEst > 0) {
            data.modelo5_origen_canjes.metricas.pctGlobalEsSalud = Number(((sumEss / totEst) * 100).toFixed(1));
            data.modelo5_origen_canjes.metricas.pctGlobalParticular = Number(((sumPart / totEst) * 100).toFixed(1));
          }
        }
        if (Array.isArray(data.modelo5_origen_canjes.proyeccionesMensuales)) {
          data.modelo5_origen_canjes.proyeccionesMensuales =
            data.modelo5_origen_canjes.proyeccionesMensuales.map((p: any) => {
              const ess = Math.round((p.licenciasEsSaludEstimadas || 0) * ratio);
              const part = Math.round((p.licenciasParticularEstimadas || 0) * ratio);
              return {
                ...p,
                licenciasEsSaludEstimadas: ess,
                licenciasParticularEstimadas: part,
                totalLicenciasEstimadas: ess + part,
                montoCanjeEnJuego: Math.round((p.montoCanjeEnJuego || 0) * ratio * 100) / 100,
              };
            });
        }
      }

      // 5. En cuentas no-SuperAdmin, restringir también detalles de clusters territoriales a su microred
      if (!esSuperAdmin && data.modelo4_clustering?.microredesDetalle) {
        data.modelo4_clustering.microredesDetalle = data.modelo4_clustering.microredesDetalle.filter((m: any) =>
          matchMr(m.microred, microredFiltro)
        );
      }

      data.microredFiltroAplicado = microredFiltro;
      data.cuotaMicroredAplicada = Number(ratio.toFixed(4));
      data.yaSegmentadoPorServidor = true;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error al obtener insights de ML:', error);
    return NextResponse.json({ error: error?.message || 'Error al procesar insights de ML' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const auth = await requireStaffAccess({ requireSuperAdmin: true });
    if (auth.errorResponse) return auth.errorResponse;

    const execOpts = {
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
      },
    };

    console.log('[ML API] Extrayendo datos frescos de PostgreSQL...');
    await execPromise(`node "${EXTRACT_SCRIPT}"`, execOpts);

    console.log('[ML API] Iniciando re-entrenamiento con Python...');
    const pythonExec = fs.existsSync(PYTHON_PATH) ? `"${PYTHON_PATH}"` : 'python';
    const { stdout } = await execPromise(`${pythonExec} "${TRAIN_SCRIPT}"`, execOpts);

    if (!fs.existsSync(INSIGHTS_PATH)) {
      throw new Error('El script de entrenamiento no generó ml_insights.json');
    }

    const fileContent = fs.readFileSync(INSIGHTS_PATH, 'utf-8');
    const data = JSON.parse(fileContent);

    return NextResponse.json({
      success: true,
      mensaje: 'Modelos re-entrenados exitosamente con los datos más recientes del sistema.',
      stdout,
      data,
    });
  } catch (error: any) {
    console.error('Error al re-entrenar modelos de ML:', error);
    return NextResponse.json(
      {
        error: 'Error al re-entrenar modelos de Machine Learning',
        detalle: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
