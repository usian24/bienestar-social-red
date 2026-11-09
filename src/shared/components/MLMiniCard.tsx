'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  GitCompare
} from 'lucide-react';

interface MLMiniData {
  fechaEntrenamiento: string;
  microredFiltroAplicado?: string | null;
  modelo1_forecasting: {
    metricas: { mae_dias: number; rmse_dias: number };
    historialMensual?: Array<{
      mes: string;
      mesAbrev?: string;
      anio: number;
      diasSubsidio: number;
      totalDiasSalud?: number;
    }>;
    proyeccionesProximosMeses: Array<{
      mes: string;
      mesAbrev?: string;
      anio: number;
      diasSubsidioEstimados: number;
      montoEstimadoRecupero: number;
    }>;
  };
  modelo2_anomalias: {
    totalAtipicos: number;
    totalAnalizados: number;
  };
  modelo3_riesgo_citt: {
    metricas: { recall: number };
    topCertificadosRiesgo?: Array<any>;
  };
  modelo4_clustering: {
    resumenClusters: Array<any>;
  };
  modelo5_origen_canjes?: {
    metricas: {
      pctGlobalEsSalud: number;
      pctGlobalParticular: number;
      totalAnalizadas: number;
    };
  };
}

export default function MLMiniCard() {
  const [data, setData] = useState<MLMiniData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/ml');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error('Error cargando mini ML:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-48 mb-3" />
        <div className="h-16 bg-slate-100 rounded w-full" />
      </div>
    );
  }

  if (!data) return null;

  const proys = data.modelo1_forecasting.proyeccionesProximosMeses || [];
  const proxMes = proys[0];
  const histSlice = (data.modelo1_forecasting.historialMensual || []).slice(-6);

  const chartItems = [
    ...histSlice.map((h) => ({
      mes: h.mesAbrev || h.mes.split(' ')[0],
      dias: h.diasSubsidio ?? 0,
      tipo: 'hist' as const,
    })),
    ...proys.map((p) => ({
      mes: `${p.mesAbrev || p.mes.slice(0, 3)}*`,
      dias: p.diasSubsidioEstimados ?? 0,
      tipo: 'pred' as const,
    })),
  ];

  const maxHeight = Math.max(10, ...chartItems.map((i) => i.dias));
  const pctEsSalud = data.modelo5_origen_canjes?.metricas?.pctGlobalEsSalud ?? 0;
  const pctParticular = data.modelo5_origen_canjes?.metricas?.pctGlobalParticular ?? 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-700" />
            Modelos Predictivos y Control de Licencias
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {data.microredFiltroAplicado
              ? `Pronóstico y detección de anomalías · ${data.microredFiltroAplicado}`
              : 'Pronóstico de ausentismo institucional y detección de anomalías'}
          </p>
        </div>

        <Link
          href="/analisis"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition self-start sm:self-auto cursor-pointer"
        >
          <span>Ver Análisis Predictivo Completo</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Indicadores clave */}
        <div className="space-y-2.5">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Próximo Mes ({proxMes?.mes || 'Próx.'})
              </span>
              <span className="text-lg font-bold text-slate-900 tracking-tight font-mono">
                {proxMes?.diasSubsidioEstimados ?? 0} días
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase block">Recupero</span>
              <span className="text-xs font-bold text-slate-800 font-mono">
                S/ {(proxMes?.montoEstimadoRecupero ?? 0).toLocaleString('es-PE')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-slate-600" />
                Auditoría
              </span>
              <span className="text-sm font-bold text-slate-900 font-mono block mt-0.5">
                {data.modelo2_anomalias.totalAtipicos} casos
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <GitCompare className="w-3 h-3 text-slate-600" />
                Procedencia
              </span>
              <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5">
                {pctEsSalud}% EsSalud
              </span>
            </div>
          </div>
        </div>

        {/* Mini Gráfico Dinámico de Demanda Real vs Pronóstico */}
        <div className="md:col-span-2 bg-slate-50/60 p-3.5 rounded-lg border border-slate-100">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
            <span className="font-medium text-slate-700">Demanda Histórica vs Pronóstico Próximos Meses</span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-slate-300" /> Real</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-slate-900" /> Proyección</span>
            </div>
          </div>

          <div className="h-24 w-full flex items-end justify-between gap-1.5 sm:gap-2 px-1 border-b border-slate-200 pb-1.5">
            {chartItems.map((item, idx) => {
              const heightPct = item.dias > 0 ? Math.max(6, Math.round((item.dias / maxHeight) * 100)) : 2;
              const isPred = item.tipo === 'pred';

              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all ${
                      isPred ? 'bg-slate-900 hover:bg-slate-800' : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                  <span className={`text-[9px] mt-1 font-medium ${isPred ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                    {item.mes}
                  </span>

                  {/* Tooltip flotante superior */}
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

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
            <span>Canal en jurisdicción: {pctEsSalud}% EsSalud CITT vs {pctParticular}% Particulares</span>
            <Link href="/analisis" className="text-slate-700 hover:underline font-medium">
              Explorar modelos predictivos →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
