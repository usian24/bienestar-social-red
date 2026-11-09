'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Brain,
  TrendingUp,
  ShieldAlert,
  Clock,
  Layers,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  BarChart3,
  Calendar,
  MapPin,
  GitCompare,
  Check,
  CheckCircle2
} from 'lucide-react';

interface ProyeccionMes {
  mes: string;
  mesAbrev?: string;
  mesNum?: number;
  anio: number;
  diasSubsidioEstimados: number;
  rangoMin: number;
  rangoMax: number;
  montoEstimadoRecupero: number;
}

interface HistorialMes {
  anio: number;
  mesNum?: number;
  mes: string;
  mesAbrev?: string;
  mesNombre?: string;
  diasSubsidio: number;
  totalDiasSalud?: number;
}

interface CasoAtipico {
  dni: string;
  servidor: string;
  establecimiento: string;
  microred: string;
  scoreRiesgo: number;
  diasTotales: number;
  numLicencias: number;
  motivoAlerta: string;
}

interface DistribucionRiesgoItem {
  rango: string;
  total: number;
  pct: number;
  nivel?: string;
}

interface FactorDecisionItem {
  variable: string;
  peso: number;
}

interface CertificadoRiesgo {
  licenciaId: string | number;
  dni: string;
  servidor: string;
  numeroCertificado: string;
  establecimiento: string;
  microred: string;
  diasOtorgados: number;
  diasTranscurridos: number;
  diasRestantes30d: number;
  probabilidadCaducidad: number;
  nivelRiesgo: 'CRÍTICO' | 'MODERADO' | 'BAJO';
}

interface MicroredDetalle {
  microred: string;
  totalPersonal: number;
  diasSaludTotales: number;
  diasSubsidioReales?: number;
  tasaAusentismo: number;
  subsidioPorTrabajador: number;
  cluster: number;
  pca_x: number;
  pca_y: number;
  cluster_info: string;
  cluster_color: 'emerald' | 'amber' | 'rose';
}

interface ClusterResumen {
  nombre: string;
  color: string;
  accion: string;
  microredes: string[];
}

interface EstablecimientoOrigen {
  establecimiento: string;
  microred: string;
  totalPersonal: number;
  totalLicencias: number;
  cantEsSalud: number;
  cantParticular: number;
  pctEsSalud: number;
  pctParticular: number;
  alerta: 'ALTA_CARGA' | 'MODERADA' | 'COBERTURA_DIRECTA';
  alertaDesc: string;
  alertaColor: 'rose' | 'amber' | 'emerald';
  proyeccionMes: {
    licenciasEsperadas: number;
    esperadasEsSalud: number;
    esperadasParticular: number;
  };
}

interface ProyeccionMesOrigen {
  mes: string;
  anio: number;
  totalLicenciasEstimadas: number;
  licenciasEsSaludEstimadas: number;
  licenciasParticularEstimadas: number;
  pctEsSalud: number;
  pctParticular: number;
  montoCanjeEnJuego: number;
}

interface MLInsightsData {
  fechaEntrenamiento: string;
  totalEstablecimientos?: number;
  esSuperAdmin?: boolean;
  usuarioMicrored?: string | null;
  microredFiltroAplicado?: string | null;
  cuotaMicroredAplicada?: number;
  yaSegmentadoPorServidor?: boolean;
  modelo1_forecasting: {
    algoritmoGanador?: string;
    metricas: { mae_dias: number; rmse_dias: number };
    historialMensual?: HistorialMes[];
    historialPorMicrored?: Record<string, HistorialMes[]>;
    proyeccionesProximosMeses: ProyeccionMes[];
  };
  modelo2_anomalias: {
    totalAnalizados: number;
    totalAtipicos: number;
    distribucionRiesgo?: DistribucionRiesgoItem[];
    topCasosAtipicos: CasoAtipico[];
  };
  modelo3_riesgo_citt: {
    metricas: { recall: number; f1_score: number; roc_auc: number };
    factoresDecision?: FactorDecisionItem[];
    recomendacion: string;
    topCertificadosRiesgo?: CertificadoRiesgo[];
  };
  modelo4_clustering: {
    silhouetteScore: number;
    resumenClusters: ClusterResumen[];
    microredesDetalle: MicroredDetalle[];
  };
  modelo5_origen_canjes?: {
    metricas: {
      accuracy: number;
      roc_auc: number;
      f1_score: number;
      pctGlobalEsSalud: number;
      pctGlobalParticular: number;
      totalAnalizadas: number;
    };
    proyeccionesMensuales: ProyeccionMesOrigen[];
    establecimientos: EstablecimientoOrigen[];
  };
}

// Funciones puras de concordancia y normalización de nombres de microred
function normalizeMr(name: string): string {
  if (!name) return '';
  return name
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/^MICRO\s*RED\s+/i, '')
    .replace(/^MR\s+/i, '')
    .replace(/SAN\s*FCO\.?/i, 'SAN FRANCISCO')
    .replace(/STA\.?/i, 'SANTA')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchMr(mr1: string, mr2: string): boolean {
  if (!mr1 || !mr2) return false;
  if (mr2 === 'TODAS' || mr1 === 'TODAS') return true;
  const n1 = normalizeMr(mr1);
  const n2 = normalizeMr(mr2);
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  return false;
}

export default function MLDashboardCard() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const rol = user?.rol;
  const esSuperAdmin = rol === 'SUPER_ADMIN';
  const userMicroredNombre = user?.microredNombre;

  const [data, setData] = useState<MLInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [activeTabRaw, setActiveTab] = useState<'forecasting' | 'anomalias' | 'citt' | 'clustering' | 'origen'>('forecasting');
  const [error, setError] = useState<string | null>(null);
  const [colapsado, setColapsado] = useState(false);
  const [selectedMicrored, setSelectedMicrored] = useState<MicroredDetalle | null>(null);
  const [selectedCaso, setSelectedCaso] = useState<CasoAtipico | null>(null);
  const [busquedaEst, setBusquedaEst] = useState('');
  const [filtroAlertaEst, setFiltroAlertaEst] = useState<'TODOS' | 'ALTA_CARGA' | 'MODERADA' | 'COBERTURA_DIRECTA'>('TODOS');
  const [notification, setNotification] = useState<string | null>(null);
  const [filtroMicroredRaw, setFiltroMicrored] = useState<string>('TODAS');

  // Microred y pestaña activas derivadas según el rol (sin sincronización por useEffect)
  const filtroMicrored = esSuperAdmin
    ? filtroMicroredRaw
    : (userMicroredNombre || data?.microredFiltroAplicado || data?.usuarioMicrored || 'TODAS');
  const activeTab = !esSuperAdmin && (activeTabRaw === 'clustering' || activeTabRaw === 'origen')
    ? 'forecasting'
    : activeTabRaw;

  // Lista única de microredes analizadas en el modelo
  const listaMicroredes = useMemo(() => {
    if (!data?.modelo4_clustering?.microredesDetalle) return [];
    const set = new Set<string>();
    data.modelo4_clustering.microredesDetalle.forEach(m => {
      if (m.microred) set.add(m.microred);
    });
    return Array.from(set).sort();
  }, [data]);

  // Microred(s) seleccionada(s) en clustering (con suma sobre coincidencias exactas o normalizadas)
  const microredItemsClustering = useMemo(() => {
    if (filtroMicrored === 'TODAS' || !data?.modelo4_clustering?.microredesDetalle) return [];
    return data.modelo4_clustering.microredesDetalle.filter((m) => matchMr(m.microred, filtroMicrored));
  }, [data, filtroMicrored]);

  // Proporción de días para estimaciones de microred cuando Súper Admin filtra en el cliente
  // (Si el backend ya segmentó la respuesta para SEDE_ADMIN, NO volver a multiplicar para evitar doble escala)
  const cuotaMicroredReal = useMemo(() => {
    if (!data?.modelo4_clustering?.microredesDetalle || filtroMicrored === 'TODAS') return 1;
    if (data.yaSegmentadoPorServidor) {
      return typeof data.cuotaMicroredAplicada === 'number' ? data.cuotaMicroredAplicada : 1;
    }
    const detalles = data.modelo4_clustering.microredesDetalle;
    const totalSubProv = detalles.reduce((s, m) => s + (m.diasSubsidioReales || 0), 0);
    if (totalSubProv > 0) {
      const mrSub = microredItemsClustering.reduce((s, m) => s + (m.diasSubsidioReales || 0), 0);
      return mrSub / totalSubProv;
    }
    const totalSaludProv = detalles.reduce((s, m) => s + (m.diasSaludTotales || 0), 0);
    if (totalSaludProv > 0) {
      const mrSalud = microredItemsClustering.reduce((s, m) => s + (m.diasSaludTotales || 0), 0);
      return mrSalud / totalSaludProv;
    }
    return 0;
  }, [data, filtroMicrored, microredItemsClustering]);

  const cuotaCliente = data?.yaSegmentadoPorServidor || filtroMicrored === 'TODAS' ? 1 : cuotaMicroredReal;

  const historialMensualFiltrado = useMemo(() => {
    const base = data?.modelo1_forecasting?.historialMensual || [];
    if (!data || data.yaSegmentadoPorServidor || filtroMicrored === 'TODAS') {
      return base;
    }
    const porMr = data.modelo1_forecasting?.historialPorMicrored;
    if (porMr) {
      const matchingKeys = Object.keys(porMr).filter((k) => matchMr(k, filtroMicrored));
      if (matchingKeys.length > 0 && base.length > 0) {
        return base.map((bm, idx) => {
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
      }
    }
    return base.map((bm) => ({
      ...bm,
      diasSubsidio: Math.round((bm.diasSubsidio || 0) * cuotaCliente),
      totalDiasSalud: Math.round((bm.totalDiasSalud || 0) * cuotaCliente),
    }));
  }, [data, filtroMicrored, cuotaCliente]);

  // Casos atípicos filtrados (Modelo 2) - Estrictamente aislados a la microred para no-superadmin
  const casosAtipicosFiltrados = useMemo(() => {
    if (!data?.modelo2_anomalias?.topCasosAtipicos) return [];
    if (esSuperAdmin && filtroMicrored === 'TODAS') return data.modelo2_anomalias.topCasosAtipicos;
    const targetMr = filtroMicrored !== 'TODAS' ? filtroMicrored : (userMicroredNombre || (data as any)?.microredFiltroAplicado);
    if (!targetMr) return esSuperAdmin ? data.modelo2_anomalias.topCasosAtipicos : [];
    return data.modelo2_anomalias.topCasosAtipicos.filter(c => matchMr(c.microred, targetMr));
  }, [data, filtroMicrored, esSuperAdmin, userMicroredNombre]);

  const totalAnalizadosVista = useMemo(() => {
    if (!data?.modelo2_anomalias) return 0;
    if (data.yaSegmentadoPorServidor || filtroMicrored === 'TODAS') {
      return data.modelo2_anomalias.totalAnalizados || 0;
    }
    const pers = microredItemsClustering.reduce((s, m) => s + (m.totalPersonal || 0), 0);
    return pers > 0 ? pers : (data.modelo2_anomalias.totalAnalizados || 0);
  }, [data, filtroMicrored, microredItemsClustering]);

  const distribucionRiesgoVista = useMemo<DistribucionRiesgoItem[]>(() => {
    if (!data?.modelo2_anomalias) return [];
    if (
      (data.yaSegmentadoPorServidor || filtroMicrored === 'TODAS') &&
      Array.isArray(data.modelo2_anomalias.distribucionRiesgo) &&
      data.modelo2_anomalias.distribucionRiesgo.length > 0
    ) {
      return data.modelo2_anomalias.distribucionRiesgo;
    }
    const total = Math.max(1, totalAnalizadosVista);
    const cntCrit = casosAtipicosFiltrados.filter((c) => c.scoreRiesgo >= 95).length;
    const cntMod = casosAtipicosFiltrados.filter((c) => c.scoreRiesgo >= 80 && c.scoreRiesgo < 95).length;
    const cntMon = casosAtipicosFiltrados.filter((c) => c.scoreRiesgo >= 60 && c.scoreRiesgo < 80).length;
    const cntNorm = Math.max(0, total - cntCrit - cntMod - cntMon);
    return [
      { rango: 'Riesgo Normal (0% - 60%)', total: cntNorm, pct: Number(((cntNorm / total) * 100).toFixed(1)), nivel: 'normal' },
      { rango: 'Bajo Monitoreo (60% - 80%)', total: cntMon, pct: Number(((cntMon / total) * 100).toFixed(1)), nivel: 'monitoreo' },
      { rango: 'Alerta Moderada (80% - 94%)', total: cntMod, pct: Number(((cntMod / total) * 100).toFixed(1)), nivel: 'moderada' },
      { rango: 'Alerta Crítica (95% - 100%)', total: cntCrit, pct: Number(((cntCrit / total) * 100).toFixed(1)), nivel: 'critica' },
    ];
  }, [data, filtroMicrored, totalAnalizadosVista, casosAtipicosFiltrados]);

  // Certificados en riesgo filtrados (Modelo 3) - Estrictamente aislados a la microred para no-superadmin
  const certificadosRiesgoFiltrados = useMemo(() => {
    if (!data?.modelo3_riesgo_citt?.topCertificadosRiesgo) return [];
    if (esSuperAdmin && filtroMicrored === 'TODAS') return data.modelo3_riesgo_citt.topCertificadosRiesgo;
    const targetMr = filtroMicrored !== 'TODAS' ? filtroMicrored : (userMicroredNombre || (data as any)?.microredFiltroAplicado);
    if (!targetMr) return esSuperAdmin ? data.modelo3_riesgo_citt.topCertificadosRiesgo : [];
    return data.modelo3_riesgo_citt.topCertificadosRiesgo.filter(c => matchMr(c.microred, targetMr));
  }, [data, filtroMicrored, esSuperAdmin, userMicroredNombre]);

  // Establecimientos base filtrados por microred y búsqueda (antes del filtro por alerta para badge "Todos")
  const establecimientosBaseTab5 = useMemo(() => {
    if (!data?.modelo5_origen_canjes?.establecimientos) return [];
    let lista = data.modelo5_origen_canjes.establecimientos;
    if (filtroMicrored !== 'TODAS') {
      lista = lista.filter(e => matchMr(e.microred, filtroMicrored));
    }
    if (busquedaEst.trim()) {
      const q = busquedaEst.toLowerCase();
      lista = lista.filter(e => e.establecimiento.toLowerCase().includes(q) || e.microred.toLowerCase().includes(q));
    }
    return lista;
  }, [data, filtroMicrored, busquedaEst]);

  // Establecimientos filtrados (Modelo 5)
  const establecimientosFiltrados = useMemo(() => {
    if (filtroAlertaEst === 'TODOS') return establecimientosBaseTab5;
    return establecimientosBaseTab5.filter(e => e.alerta === filtroAlertaEst);
  }, [establecimientosBaseTab5, filtroAlertaEst]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/ml');
        if (!res.ok) {
          throw new Error('No se pudieron consultar los modelos.');
        }
        const json = await res.json();
        if (!active) return;
        setData(json);
        setError(null);

        if (json?.modelo4_clustering?.microredesDetalle?.length > 0) {
          if (!esSuperAdmin && userMicroredNombre) {
            const matched = json.modelo4_clustering.microredesDetalle.find((m: any) => matchMr(m.microred, userMicroredNombre));
            setSelectedMicrored(matched || json.modelo4_clustering.microredesDetalle[0]);
          } else {
            setSelectedMicrored(json.modelo4_clustering.microredesDetalle[0]);
          }
        }
        if (json?.modelo2_anomalias?.topCasosAtipicos?.length > 0) {
          setSelectedCaso(json.modelo2_anomalias.topCasosAtipicos[0]);
        }
      } catch (err: any) {
        if (active) setError(err?.message || 'Error de conexión con el servicio de análisis');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [esSuperAdmin, userMicroredNombre]);

  const handleRetrain = async () => {
    if (retraining) return;
    setRetraining(true);
    setNotification('Actualizando modelos con los datos más recientes...');
    try {
      const res = await fetch('/api/ml', { method: 'POST' });
      const resJson = await res.json();
      if (res.ok && resJson.data) {
        setData(resJson.data);
        setNotification('Modelos actualizados correctamente.');
        setTimeout(() => setNotification(null), 4000);
      } else {
        throw new Error(resJson.detalle || resJson.error || 'Error al actualizar');
      }
    } catch (err: any) {
      alert(`No se pudo actualizar: ${err.message}`);
      setNotification(null);
    } finally {
      setRetraining(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs flex flex-col items-center justify-center min-h-[160px]">
        <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mb-3" />
        <p className="text-slate-600 text-xs font-medium tracking-tight">Cargando modelos analíticos...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <h3 className="font-semibold text-sm text-slate-900 mb-1">Modelos Analíticos</h3>
        <p className="text-slate-500 text-xs mb-4">{error || 'Los modelos no han sido calculados aún.'}</p>
        <button
          onClick={handleRetrain}
          disabled={retraining}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium px-4 py-2 rounded-xl transition"
        >
          {retraining ? 'Procesando...' : 'Calcular modelos ahora'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-200">
      {/* Header estilo Apple: Fondo blanco, tipografía limpia, sin gradientes ni insignias estridentes */}
      <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Brain className="w-5 h-5 text-slate-700" />
            Centro de Inteligencia Analítica y Predictiva
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Red de Salud Huánuco · {totalAnalizadosVista.toLocaleString()} servidores · Actualizado: {data.fechaEntrenamiento}
          </p>
        </div>

        {/* Acciones del Header con tooltips flotantes sobre el cursor */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Botón Re-entrenar con Tooltip Flotante */}
          <div className="group relative">
            <button
              onClick={handleRetrain}
              disabled={retraining}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
              <span>{retraining ? 'Actualizando...' : 'Actualizar Modelos'}</span>
            </button>
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50">
              <div className="bg-slate-900 text-white text-[11px] font-normal py-1 px-2.5 rounded shadow-lg whitespace-nowrap">
                Recalcular algoritmos con los últimos registros de PostgreSQL
              </div>
              <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5" />
            </div>
          </div>

          {/* Botón Ocultar/Mostrar con Tooltip Flotante */}
          <div className="group relative">
            <button
              onClick={() => setColapsado(!colapsado)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition cursor-pointer"
            >
              {colapsado ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  <span>Mostrar</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ocultar</span>
                </>
              )}
            </button>
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50">
              <div className="bg-slate-900 text-white text-[11px] font-normal py-1 px-2.5 rounded shadow-lg whitespace-nowrap">
                {colapsado ? 'Expandir panel de análisis' : 'Plegar panel de análisis'}
              </div>
              <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5" />
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className="bg-slate-50 border-b border-slate-200/60 px-6 py-2 text-xs text-slate-700 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Vista Plegada (Compacta de una sola línea) */}
      {colapsado ? (
        <div className="px-5 py-3 sm:px-6 bg-slate-50/40 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span>
              Pronóstico:{' '}
              <strong className="text-slate-800">
                ~{Math.round((data.modelo1_forecasting.proyeccionesProximosMeses?.[0]?.diasSubsidioEstimados ?? 0) * cuotaCliente)} días/mes
              </strong>
            </span>
            <span>Auditoría: <strong className="text-slate-800">{casosAtipicosFiltrados.length} casos atípicos</strong></span>
            <span>CITT: <strong className="text-slate-800">{data.modelo3_riesgo_citt.metricas.recall}% de captura</strong></span>
            <span>Microredes: <strong className="text-slate-800">{data.modelo4_clustering.resumenClusters?.length || 3} zonas</strong></span>
            <span>
              Procedencia:{' '}
              <strong className="text-slate-800">
                {data.modelo5_origen_canjes?.metricas.pctGlobalEsSalud ?? 0}% EsSalud / {data.modelo5_origen_canjes?.metricas.pctGlobalParticular ?? 0}% Part.
              </strong>
            </span>
          </div>
          <button
            onClick={() => setColapsado(false)}
            className="text-xs text-slate-800 hover:underline font-medium cursor-pointer"
          >
            Ver análisis completo
          </button>
        </div>
      ) : (
        <>
          {/* Barra de Segmentación Territorial por Microred */}
          <div className="px-5 py-3 bg-slate-100/80 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-700 shrink-0" />
              <span className="text-xs font-semibold text-slate-800">
                {esSuperAdmin ? 'Ámbito Territorial de Inteligencia ML:' : 'Jurisdicción Asignada:'}
              </span>
              {filtroMicrored !== 'TODAS' && (
                <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Filtro Activo
                </span>
              )}
            </div>

            {esSuperAdmin ? (
              <div className="flex items-center gap-2">
                <select
                  value={filtroMicrored}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFiltroMicrored(val);
                    if (val !== 'TODAS') {
                      const mr = data.modelo4_clustering?.microredesDetalle?.find(m => matchMr(m.microred, val));
                      if (mr) setSelectedMicrored(mr);
                      const caso = data.modelo2_anomalias?.topCasosAtipicos?.find(c => matchMr(c.microred, val));
                      setSelectedCaso(caso || null);
                    } else {
                      if (data.modelo4_clustering?.microredesDetalle?.length) {
                        setSelectedMicrored(data.modelo4_clustering.microredesDetalle[0]);
                      }
                      if (data.modelo2_anomalias?.topCasosAtipicos?.length) {
                        setSelectedCaso(data.modelo2_anomalias.topCasosAtipicos[0]);
                      }
                    }
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-slate-400 focus:outline-none cursor-pointer"
                >
                  <option value="TODAS">Consolidado Provincial ({listaMicroredes.length} Microredes)</option>
                  {listaMicroredes.map((mr) => (
                    <option key={mr} value={mr}>
                      Microred: {mr}
                    </option>
                  ))}
                </select>
                {filtroMicrored !== 'TODAS' && (
                  <button
                    type="button"
                    onClick={() => setFiltroMicrored('TODAS')}
                    className="text-[11px] text-slate-600 hover:text-slate-900 underline font-medium cursor-pointer"
                  >
                    Ver Consolidado
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1 rounded-lg border border-slate-300 flex items-center gap-1.5 shadow-xs">
                  <MapPin className="w-3.5 h-3.5 text-slate-600" />
                  {userMicroredNombre || filtroMicrored}
                </span>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  (Modelos segmentados para tu microred)
                </span>
              </div>
            )}
          </div>

          {/* Segmented Control tipo Apple (iOS/macOS) */}
          <div className="p-3 sm:p-4 bg-slate-50/60 border-b border-slate-100">
            <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1 overflow-x-auto scrollbar-none">
              <div className="flex-1 group relative">
                <button
                  onClick={() => setActiveTab('forecasting')}
                  className={`w-full py-2 px-3 text-xs font-medium rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'forecasting'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
                  <span>1. Pronóstico Presupuestal y Días</span>
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50">
                  <div className="bg-slate-900 text-white text-[11px] font-normal py-1 px-2.5 rounded shadow-lg whitespace-nowrap">
                    Estimación de descansos y presupuesto a recuperar ante EsSalud (90 días)
                  </div>
                  <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5" />
                </div>
              </div>

              <div className="flex-1 group relative">
                <button
                  onClick={() => setActiveTab('anomalias')}
                  className={`w-full py-2 px-3 text-xs font-medium rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'anomalias'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
                  <span>2. Detección de Anomalías ({casosAtipicosFiltrados.length})</span>
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50">
                  <div className="bg-slate-900 text-white text-[11px] font-normal py-1 px-2.5 rounded shadow-lg whitespace-nowrap">
                    Auditoría no supervisada (Isolation Forest) de patrones atípicos
                  </div>
                  <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5" />
                </div>
              </div>

              <div className="flex-1 group relative">
                <button
                  onClick={() => setActiveTab('citt')}
                  className={`w-full py-2 px-3 text-xs font-medium rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'citt'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                  <span>3. Riesgo de Caducidad CITT ({certificadosRiesgoFiltrados.length})</span>
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50">
                  <div className="bg-slate-900 text-white text-[11px] font-normal py-1 px-2.5 rounded shadow-lg whitespace-nowrap">
                    Control del plazo límite de 30 días para evitar pérdida de reembolso
                  </div>
                  <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5" />
                </div>
              </div>

              {/* Pestañas 4 y 5 exclusivas para Súper Admin (Planificación Estratégica Provincial) */}
              {esSuperAdmin && (
                <>
                  <div className="flex-1 group relative">
                    <button
                      onClick={() => setActiveTab('clustering')}
                      className={`w-full py-2 px-3 text-xs font-medium rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeTab === 'clustering'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-600" />
                      <span>4. Vulnerabilidad de Microredes</span>
                    </button>
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50">
                      <div className="bg-slate-900 text-white text-[11px] font-normal py-1 px-2.5 rounded shadow-lg whitespace-nowrap">
                        Agrupamiento de microredes (K-Means & PCA) para planificación de personal
                      </div>
                      <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5" />
                    </div>
                  </div>

                  <div className="flex-1 group relative">
                    <button
                      onClick={() => setActiveTab('origen')}
                      className={`w-full py-2 px-3 text-xs font-medium rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeTab === 'origen'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <GitCompare className="w-3.5 h-3.5 text-slate-600" />
                      <span>5. Procedencia (EsSalud vs Particular)</span>
                    </button>
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50">
                      <div className="bg-slate-900 text-white text-[11px] font-normal py-1 px-2.5 rounded shadow-lg whitespace-nowrap">
                        Estimación y clasificación de certificados particulares vs CITT EsSalud en todos los establecimientos
                      </div>
                      <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Cuerpo de Contenido */}
          <div className="p-5 sm:p-6 bg-white">
            {/* TAB 1: PRONÓSTICO PRESUPUESTAL Y DÍAS */}
            {activeTab === 'forecasting' && (
              <div className="space-y-6">
                {/* Banner de información de validación estadística */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 text-slate-800 rounded-lg">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm flex flex-wrap items-center gap-2">
                        <span>Modelo Predictivo de Series Temporales ({data.modelo1_forecasting.algoritmoGanador || 'Ridge / Gradient Boosting'})</span>
                        {filtroMicrored !== 'TODAS' && (
                          <span className="text-[11px] font-medium text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                            Microred: {filtroMicrored}
                          </span>
                        )}
                      </h4>
                      <p className="text-slate-500 text-xs">
                        {filtroMicrored !== 'TODAS'
                          ? `Estimación focalizada de descansos y presupuesto para ${filtroMicrored} basada en su cuota real de subsidios (${(cuotaMicroredReal * 100).toFixed(1)}% provincial).`
                          : 'Estima la demanda de licencias médicas subsidiadas (>20 días acumulados) y el presupuesto de recupero ante EsSalud en toda la Red.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs self-start sm:self-auto">
                    <span className="text-slate-600">MAE: <strong className="text-slate-900">{data.modelo1_forecasting.metricas.mae_dias} días</strong></span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600">RMSE: <strong className="text-slate-900">{data.modelo1_forecasting.metricas.rmse_dias} días</strong></span>
                  </div>
                </div>

                {/* Tarjetas KPI de los Próximos Meses */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {data.modelo1_forecasting.proyeccionesProximosMeses.map((p, idx) => {
                    const diasEstimados = Math.round(p.diasSubsidioEstimados * cuotaCliente);
                    const rangoMin = Math.round(p.rangoMin * cuotaCliente);
                    const rangoMax = Math.round(p.rangoMax * cuotaCliente);
                    const montoEstimado = Math.round(p.montoEstimadoRecupero * cuotaCliente * 100) / 100;

                    return (
                      <div
                        key={idx}
                        className="group relative p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-xs"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
                          <span className="font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {p.mes} {p.anio}
                          </span>
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">
                            M+{(idx + 1)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <div className="text-[11px] text-slate-500 uppercase font-semibold">
                              {filtroMicrored !== 'TODAS' ? `Días Estimados (${filtroMicrored})` : 'Días de Subsidio Proyectados'}
                            </div>
                            <div className="text-2xl font-bold text-slate-900 tracking-tight flex items-baseline gap-1.5">
                              {diasEstimados} <span className="text-xs font-normal text-slate-500">días</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Rango: {rangoMin} a {rangoMax} días
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">Recupero Estimado</div>
                              <div className="text-sm font-bold text-slate-900 font-mono">
                                S/ {montoEstimado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                              EsSalud
                            </span>
                          </div>
                        </div>

                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50">
                          <div className="bg-slate-900 text-white text-[11px] font-normal py-1 px-2.5 rounded shadow-lg whitespace-nowrap">
                            {p.mes}: {diasEstimados} días estimados (~S/ {montoEstimado.toLocaleString('es-PE')})
                          </div>
                          <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* GRÁFICOS REPRESENTATIVOS DEL MODELO 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico 1: Demanda Histórica Real vs Proyecciones */}
                  <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h5 className="font-semibold text-slate-900 text-xs md:text-sm">
                          Demanda Mensual: Histórico vs Proyección
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Días de subsidio EsSalud (&gt;20 días calendario) registrados y proyectados
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300" /> Histórico</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-900" /> Proyectado</span>
                      </div>
                    </div>

                    {(() => {
                      const itemsGrafico = [
                        ...historialMensualFiltrado.map((h) => ({
                          mes: h.mesAbrev || h.mes.split(' ')[0],
                          dias: h.diasSubsidio ?? 0,
                          tipo: 'hist' as const,
                        })),
                        ...data.modelo1_forecasting.proyeccionesProximosMeses.map((p) => ({
                          mes: `${p.mesAbrev || p.mes.slice(0, 3)}*`,
                          dias: Math.round((p.diasSubsidioEstimados ?? 0) * cuotaCliente),
                          tipo: 'pred' as const,
                        })),
                      ];
                      const maxHeight = Math.max(10, ...itemsGrafico.map((x) => x.dias));

                      return (
                        <div className="h-44 w-full flex items-end justify-between gap-1.5 sm:gap-2 px-1 border-b border-slate-200 pb-2">
                          {itemsGrafico.map((item, idx) => {
                            const heightPct = item.dias > 0 ? Math.max(5, Math.round((item.dias / maxHeight) * 100)) : 2;
                            const isPred = item.tipo === 'pred';

                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer">
                                <div
                                  style={{ height: `${heightPct}%` }}
                                  className={`w-full rounded-t transition-all ${
                                    isPred ? 'bg-slate-900 hover:bg-slate-800' : 'bg-slate-300 hover:bg-slate-400'
                                  }`}
                                />
                                <span className={`text-[10px] mt-1.5 font-medium ${isPred ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                                  {item.mes}
                                </span>
                                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50">
                                  <div className="bg-slate-900 text-white text-[10px] font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                                    {item.mes}: {item.dias} días
                                  </div>
                                  <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    <div className="text-[10px] text-slate-400 text-center mt-2">
                      * Proyección calculada sobre serie histórica real en PostgreSQL.
                    </div>
                  </div>

                  {/* Gráfico 2: Flujo Presupuestal */}
                  <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <h5 className="font-semibold text-slate-900 text-xs md:text-sm mb-1">
                        Curva Presupuestal: Monto Estimado a Recuperar
                      </h5>
                      <p className="text-[11px] text-slate-500 mb-4">
                        Reembolso esperado ante EsSalud por mes según costo diario promedio (S/ 78.50)
                      </p>

                      {(() => {
                        const proysMontos = data.modelo1_forecasting.proyeccionesProximosMeses.map((p) => ({
                          mes: p.mes,
                          anio: p.anio,
                          monto: Math.round(p.montoEstimadoRecupero * cuotaCliente * 100) / 100,
                        }));
                        const maxBudget = Math.max(500, ...proysMontos.map((m) => m.monto * 1.15));

                        return (
                          <div className="space-y-3.5">
                            {proysMontos.map((item, idx) => {
                              const pct = Math.min(100, (item.monto / maxBudget) * 100);
                              return (
                                <div key={idx} className="group relative cursor-pointer">
                                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                                    <span className="text-slate-700">{item.mes} {item.anio}</span>
                                    <span className="text-slate-900 font-mono font-bold">
                                      S/ {item.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div style={{ width: `${pct}%` }} className="h-full bg-slate-800 rounded-full transition-all" />
                                  </div>
                                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50">
                                    <div className="bg-slate-900 text-white text-[10px] font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                                      S/ {item.monto.toLocaleString('es-PE')} a recuperar
                                    </div>
                                    <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs shadow-xs">
                      <span className="text-slate-600 font-medium">Total Proyectado Trimestre:</span>
                      <strong className="text-slate-900 font-bold font-mono">
                        S/{' '}
                        {(
                          Math.round(
                            data.modelo1_forecasting.proyeccionesProximosMeses.reduce(
                              (acc, curr) => acc + curr.montoEstimadoRecupero * cuotaCliente,
                              0
                            ) * 100
                          ) / 100
                        ).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200/80">
                  El modelo permite al área de Bienestar Social anticipar cuántos subsidios requerirán trámite de reembolso con 60 a 90 días de antelación para agilizar la cobertura y la contratación de personal de reemplazo.
                </div>
              </div>
            )}

            {/* TAB 2: DETECCIÓN DE ANOMALÍAS (AUDITORÍA) */}
            {activeTab === 'anomalias' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 text-slate-800 rounded-lg">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm flex flex-wrap items-center gap-2">
                        <span>Auditoría no Supervisada de Ausentismo (Isolation Forest)</span>
                        {filtroMicrored !== 'TODAS' && (
                          <span className="text-[11px] font-medium text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                            Microred: {filtroMicrored}
                          </span>
                        )}
                      </h4>
                      <p className="text-slate-500 text-xs">
                        {filtroMicrored !== 'TODAS'
                          ? `Supervisión de servidores con patrones atípicos pertenecientes a la ${filtroMicrored}.`
                          : 'Detecta servidores con comportamientos fuera de la norma estadística (descansos fraccionados recurrentes o volumen extremo).'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-xs self-start sm:self-auto font-medium">
                    {casosAtipicosFiltrados.length} observaciones {filtroMicrored !== 'TODAS' ? `en ${filtroMicrored}` : `de ${totalAnalizadosVista.toLocaleString()} evaluados`}
                  </div>
                </div>

                {/* GRÁFICOS REPRESENTATIVOS DEL MODELO 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico 1: Histograma de Distribución de Riesgo */}
                  <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200">
                    <h5 className="font-semibold text-slate-900 text-xs md:text-sm mb-1">
                      Distribución de Riesgo en la Población Evaluada
                    </h5>
                    <p className="text-[11px] text-slate-500 mb-4">
                      Segmentación de los {totalAnalizadosVista.toLocaleString()} servidores evaluados según anomalía estadística
                    </p>

                    <div className="space-y-3">
                      {distribucionRiesgoVista.map((item, i) => {
                        const colors = ['bg-slate-400', 'bg-slate-600', 'bg-slate-700', 'bg-slate-900'];
                        const color = colors[Math.min(i, colors.length - 1)];
                        return (
                          <div key={i} className="group relative cursor-pointer">
                            <div className="flex items-center justify-between text-xs font-medium mb-1">
                              <span className="text-slate-700">{item.rango}</span>
                              <span className="font-mono text-slate-600">
                                <strong className="text-slate-900">{item.total}</strong> ({item.pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                              <div style={{ width: `${item.pct}%` }} className={`h-full ${color} rounded-full`} />
                            </div>
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50">
                              <div className="bg-slate-900 text-white text-[10px] font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                                {item.total} servidores ({item.pct}%)
                              </div>
                              <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gráfico 2: Cuadrante de Dispersión */}
                  <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <h5 className="font-semibold text-slate-900 text-xs md:text-sm mb-1">
                        Cuadrante de Dispersión: Días Acumulados vs N° Licencias
                      </h5>
                      <p className="text-[11px] text-slate-500 mb-2">
                        Haz clic en un punto para inspeccionar el servidor identificado
                      </p>

                      <div className="relative h-40 bg-white rounded-lg border border-slate-200 p-3 overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-x-0 top-1/2 h-px bg-slate-100" />
                        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-100" />
                        
                        <div className="absolute bottom-1 left-2 text-[9px] text-slate-400 font-mono">Eje X: Cantidad descansos</div>
                        <div className="absolute top-1 right-2 text-[9px] text-slate-400 font-mono">Eje Y: Días totales</div>

                        {casosAtipicosFiltrados.length === 0 ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" />
                            <span className="text-xs font-medium text-slate-700">Sin casos atípicos en esta microred</span>
                            <span className="text-[10px] text-slate-400">Las solicitudes registradas operan dentro de los umbrales regulares</span>
                          </div>
                        ) : (
                          (() => {
                            const maxLics = Math.max(8, ...casosAtipicosFiltrados.map((c) => c.numLicencias));
                            const maxDias = Math.max(30, ...casosAtipicosFiltrados.map((c) => c.diasTotales));
                            return casosAtipicosFiltrados.map((caso, idx) => {
                              const posX = Math.min(90, Math.max(10, (caso.numLicencias / maxLics) * 90 + 5));
                              const posY = Math.min(85, Math.max(15, 92 - (caso.diasTotales / maxDias) * 75));
                              const isSel = selectedCaso?.dni === caso.dni;

                              return (
                                <div
                                  key={idx}
                                  style={{ left: `${posX}%`, top: `${posY}%` }}
                                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                                >
                                  <button
                                    onClick={() => setSelectedCaso(caso)}
                                    className={`block w-3 h-3 rounded-full transition-transform ${
                                      isSel ? 'bg-slate-900 ring-2 ring-slate-400 scale-125' : 'bg-slate-700 hover:scale-125'
                                    }`}
                                  />
                                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50">
                                    <div className="bg-slate-900 text-white text-[10px] font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                                      {caso.servidor}: {caso.diasTotales}d ({caso.scoreRiesgo}%)
                                    </div>
                                    <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                                  </div>
                                </div>
                              );
                            });
                          })()
                        )}
                      </div>
                    </div>

                    {selectedCaso && (
                      <div className="mt-3 p-2.5 bg-white border border-slate-200 rounded-lg text-xs flex items-center justify-between shadow-xs">
                        <div>
                          <strong className="text-slate-900">{selectedCaso.servidor}</strong> (DNI: {selectedCaso.dni})
                          <div className="text-[10px] text-slate-500">{selectedCaso.motivoAlerta}</div>
                        </div>
                        <span className="font-bold text-slate-900 font-mono">{selectedCaso.scoreRiesgo}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla de Casos Atípicos */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px] tracking-wider uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 sm:px-4">Score</th>
                        <th className="py-2.5 px-3 sm:px-4">Servidor</th>
                        <th className="py-2.5 px-3 sm:px-4">Establecimiento</th>
                        <th className="py-2.5 px-3 sm:px-4 text-center">Licencias</th>
                        <th className="py-2.5 px-3 sm:px-4 text-center">Días</th>
                        <th className="py-2.5 px-3 sm:px-4">Patrón Observado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {casosAtipicosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <p className="font-semibold text-slate-800">Sin anomalías detectadas {filtroMicrored !== 'TODAS' ? `en la ${filtroMicrored}` : ''}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Los descansos médicos en esta jurisdicción se encuentran dentro de las distribuciones normales de duración y frecuencia.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        casosAtipicosFiltrados.map((caso, i) => (
                          <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 sm:px-4 font-mono">
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                {caso.scoreRiesgo}%
                              </span>
                            </td>
                            <td className="py-3 px-3 sm:px-4">
                              <div className="font-semibold text-slate-900">{caso.servidor}</div>
                              <div className="text-[10px] text-slate-400 font-mono">DNI: {caso.dni}</div>
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-slate-600">
                              <div>{caso.establecimiento}</div>
                              <div className="text-[10px] text-slate-400">{caso.microred}</div>
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-center font-medium text-slate-700">
                              {caso.numLicencias}
                            </td>
                            <td className="py-3 px-3 sm:px-4 text-center font-bold text-slate-900">
                              {caso.diasTotales} d
                            </td>
                            <td className="py-3 px-3 sm:px-4">
                              <span className="text-[11px] text-slate-700 font-medium">
                                {caso.motivoAlerta}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: RIESGO DE CADUCIDAD CITT */}
            {activeTab === 'citt' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 text-slate-800 rounded-lg">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">Clasificador de Riesgo de Caducidad CITT (Random Forest)</h4>
                      <p className="text-slate-500 text-xs">
                        Previene la pérdida de reembolsos ante EsSalud por exceder la ventana límite de 30 días hábiles de canje particular.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono shadow-xs self-start sm:self-auto">
                    <span className="text-slate-700 font-bold">Recall: {data.modelo3_riesgo_citt.metricas.recall}%</span>
                    <span className="text-slate-300 mx-1.5">|</span>
                    <span className="text-slate-600">F1: {data.modelo3_riesgo_citt.metricas.f1_score}%</span>
                    <span className="text-slate-300 mx-1.5">|</span>
                    <span className="text-slate-600">AUC: {data.modelo3_riesgo_citt.metricas.roc_auc}%</span>
                  </div>
                </div>

                {/* GRÁFICOS REPRESENTATIVOS DEL MODELO 3 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico 1: Ventana Legal de 30 Días de EsSalud */}
                  <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200">
                    <h5 className="font-semibold text-slate-900 text-xs md:text-sm mb-1">
                      Ventana Legal de 30 Días para Canje CITT
                    </h5>
                    <p className="text-[11px] text-slate-500 mb-4">
                      Barras de progreso por certificado frente al límite legal de reembolso
                    </p>

                    <div className="space-y-3">
                      {certificadosRiesgoFiltrados.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                          <p className="font-semibold text-slate-800 text-xs">Sin certificados en riesgo de caducidad</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Todos los certificados médicos de {filtroMicrored !== 'TODAS' ? `la ${filtroMicrored}` : 'la red'} cuentan con holgura legal de canje.
                          </p>
                        </div>
                      ) : (
                        certificadosRiesgoFiltrados.slice(0, 4).map((cert, idx) => {
                          const pct30 = Math.min(100, (cert.diasTranscurridos / 30) * 100);
                          const esUrgente = cert.diasRestantes30d <= 7;

                          return (
                            <div key={idx} className="group relative bg-white p-3 rounded-lg border border-slate-200 cursor-pointer shadow-xs">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-semibold text-slate-900">{cert.servidor}</span>
                                <span className={`font-mono text-[11px] font-bold ${esUrgente ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>
                                  {cert.diasRestantes30d} días restantes
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                  style={{ width: `${pct30}%` }}
                                  className={`h-full rounded-full ${esUrgente ? 'bg-slate-900' : 'bg-slate-500'}`}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                                <span>Certificado: {cert.numeroCertificado}</span>
                                <span>Día {cert.diasTranscurridos} / 30 días</span>
                              </div>
                              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50">
                                <div className="bg-slate-900 text-white text-[10px] font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                                  {cert.servidor}: Quedan {cert.diasRestantes30d} días
                                </div>
                                <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Gráfico 2: Factores de Decisión ML */}
                  <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <h5 className="font-semibold text-slate-900 text-xs md:text-sm mb-1">
                        Ponderación de Factores de Decisión ML (Random Forest)
                      </h5>
                      <p className="text-[11px] text-slate-500 mb-4">
                        Variables matemáticas determinantes en la probabilidad de caducidad
                      </p>

                      <div className="space-y-3">
                        {(data.modelo3_riesgo_citt.factoresDecision || [
                          { variable: 'Días Transcurridos desde Registro/Emisión', peso: 48 },
                          { variable: 'Distancia Geográfica a la Sede (Horas viaje)', peso: 32 },
                          { variable: 'Días Otorgados en el Certificado', peso: 14 },
                          { variable: 'Régimen Contractual del Servidor', peso: 6 }
                        ]).map((v, i) => (
                          <div key={i} className="group relative cursor-pointer">
                            <div className="flex items-center justify-between text-xs font-medium mb-1">
                              <span className="text-slate-700">{v.variable}</span>
                              <span className="font-bold text-slate-900 font-mono">{v.peso}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div style={{ width: `${v.peso}%` }} className="h-full bg-slate-800 rounded-full" />
                            </div>
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50">
                              <div className="bg-slate-900 text-white text-[10px] font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                                Peso: {v.peso}% en el modelo
                              </div>
                              <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600 shadow-xs">
                      El modelo prioriza postas alejadas (Pillao, Chaulán, Margos) donde el traslado de expedientes tarda hasta 5.5 horas hacia la sede central de Huánuco.
                    </div>
                  </div>
                </div>

                {/* Grid de Certificados con Días Restantes Exactos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {certificadosRiesgoFiltrados.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200 col-span-1 sm:col-span-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                      <p className="font-semibold text-slate-800 text-sm">Plazos CITT al 100% al día {filtroMicrored !== 'TODAS' ? `en la ${filtroMicrored}` : ''}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        No se detectaron certificados médicos particulares próximos a expirar el plazo legal de 30 días hábiles.
                      </p>
                    </div>
                  ) : (
                    certificadosRiesgoFiltrados.slice(0, 6).map((cert, idx) => {
                      const esUrgente = cert.diasRestantes30d <= 7;
                      return (
                        <div
                          key={idx}
                          className="group relative p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-xs cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                              Cert: {cert.numeroCertificado}
                            </span>
                            <span className={`text-[11px] font-bold font-mono ${esUrgente ? 'text-slate-900' : 'text-slate-600'}`}>
                              {cert.diasRestantes30d} días restantes ({cert.probabilidadCaducidad}%)
                            </span>
                          </div>
                          <h5 className="font-semibold text-slate-900 text-xs mt-1">{cert.servidor}</h5>
                          <p className="text-[11px] text-slate-500 mb-3">{cert.establecimiento} ({cert.microred})</p>

                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase">Otorgados</span>
                              <strong className="text-slate-800">{cert.diasOtorgados} d</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase">Transcurridos</span>
                              <strong className="text-slate-800">{cert.diasTranscurridos} d</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase">Plazo</span>
                              <strong className={esUrgente ? 'text-slate-900 font-bold' : 'text-slate-700'}>
                                {cert.diasRestantes30d} d
                              </strong>
                            </div>
                          </div>

                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50">
                            <div className="bg-slate-900 text-white text-[10px] font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                              Riesgo: {cert.nivelRiesgo} ({cert.probabilidadCaducidad}%)
                            </div>
                            <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: VULNERABILIDAD TERRITORIAL (CLUSTERING) */}
            {activeTab === 'clustering' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 text-slate-800 rounded-lg">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">Segmentación de Microredes (K-Means k=3 & Reducción PCA)</h4>
                      <p className="text-slate-500 text-xs">
                        Clasifica los {data.totalEstablecimientos ?? data.modelo5_origen_canjes?.establecimientos?.length ?? 85} establecimientos en 3 niveles de criticidad operativa para planificar personal de reemplazo.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono shadow-xs self-start sm:self-auto">
                    <span className="text-slate-500">Silhouette Score: </span>
                    <strong className="text-slate-900 font-bold">{data.modelo4_clustering.silhouetteScore}</strong>
                  </div>
                </div>

                {/* 3 Tarjetas Resumen de Clusters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {data.modelo4_clustering.resumenClusters.map((cl, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {cl.nombre}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {cl.microredes.length} microredes
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mb-2.5">
                        Recomendación: <strong className="text-slate-900">{cl.accion}</strong>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto scrollbar-none">
                        {cl.microredes.map((m, idx) => {
                          const isCurrentMr = filtroMicrored !== 'TODAS' && matchMr(m, filtroMicrored);
                          return (
                            <span
                              key={idx}
                              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                                isCurrentMr
                                  ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-xs'
                                  : 'bg-slate-50 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {m} {isCurrentMr && <Check className="w-3 h-3 text-white inline ml-1 shrink-0" />}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* GRÁFICOS REPRESENTATIVOS DEL MODELO 4 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico 1: Barras Comparativas de Tasa de Ausentismo */}
                  <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200">
                    <h5 className="font-semibold text-slate-900 text-xs md:text-sm mb-1">
                      Tasa de Días de Ausencia por Servidor
                    </h5>
                    <p className="text-[11px] text-slate-500 mb-4">
                      Comparativa entre las microredes de mayor requerimiento frente a las más estables
                    </p>

                    <div className="space-y-3">
                      {(() => {
                        const topMicroredes = data.modelo4_clustering.microredesDetalle.slice(0, 6);
                        const maxTasa = Math.max(1, ...topMicroredes.map((item) => item.tasaAusentismo || 0)) * 1.1;

                        return topMicroredes.map((m, idx) => {
                          const pctTasa = Math.min(100, (m.tasaAusentismo / maxTasa) * 100);
                          const isCurrentMr = filtroMicrored !== 'TODAS' && matchMr(m.microred, filtroMicrored);

                          return (
                            <div
                              key={idx}
                              className={`group relative cursor-pointer p-1.5 rounded-lg transition-colors ${
                                isCurrentMr ? 'bg-slate-100/90 ring-1 ring-slate-300' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs font-medium mb-1">
                                <span className={`truncate max-w-[200px] ${isCurrentMr ? 'text-slate-900 font-bold flex items-center gap-1.5' : 'text-slate-800 font-semibold'}`}>
                                  {m.microred}
                                  {isCurrentMr && (
                                    <span className="text-[9px] bg-slate-900 text-white px-1.5 py-0.2 rounded">
                                      Filtro Activo
                                    </span>
                                  )}
                                </span>
                                <span className="font-mono text-slate-700 text-[11px]">
                                  {m.tasaAusentismo} d/servidor ({m.totalPersonal} pers.)
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${pctTasa}%` }}
                                  className={`h-full rounded-full transition-all ${
                                    isCurrentMr ? 'bg-slate-900' : 'bg-slate-800'
                                  }`}
                                />
                              </div>
                              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50">
                                <div className="bg-slate-900 text-white text-[10px] font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                                  {m.microred}: {m.tasaAusentismo} d/t
                                </div>
                                <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Gráfico 2: Plano Cartesiano 2D PCA */}
                  <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h5 className="font-semibold text-slate-900 text-xs md:text-sm">
                            Espacio Latente de Reducción Dimensional (PCA 2D)
                          </h5>
                          <p className="text-[11px] text-slate-500">
                            Haz clic en un punto para inspeccionar la microred
                          </p>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>Eje X: Carga Total</span>
                          <span>|</span>
                          <span>Eje Y: Tasa Ausencia</span>
                        </div>
                      </div>

                      <div className="relative w-full h-44 bg-white rounded-lg border border-slate-200 p-4 overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
                        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-200" />

                        {(() => {
                          const mrList = data.modelo4_clustering.microredesDetalle;
                          if (mrList.length === 0) return null;
                          const xs = mrList.map((item) => item.pca_x);
                          const ys = mrList.map((item) => item.pca_y);
                          const minX = Math.min(...xs);
                          const maxX = Math.max(...xs);
                          const minY = Math.min(...ys);
                          const maxY = Math.max(...ys);
                          const spanX = maxX - minX || 1;
                          const spanY = maxY - minY || 1;

                          return mrList.map((m, idx) => {
                            const posX = maxX === minX ? 50 : Math.max(8, Math.min(92, ((m.pca_x - minX) / spanX) * 84 + 8));
                            const posY = maxY === minY ? 50 : Math.max(8, Math.min(92, 92 - ((m.pca_y - minY) / spanY) * 84));
                            const isMatchFiltro = filtroMicrored !== 'TODAS' && matchMr(m.microred, filtroMicrored);
                            const isSelected = selectedMicrored?.microred === m.microred;

                            return (
                              <div
                                key={idx}
                                style={{ left: `${posX}%`, top: `${posY}%` }}
                                className={`absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer ${
                                  isMatchFiltro ? 'z-30' : isSelected ? 'z-20' : 'z-10'
                                }`}
                              >
                                <button
                                  onClick={() => setSelectedMicrored(m)}
                                  className={`block transition-all border border-white ${
                                    isMatchFiltro
                                      ? 'w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-300 scale-125 shadow-md'
                                      : isSelected
                                      ? 'w-3.5 h-3.5 rounded-full bg-slate-900 ring-2 ring-slate-400 scale-125'
                                      : 'w-3.5 h-3.5 rounded-full bg-slate-700 hover:scale-125'
                                  }`}
                                />
                                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50">
                                  <div className="bg-slate-900 text-white text-[10px] font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                                    {m.microred}: {m.tasaAusentismo} d/t {isMatchFiltro ? '(Filtro Activo)' : ''}
                                  </div>
                                  <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {selectedMicrored && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                        <div>
                          <div className="font-semibold text-slate-900">{selectedMicrored.microred}</div>
                          <span className="inline-block text-[10px] font-bold px-2 py-0.2 rounded bg-slate-100 text-slate-800 mt-0.5">
                            {selectedMicrored.cluster_info}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div>
                            <span className="text-slate-400 block text-[9px]">PERSONAL</span>
                            <strong className="text-slate-900">{selectedMicrored.totalPersonal}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">DÍAS SALUD</span>
                            <strong className="text-slate-900">{selectedMicrored.diasSaludTotales} d</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">TASA</span>
                            <strong className="text-slate-900">{selectedMicrored.tasaAusentismo} d/t</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: PROCEDENCIA DE CANJES (ESSALUD CITT VS PARTICULAR) */}
            {activeTab === 'origen' && data.modelo5_origen_canjes && (
              <div className="space-y-6">
                {/* Banner de Información y Métricas Globales */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 text-slate-800 rounded-lg">
                      <GitCompare className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">
                        Clasificador y Estimador de Procedencia de Canjes
                      </h4>
                      <p className="text-slate-500 text-xs">
                        Compara la emisión de CITT directos de EsSalud frente a Certificados Médicos Particulares que requieren trámite de canje.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs self-start sm:self-auto">
                    <span className="text-slate-700 font-bold">
                      EsSalud: {data.modelo5_origen_canjes.metricas.pctGlobalEsSalud}%
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-900 font-bold">
                      Particular: {data.modelo5_origen_canjes.metricas.pctGlobalParticular}%
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">
                      Precisión: {data.modelo5_origen_canjes.metricas.accuracy}%
                    </span>
                  </div>
                </div>

                {/* 1. Proyecciones Mensuales de Procedencia */}
                <div>
                  <h5 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-2">
                    Proyección Mensual por Canal de Procedencia
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {data.modelo5_origen_canjes.proyeccionesMensuales.map((p, idx) => {
                      const debeEscalarCliente = filtroMicrored !== 'TODAS' && !data.yaSegmentadoPorServidor;
                      const licEsSalud = debeEscalarCliente
                        ? Math.round(p.licenciasEsSaludEstimadas * cuotaCliente)
                        : p.licenciasEsSaludEstimadas;
                      const licPart = debeEscalarCliente
                        ? Math.round(p.licenciasParticularEstimadas * cuotaCliente)
                        : p.licenciasParticularEstimadas;
                      const totalLic = debeEscalarCliente
                        ? (licEsSalud + licPart)
                        : p.totalLicenciasEstimadas;
                      const montoCanje = debeEscalarCliente
                        ? Math.round(p.montoCanjeEnJuego * cuotaCliente * 100) / 100
                        : p.montoCanjeEnJuego;

                      return (
                        <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="font-semibold text-slate-900 uppercase">
                              {p.mes} {p.anio}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {totalLic} licencias est.
                            </span>
                          </div>

                          {/* Barra visual bimodal */}
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex mb-2 border border-slate-200">
                            <div
                              style={{ width: `${p.pctEsSalud}%` }}
                              className="bg-slate-300 h-full transition-all"
                              title={`EsSalud: ${p.pctEsSalud}%`}
                            />
                            <div
                              style={{ width: `${p.pctParticular}%` }}
                              className="bg-slate-900 h-full transition-all"
                              title={`Particular: ${p.pctParticular}%`}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-xs bg-slate-300" />
                              EsSalud: <strong>{licEsSalud}</strong> ({p.pctEsSalud}%)
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-xs bg-slate-900" />
                              Part: <strong>{licPart}</strong> ({p.pctParticular}%)
                            </span>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Canje en juego:</span>
                            <strong className="text-slate-900 font-mono font-bold">
                              S/ {montoCanje.toLocaleString('es-PE')}
                            </strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* 2. Ranking y Filtro por Establecimiento */}
                <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h5 className="font-semibold text-slate-900 text-xs md:text-sm">
                        {filtroMicrored !== 'TODAS'
                          ? `Establecimientos Asignados a la ${filtroMicrored}`
                          : 'Comportamiento de Procedencia en Todos los Establecimientos'}
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Identifica qué establecimientos tienen mayor concentración de certificados particulares
                      </p>
                    </div>

                    {/* Filtros rápidos */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <button
                        onClick={() => setFiltroAlertaEst('TODOS')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                          filtroAlertaEst === 'TODOS'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        Todos ({establecimientosBaseTab5.length})
                      </button>
                      <button
                        onClick={() => setFiltroAlertaEst('ALTA_CARGA')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                          filtroAlertaEst === 'ALTA_CARGA'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        Alta Carga (&ge;50% Particulares)
                      </button>
                      <button
                        onClick={() => setFiltroAlertaEst('MODERADA')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                          filtroAlertaEst === 'MODERADA'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        Moderada (25-49%)
                      </button>
                      <button
                        onClick={() => setFiltroAlertaEst('COBERTURA_DIRECTA')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                          filtroAlertaEst === 'COBERTURA_DIRECTA'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        Cobertura Directa (&lt;25%)
                      </button>
                    </div>
                  </div>

                  {/* Buscador de establecimiento */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar por nombre de posta, centro de salud o microred..."
                      value={busquedaEst}
                      onChange={(e) => setBusquedaEst(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs placeholder:text-slate-400 focus:outline-slate-500"
                    />
                  </div>

                  {/* Lista de Establecimientos */}
                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {establecimientosFiltrados.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
                        <CheckCircle2 className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                        <p className="font-semibold text-slate-800 text-xs">No se encontraron establecimientos</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {busquedaEst
                            ? 'Prueba con otro término de búsqueda o cambia la alerta seleccionada.'
                            : `No hay establecimientos asignados para el filtro actual.`}
                        </p>
                      </div>
                    ) : (
                      establecimientosFiltrados.map((est, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-[240px]">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                {est.establecimiento}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  est.alerta === 'ALTA_CARGA'
                                    ? 'bg-slate-900 text-white'
                                    : est.alerta === 'MODERADA'
                                    ? 'bg-slate-100 text-slate-800 border border-slate-200'
                                    : 'bg-slate-50 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {est.alertaDesc}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {est.microred} · {est.totalPersonal} trabajadores · {est.totalLicencias} licencias registradas
                            </div>
                          </div>

                          {/* Barra bimodal */}
                          <div className="flex-1 max-w-xs">
                            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                              <span className="text-slate-500">
                                EsSalud: <strong>{est.cantEsSalud}</strong> ({est.pctEsSalud}%)
                              </span>
                              <span className="text-slate-900 font-bold">
                                Particular: <strong>{est.cantParticular}</strong> ({est.pctParticular}%)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                              <div
                                style={{ width: `${est.pctEsSalud}%` }}
                                className="bg-slate-300 h-full"
                              />
                              <div
                                style={{ width: `${est.pctParticular}%` }}
                                className="bg-slate-900 h-full"
                              />
                            </div>
                          </div>

                          {/* Proyección Próximo Mes */}
                          <div className="text-right sm:text-right shrink-0 font-mono text-[11px]">
                            <span className="text-slate-400 block text-[9px] uppercase">
                              Próx. Mes Est.
                            </span>
                            <span className="text-slate-900 font-bold">
                              {est.proyeccionMes.licenciasEsperadas} licencias
                            </span>
                            <div className="text-[10px] text-slate-500">
                              (~{est.proyeccionMes.esperadasParticular} particulares a canjear)
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
