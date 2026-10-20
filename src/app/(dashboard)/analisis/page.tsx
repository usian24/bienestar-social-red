'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Brain, Sparkles, MapPin, Shield } from 'lucide-react';
import MLDashboardCard from '@/shared/components/MLDashboardCard';

export default function AnalisisPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const rol = user?.rol;
  const esSuperAdmin = rol === 'SUPER_ADMIN' || rol === 'ADMIN';
  const microredNombre = user?.microredNombre;

  return (
    <div className="space-y-6 pb-20">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Brain className="w-7 h-7 text-blue-600" />
              Modelos de Inteligencia Predictiva y Machine Learning
            </h1>
            {esSuperAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs">
                <Shield className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" /> Consolidado Provincial (13 Microredes)
              </span>
            ) : microredNombre ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs">
                <MapPin className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" /> {microredNombre}
              </span>
            ) : null}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {esSuperAdmin
              ? 'Pronóstico presupuestal provincial, detección de anomalías con Isolation Forest y auditoría preventiva de descansos médicos.'
              : `Indicadores predictivos informativos y control preventivo de certificados CITT para el personal de tu microred.`}
          </p>
        </div>
      </div>

      {/* Tarjeta Integral de Análisis y Modelos Machine Learning */}
      <MLDashboardCard />
    </div>
  );
}
