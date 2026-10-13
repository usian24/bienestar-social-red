'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileText, Printer, Loader2, Brain } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import ReporteMensualTemplate from '@/shared/components/ReporteMensualTemplate';
import EditorToolbar from '@/shared/components/EditorToolbar';
import MLDashboardCard from '@/shared/components/MLDashboardCard';

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
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'informe' | 'ml'>('informe');

  useEffect(() => {
    if (searchParams.get('tab') === 'ml') {
      setActiveTab('ml');
    }
  }, [searchParams]);

  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [condicion, setCondicion] = useState<string>('CAS');
  const [generando, setGenerando] = useState(false);
  const [dataReporte, setDataReporte] = useState<any>(null);

  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Informe_Mensual_Bienestar_${meses.find(m => m.value === mes)?.label}_${anio}`
  });

  const generarReporte = async () => {
    setGenerando(true);
    try {
      const res = await fetch(`/api/salud/excel-masivo?month=${mes}&year=${anio}&preview=true&condicionLaboral=${condicion}`);
      if (!res.ok) throw new Error('Error al generar el reporte');
      const data = await res.json();
      setDataReporte(data);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al extraer los datos para el reporte.');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 print:space-y-0 print:pb-0 print:m-0">
      {/* Cabecera y Selector de Sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-slate-700" />
            Reportes e Inteligencia Analítica
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Generación de informes mensuales oficiales y modelos predictivos de la Red de Salud Huánuco.
          </p>
        </div>

        {/* Segmented Control tipo Apple para alternar entre Informe Mensual y Machine Learning */}
        <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('informe')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'informe'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Informe Mensual (PDF)</span>
          </button>

          <button
            onClick={() => setActiveTab('ml')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ml'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Modelos Machine Learning</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: INFORME MENSUAL OFICIAL (PDF) */}
      {activeTab === 'informe' && (
        <div className="space-y-6">
          {/* Controles de Generación */}
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex flex-col sm:flex-row gap-4 items-end print:hidden">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Mes</label>
              <select 
                value={mes} 
                onChange={e => setMes(Number(e.target.value))}
                className="w-full sm:w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-slate-500"
              >
                {meses.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Año</label>
              <input 
                type="number" 
                value={anio} 
                onChange={e => setAnio(Number(e.target.value))}
                className="w-full sm:w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Condición Laboral</label>
              <select 
                value={condicion} 
                onChange={e => setCondicion(e.target.value)}
                className="w-full sm:w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-slate-500"
              >
                <option value="CAS">CAS</option>
                <option value="NOMBRADO">NOMBRADO</option>
              </select>
            </div>
            <button 
              onClick={generarReporte}
              disabled={generando}
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {generando ? 'Extrayendo...' : 'Generar Vista Previa'}
            </button>

            {dataReporte && (
              <button 
                onClick={() => handlePrint()}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ml-auto cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir / Guardar PDF
              </button>
            )}
          </div>

          {/* Visor tipo Google Docs para el informe mensual */}
          {dataReporte && (
            <div className="flex flex-col items-center bg-slate-200 p-8 rounded-xl overflow-auto border border-slate-300 shadow-inner print:p-0 print:border-none print:shadow-none print:bg-white">
              <EditorToolbar />
              <div className="w-full flex flex-col items-center gap-8 print:gap-0">
                <ReporteMensualTemplate 
                  ref={componentRef} 
                  mes={meses.find(m => m.value === mes)?.label || ''} 
                  anio={anio} 
                  condicionLaboral={condicion}
                  data={dataReporte} 
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 2: SUITE COMPLETA DE MACHINE LEARNING A LO GRANDE */}
      {activeTab === 'ml' && (
        <div className="space-y-6">
          <MLDashboardCard />
        </div>
      )}
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
