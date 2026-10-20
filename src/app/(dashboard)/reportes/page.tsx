'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FileText, Printer, Loader2, Brain, FileSpreadsheet, Calendar, Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useImprimir } from '@/shared/hooks/useImprimir';
import ReporteMensualTemplate from '@/shared/components/ReporteMensualTemplate';
import EditorToolbar from '@/shared/components/EditorToolbar';
import VisorDocumentoA4 from '@/shared/components/VisorDocumentoA4';

const meses = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
];

function ReportesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { data: session, status } = useSession();

  const rol = (session?.user as any)?.rol;
  const permisos = (session?.user as any)?.permisos || [];
  const puedeVerReportes = rol === 'SUPER_ADMIN' || permisos.includes('VER_REPORTES');

  // Redirigir de inmediato si se solicitó tab=ml hacia la página dedicada /analisis
  useEffect(() => {
    if (tabParam === 'ml') {
      router.replace('/analisis');
    }
  }, [tabParam, router]);

  const currentMonth = new Date().getMonth() + 1;
  const [mesDesde, setMesDesde] = useState<number>(currentMonth);
  const [mesHasta, setMesHasta] = useState<number>(currentMonth);
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [condicion, setCondicion] = useState<string>('--TODOS--');
  const [generando, setGenerando] = useState(false);
  const [dataReporte, setDataReporte] = useState<any>(null);

  const componentRef = useRef<HTMLDivElement>(null);

  const labelDesde = meses.find(m => m.value === mesDesde)?.label || '';
  const labelHasta = meses.find(m => m.value === mesHasta)?.label || '';
  const labelRangoTexto = mesDesde === mesHasta ? labelDesde : `${labelDesde} a ${labelHasta}`;
  const labelRangoDoc = mesDesde === mesHasta ? labelDesde : `${labelDesde}_a_${labelHasta}`;

  const handlePrint = useImprimir({
    contentRef: componentRef,
    documentTitle: `Informe_Bienestar_${labelRangoDoc}_${anio}_${condicion.replace(/[^a-zA-Z0-9]/g, '_')}`
  });

  const aplicarRangoRapido = (desde: number, hasta: number) => {
    setMesDesde(desde);
    setMesHasta(hasta);
  };

  const generarReporte = async () => {
    setGenerando(true);
    try {
      const queryParams = new URLSearchParams({
        monthDesde: Math.min(mesDesde, mesHasta).toString(),
        monthHasta: Math.max(mesDesde, mesHasta).toString(),
        year: anio.toString(),
        preview: 'true',
        condicionLaboral: condicion
      });
      const res = await fetch(`/api/salud/excel-masivo?${queryParams.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al generar el reporte');
      }
      const data = await res.json();
      setDataReporte(data);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Hubo un error al extraer los datos para el reporte.');
    } finally {
      setGenerando(false);
    }
  };

  const descargarExcelMasivo = () => {
    const queryParams = new URLSearchParams({
      monthDesde: Math.min(mesDesde, mesHasta).toString(),
      monthHasta: Math.max(mesDesde, mesHasta).toString(),
      year: anio.toString(),
      condicionLaboral: condicion
    });
    window.open(`/api/salud/excel-masivo?${queryParams.toString()}`, '_blank');
  };

  if (status === 'loading') {
    return <div className="p-8 text-center text-xs text-slate-400">Verificando permisos institucionales...</div>;
  }

  // Bloqueo Estricto de RBAC para roles que no tienen poder de emisión de reportes (ej: SEDE_ADMIN)
  if (!puedeVerReportes) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Módulo Exclusivo para Generación de Informes Oficiales
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Tu cuenta no cuenta con el permiso <strong className="text-slate-800 dark:text-slate-200 font-semibold">VER_REPORTES</strong>. La emisión de informes ejecutivos institucionales y exportaciones consolidadas en Excel está reservada para el Súper Administrador y Jefatura.
          </p>
          <div className="pt-2">
            <Link
              href="/analisis"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
            >
              <Brain className="w-4 h-4" />
              <span>Ver Modelos de Inteligencia Predictiva (ML)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 print:space-y-0 print:pb-0 print:m-0">
      {/* Cabecera Oficial de Reportes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-600" />
            Informes Oficiales y Exportación Masiva
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Generación de informes ejecutivos con formato institucional A4 y descargas consolidadas en Excel de la Red de Salud Huánuco.
          </p>
        </div>

        {/* Enlace directo a Inteligencia Predictiva */}
        <Link
          href="/analisis"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition shadow-2xs self-start sm:self-auto"
        >
          <Brain className="w-4 h-4 text-blue-600" />
          <span>Ver Inteligencia Predictiva (ML)</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </div>

      {/* SECCIÓN ÚNICA Y ENFOCADA: INFORME MENSUAL OFICIAL (PDF) Y EXCEL MASIVO */}
      <div className="space-y-6">
          {/* Controles de Generación y Filtros */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4 print:hidden">
            {/* Fila superior de filtros */}
            <div className="flex flex-wrap items-end gap-3.5">
              {/* Mes Desde */}
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mes Inicial (Desde)
                </label>
                <select 
                  value={mesDesde} 
                  onChange={e => setMesDesde(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-slate-400 focus:outline-none"
                >
                  {meses.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Mes Hasta */}
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mes Final (Hasta)
                </label>
                <select 
                  value={mesHasta} 
                  onChange={e => setMesHasta(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-slate-400 focus:outline-none"
                >
                  {meses.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Año */}
              <div className="w-28">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Año</label>
                <input 
                  type="number" 
                  value={anio} 
                  onChange={e => setAnio(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-slate-400 focus:outline-none"
                />
              </div>

              {/* Condición Laboral */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Condición Laboral</label>
                <select 
                  value={condicion} 
                  onChange={e => setCondicion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-slate-400 focus:outline-none"
                >
                  <option value="--TODOS--">-- TODAS LAS MODALIDADES --</option>
                  <option value="CAS">CAS (D.L. 1057)</option>
                  <option value="NOMBRADO">NOMBRADO (D.L. 276)</option>
                  <option value="CAS DIRESA">CAS DIRESA</option>
                </select>
              </div>
            </div>

            {/* Accesos rápidos de rango y Botones de Acción */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              {/* Presets de período */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-semibold text-slate-600 mr-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Atajos:
                </span>
                <button
                  type="button"
                  onClick={() => aplicarRangoRapido(currentMonth, currentMonth)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                    mesDesde === currentMonth && mesHasta === currentMonth
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Mes Actual
                </button>
                <button
                  type="button"
                  onClick={() => aplicarRangoRapido(1, 12)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                    mesDesde === 1 && mesHasta === 12
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Todo el Año
                </button>
                <button
                  type="button"
                  onClick={() => aplicarRangoRapido(1, 6)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                    mesDesde === 1 && mesHasta === 6
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  1er Semestre
                </button>
                <button
                  type="button"
                  onClick={() => aplicarRangoRapido(7, 12)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                    mesDesde === 7 && mesHasta === 12
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  2do Semestre
                </button>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-wrap items-center gap-2.5 ml-auto">
                {/* Botón Excel Masivo */}
                <button
                  type="button"
                  onClick={descargarExcelMasivo}
                  className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                  title="Descargar libro Excel oficial con hojas por cada microred, cálculo de los 20 días y subsidios"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                  Descargar Excel Masivo
                </button>

                {/* Botón Generar Vista Previa (PDF) */}
                <button 
                  type="button"
                  onClick={generarReporte}
                  disabled={generando}
                  className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                >
                  {generando ? <Loader2 className="w-4 h-4 animate-spin text-slate-300" /> : <FileText className="w-4 h-4 text-slate-300" />}
                  {generando ? 'Extrayendo datos...' : 'Generar Vista Previa'}
                </button>

                {/* Botón Imprimir / PDF */}
                {dataReporte && (
                  <button 
                    type="button"
                    onClick={() => handlePrint()}
                    className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <Printer className="w-4 h-4 text-rose-100" />
                    Imprimir / Guardar PDF
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Visor tipo Google Docs para el informe mensual con escala responsive */}
          {dataReporte && (
            <div className="flex flex-col items-center bg-slate-200 dark:bg-slate-900 p-2 sm:p-6 rounded-xl border border-slate-300 dark:border-slate-800 shadow-inner print:p-0 print:border-none print:shadow-none print:bg-white w-full">
              <EditorToolbar />
              <VisorDocumentoA4>
                <div className="w-full flex flex-col items-center gap-8 print:gap-0">
                  <ReporteMensualTemplate 
                    ref={componentRef} 
                    mes={labelRangoTexto} 
                    anio={anio} 
                    condicionLaboral={condicion}
                    data={dataReporte} 
                  />
                </div>
              </VisorDocumentoA4>
            </div>
          )}
        </div>
      </div>
  );
}

export default function ReportesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Cargando reportes...</div>}>
      <ReportesContent />
    </Suspense>
  );
}
