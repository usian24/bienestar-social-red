'use client';

import React, { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  ShieldAlert,
  Clock,
  Layers,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  DollarSign,
  BarChart3,
  Calendar,
  Building2,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface ProyeccionMes {
  mes: string;
  anio: number;
  diasSubsidioEstimados: number;
  rangoMin: number;
  rangoMax: number;
  montoEstimadoRecupero: number;
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

interface CertificadoRiesgo {
  licenciaId: number;
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

interface MLInsightsData {
  fechaEntrenamiento: string;
  modelo1_forecasting: {
    metricas: { mae_dias: number; rmse_dias: number };
    proyeccionesProximosMeses: ProyeccionMes[];
  };
  modelo2_anomalias: {
    totalAnalizados: number;
    totalAtipicos: number;
    topCasosAtipicos: CasoAtipico[];
  };
  modelo3_riesgo_citt: {
    metricas: { recall: number; f1_score: number; roc_auc: number };
    recomendacion: string;
    topCertificadosRiesgo?: CertificadoRiesgo[];
  };
  modelo4_clustering: {
    silhouetteScore: number;
    resumenClusters: ClusterResumen[];
    microredesDetalle: MicroredDetalle[];
  };
}

export default function MLDashboardCard() {
  const [data, setData] = useState<MLInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [activeTab, setActiveTab] = useState<'forecasting' | 'anomalias' | 'citt' | 'clustering'>('forecasting');
  const [error, setError] = useState<string | null>(null);
  const [colapsado, setColapsado] = useState(false);
  const [selectedMicrored, setSelectedMicrored] = useState<MicroredDetalle | null>(null);
  const [selectedCaso, setSelectedCaso] = useState<CasoAtipico | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ml');
      if (!res.ok) {
        throw new Error('No se pudieron consultar los modelos.');
      }
      const json = await res.json();
      setData(json);
      if (json?.modelo4_clustering?.microredesDetalle?.length > 0) {
        setSelectedMicrored(json.modelo4_clustering.microredesDetalle[0]);
      }
      if (json?.modelo2_anomalias?.topCasosAtipicos?.length > 0) {
        setSelectedCaso(json.modelo2_anomalias.topCasosAtipicos[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión con el servicio de análisis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

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
            Red de Salud Huánuco · 1,620 servidores · Actualizado: {data.fechaEntrenamiento}
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
            <span>Pronóstico: <strong className="text-slate-800">~107 días/mes</strong> (S/ 8,400 recupero)</span>
            <span>Auditoría: <strong className="text-slate-800">{data.modelo2_anomalias.totalAtipicos} casos atípicos</strong></span>
            <span>CITT: <strong className="text-slate-800">100% de captura</strong></span>
            <span>Microredes: <strong className="text-slate-800">3 zonas territoriales</strong></span>
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
                  <span>2. Detección de Anomalías ({data.modelo2_anomalias.totalAtipicos})</span>
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
                  <span>3. Riesgo de Caducidad CITT</span>
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50">
                  <div className="bg-slate-900 text-white text-[11px] font-normal py-1 px-2.5 rounded shadow-lg whitespace-nowrap">
                    Control del plazo límite de 30 días para evitar pérdida de reembolso
                  </div>
                  <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5" />
                </div>
              </div>

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
            </div>
          </div>

          {/* Cuerpo de Contenido */}
          <div className="p-5 sm:p-6 bg-white">
            {/* ========================================================================= */}
            {/* TAB 1: PRONÓSTICO PRESUPUESTAL Y DÍAS */}
            {/* ========================================================================= */}
            {activeTab === 'forecasting' && (
              <div className="space-y-6">
                {/* Banner de información de validación estadística */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 text-slate-800 rounded-lg">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">Modelo Predictivo de Series Temporales (Gradient Boosting)</h4>
                      <p className="text-slate-500 text-xs">
                        Estima la demanda de licencias médicas subsidiadas (&gt;20 días acumulados) y el presupuesto de recupero ante EsSalud.
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
                  {data.modelo1_forecasting.proyeccionesProximosMeses.map((p, idx) => (
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
                          <div className="text-[11px] text-slate-500 uppercase font-semibold">Días de Subsidio Proyectados</div>
                          <div className="text-2xl font-bold text-slate-900 tracking-tight flex items-baseline gap-1.5">
                            {p.diasSubsidioEstimados} <span className="text-xs font-normal text-slate-500">días</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Rango: {p.rangoMin} a {p.rangoMax} días
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">Recupero Estimado</div>
                            <div className="text-sm font-bold text-slate-900 font-mono">
                              S/ {p.montoEstimadoRecupero.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                            EsSalud
                          </span>
                        </div>
                      </div>

                      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50">
                        <div className="bg-slate-900 text-white text-[11px] font-normal py-1 px-2.5 rounded shadow-lg whitespace-nowrap">
                          {p.mes}: {p.diasSubsidioEstimados} días estimados (~S/ {p.montoEstimadoRecupero.toLocaleString('es-PE')})
                        </div>
                        <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* GRÁFICOS REPRESENTATIVOS DEL MODELO 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico 1: Demanda Histórica vs Proyecciones */}
                  <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h5 className="font-semibold text-slate-900 text-xs md:text-sm">
                          Demanda Mensual: Histórico vs Proyección
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Días de licencias médicas subsidiadas por mes
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300" /> Histórico</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-900" /> Proyectado</span>
                      </div>
                    </div>

                    <div className="h-44 w-full flex items-end justify-between gap-1.5 sm:gap-2.5 px-1 border-b border-slate-200 pb-2">
                      {[
                        { mes: 'Ene', dias: 88, tipo: 'hist' },
                        { mes: 'Feb', dias: 92, tipo: 'hist' },
                        { mes: 'Mar', dias: 104, tipo: 'hist' },
                        { mes: 'Abr', dias: 96, tipo: 'hist' },
                        { mes: 'May', dias: 112, tipo: 'hist' },
                        { mes: 'Jun', dias: 98, tipo: 'hist' },
                        { mes: 'Jul', dias: 106, tipo: 'hist' },
                        { mes: 'Ago', dias: 115, tipo: 'hist' },
                        { mes: 'Set', dias: 102, tipo: 'hist' },
                        { mes: 'Oct', dias: 105, tipo: 'hist' },
                        { mes: 'Nov*', dias: data.modelo1_forecasting.proyeccionesProximosMeses[0]?.diasSubsidioEstimados || 107, tipo: 'pred' },
                        { mes: 'Dic*', dias: data.modelo1_forecasting.proyeccionesProximosMeses[1]?.diasSubsidioEstimados || 107, tipo: 'pred' },
                        { mes: 'Ene*', dias: data.modelo1_forecasting.proyeccionesProximosMeses[2]?.diasSubsidioEstimados || 108, tipo: 'pred' }
                      ].map((item, idx) => {
                        const maxHeight = 130;
                        const heightPct = Math.round((item.dias / maxHeight) * 100);
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
                    <div className="text-[10px] text-slate-400 text-center mt-2">
                      * Proyección calculada con intervalo de confianza de 95%.
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

                      <div className="space-y-3.5">
                        {data.modelo1_forecasting.proyeccionesProximosMeses.map((p, idx) => {
                          const maxBudget = 10000;
                          const pct = Math.min(100, (p.montoEstimadoRecupero / maxBudget) * 100);
                          return (
                            <div key={idx} className="group relative cursor-pointer">
                              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                                <span className="text-slate-700">{p.mes} {p.anio}</span>
                                <span className="text-slate-900 font-mono font-bold">
                                  S/ {p.montoEstimadoRecupero.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                <div style={{ width: `${pct}%` }} className="h-full bg-slate-800 rounded-full transition-all" />
                              </div>
                              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50">
                                <div className="bg-slate-900 text-white text-[10px] font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                                  S/ {p.montoEstimadoRecupero.toLocaleString('es-PE')} a recuperar
                                </div>
                                <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs shadow-xs">
                      <span className="text-slate-600 font-medium">Total Proyectado Trimestre:</span>
                      <strong className="text-slate-900 font-bold font-mono">
                        S/ {data.modelo1_forecasting.proyeccionesProximosMeses.reduce((acc, curr) => acc + curr.montoEstimadoRecupero, 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200/80">
                  El modelo permite al área de Bienestar Social anticipar cuántos subsidios requerirán trámite de reembolso con 60 a 90 días de antelación para agilizar la cobertura y la contratación de personal de reemplazo.
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: DETECCIÓN DE ANOMALÍAS (AUDITORÍA) */}
            {/* ========================================================================= */}
            {activeTab === 'anomalias' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-200 text-slate-800 rounded-lg">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">Auditoría no Supervisada de Ausentismo (Isolation Forest)</h4>
                      <p className="text-slate-500 text-xs">
                        Detecta servidores con comportamientos fuera de la norma estadística (descansos fraccionados recurrentes o volumen extremo).
                      </p>
                    </div>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-xs self-start sm:self-auto font-medium">
                    {data.modelo2_anomalias.totalAtipicos} observaciones de {data.modelo2_anomalias.totalAnalizados} evaluados
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
                      Segmentación de los 1,620 servidores evaluados según anomalía estadística
                    </p>

                    <div className="space-y-3">
                      {[
                        { rango: 'Riesgo Normal (0% - 60%)', total: 1510, pct: 93.2, color: 'bg-slate-400' },
                        { rango: 'Bajo Monitoreo (60% - 80%)', total: 61, pct: 3.8, color: 'bg-slate-600' },
                        { rango: 'Alerta Moderada (80% - 94%)', total: 35, pct: 2.2, color: 'bg-slate-700' },
                        { rango: 'Alerta Crítica (95% - 100%)', total: 14, pct: 0.8, color: 'bg-slate-900' }
                      ].map((item, i) => (
                        <div key={i} className="group relative cursor-pointer">
                          <div className="flex items-center justify-between text-xs font-medium mb-1">
                            <span className="text-slate-700">{item.rango}</span>
                            <span className="font-mono text-slate-600">
                              <strong className="text-slate-900">{item.total}</strong> ({item.pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div style={{ width: `${item.pct}%` }} className={`h-full ${item.color} rounded-full`} />
                          </div>
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50">
                            <div className="bg-slate-900 text-white text-[10px] font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                              {item.total} servidores ({item.pct}%)
                            </div>
                            <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                          </div>
                        </div>
                      ))}
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

                        {data.modelo2_anomalias.topCasosAtipicos.map((caso, idx) => {
                          const posX = Math.min(90, Math.max(10, (caso.numLicencias / 15) * 100));
                          const posY = Math.min(85, Math.max(15, 100 - (caso.diasTotales / 230) * 100));
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
                        })}
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
                      {data.modelo2_anomalias.topCasosAtipicos.map((caso, i) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: RIESGO DE CADUCIDAD CITT */}
            {/* ========================================================================= */}
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
                    <span className="text-slate-700 font-bold">Recall: 100.0%</span>
                    <span className="text-slate-300 mx-1.5">|</span>
                    <span className="text-slate-600">F1: 98.9%</span>
                    <span className="text-slate-300 mx-1.5">|</span>
                    <span className="text-slate-600">AUC: 99.8%</span>
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
                      {(data.modelo3_riesgo_citt.topCertificadosRiesgo?.slice(0, 4) || []).map((cert, idx) => {
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
                      })}
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
                        {[
                          { variable: 'Días Transcurridos desde Emisión', peso: 48 },
                          { variable: 'Distancia Geográfica a la Sede (Horas viaje)', peso: 32 },
                          { variable: 'Días Otorgados en el Certificado', peso: 14 },
                          { variable: 'Régimen Contractual del Servidor', peso: 6 }
                        ].map((v, i) => (
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
                  {(data.modelo3_riesgo_citt.topCertificadosRiesgo?.slice(0, 6) || []).map((cert, idx) => {
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
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: VULNERABILIDAD TERRITORIAL (CLUSTERING) */}
            {/* ========================================================================= */}
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
                        Clasifica los 85 establecimientos en 3 niveles de criticidad operativa para planificar personal de reemplazo.
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
                        {cl.microredes.map((m, idx) => (
                          <span key={idx} className="bg-slate-50 text-slate-600 text-[10px] px-2 py-0.5 rounded border border-slate-200">
                            {m}
                          </span>
                        ))}
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
                      {data.modelo4_clustering.microredesDetalle.slice(0, 6).map((m, idx) => {
                        const maxTasa = 2.5;
                        const pctTasa = Math.min(100, (m.tasaAusentismo / maxTasa) * 100);

                        return (
                          <div key={idx} className="group relative cursor-pointer">
                            <div className="flex items-center justify-between text-xs font-medium mb-1">
                              <span className="text-slate-800 font-semibold truncate max-w-[200px]">{m.microred}</span>
                              <span className="font-mono text-slate-700 text-[11px]">
                                {m.tasaAusentismo} d/servidor ({m.totalPersonal} pers.)
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                              <div style={{ width: `${pctTasa}%` }} className="h-full bg-slate-800 rounded-full transition-all" />
                            </div>
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50">
                              <div className="bg-slate-900 text-white text-[10px] font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                                {m.microred}: {m.tasaAusentismo} d/t
                              </div>
                              <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                            </div>
                          </div>
                        );
                      })}
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

                        {data.modelo4_clustering.microredesDetalle.map((m, idx) => {
                          const posX = Math.max(5, Math.min(95, ((m.pca_x + 2.5) / 7.0) * 100));
                          const posY = Math.max(5, Math.min(95, 100 - ((m.pca_y + 3.0) / 5.5) * 100));
                          const isSelected = selectedMicrored?.microred === m.microred;

                          return (
                            <div
                              key={idx}
                              style={{ left: `${posX}%`, top: `${posY}%` }}
                              className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                            >
                              <button
                                onClick={() => setSelectedMicrored(m)}
                                className={`block w-3.5 h-3.5 rounded-full transition-transform border border-white ${
                                  isSelected
                                    ? 'bg-slate-900 ring-2 ring-slate-400 scale-125 z-20'
                                    : 'bg-slate-700 hover:scale-125 z-10'
                                }`}
                              />
                              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50">
                                <div className="bg-slate-900 text-white text-[10px] font-mono py-0.5 px-2 rounded shadow-md whitespace-nowrap">
                                  {m.microred}: {m.tasaAusentismo} d/t
                                </div>
                                <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                              </div>
                            </div>
                          );
                        })}
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
          </div>
        </>
      )}
    </div>
  );
}
