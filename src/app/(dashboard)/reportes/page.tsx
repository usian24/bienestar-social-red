'use client';
import React, { useState, useRef } from 'react';
import { FileText, Printer, FileDown, Loader2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import ReporteMensualTemplate from '@/shared/components/ReporteMensualTemplate';
import EditorToolbar from '@/shared/components/EditorToolbar';

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

export default function ReportesPage() {
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
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Reportes Generales
        </h1>
        <p className="text-slate-500 dark:text-slate-400">Genera el Informe Mensual de Bienestar Social consolidado.</p>
      </div>
      
      {/* Controles */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Mes</label>
          <select 
            value={mes} 
            onChange={e => setMes(Number(e.target.value))}
            className="w-full sm:w-48 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-blue-500"
          >
            {meses.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Año</label>
          <input 
            type="number" 
            value={anio} 
            onChange={e => setAnio(Number(e.target.value))}
            className="w-full sm:w-32 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Condición Laboral</label>
          <select 
            value={condicion} 
            onChange={e => setCondicion(e.target.value)}
            className="w-full sm:w-48 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-blue-500"
          >
            <option value="CAS">CAS</option>
            <option value="NOMBRADO">NOMBRADO</option>
          </select>
        </div>
        <button 
          onClick={generarReporte}
          disabled={generando}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {generando ? 'Extrayendo...' : 'Generar Vista Previa'}
        </button>

        {dataReporte && (
          <button 
            onClick={() => handlePrint()}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ml-auto"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Guardar PDF
          </button>
        )}
      </div>

      {/* Visor tipo Google Docs */}
      {dataReporte && (
        <div className="flex flex-col items-center bg-slate-200 dark:bg-slate-950 p-8 rounded-xl overflow-auto border border-slate-300 dark:border-slate-700 shadow-inner print:p-0 print:border-none print:shadow-none print:bg-white">
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
  );
}
