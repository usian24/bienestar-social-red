'use client';
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { FileText, Printer, Loader2, ArrowLeft } from 'lucide-react';
import { useImprimir } from '@/shared/hooks/useImprimir';
import { useSearchParams, useRouter } from 'next/navigation';
import ReporteMensualTemplate from '@/shared/components/ReporteMensualTemplate';
import EditorToolbar from '@/shared/components/EditorToolbar';
import VisorDocumentoA4 from '@/shared/components/VisorDocumentoA4';

function ReporteRangoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const desde = searchParams.get('desde') || '';
  const hasta = searchParams.get('hasta') || '';
  const condicion = searchParams.get('condicionLaboral') || '--TODOS--';
  const microred = searchParams.get('microred') || 'Todas';
  const establecimiento = searchParams.get('establecimiento') || '--Todos--';
  const tipoLicencia = searchParams.get('tipoLicencia') || '--TODOS--';

  const [generando, setGenerando] = useState(true);
  const [dataReporte, setDataReporte] = useState<any>(null);

  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useImprimir({
    contentRef: componentRef,
    documentTitle: `Informe_Rango_${desde}_a_${hasta}`
  });

  useEffect(() => {
    const generarReporte = async () => {
      setGenerando(true);
      try {
        const query = new URLSearchParams({
          desde,
          hasta,
          condicionLaboral: condicion,
          microred,
          establecimiento,
          tipoLicencia,
          preview: 'true'
        });
        const res = await fetch(`/api/salud/rango-pdf?${query.toString()}`);
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
    
    if (desde && hasta) {
      generarReporte();
    }
  }, [desde, hasta, condicion, microred, establecimiento, tipoLicencia]);

  const anioReporte = /^\d{4}/.test(desde) ? Number(desde.slice(0, 4)) : new Date().getFullYear();

  return (
    <div className="space-y-6 pb-20 print:space-y-0 print:pb-0 print:m-0">
      <div className="flex flex-col gap-2">
        <button 
          onClick={() => router.back()}
          className="w-fit flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mb-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Salud
        </button>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Editor de PDF (Rango de Fechas)
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Visualizando reporte desde {desde} hasta {hasta}. Condición: {condicion}.
        </p>
      </div>

      {generando ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
          <p className="text-slate-500">Generando documento...</p>
        </div>
      ) : dataReporte ? (
        <div className="flex flex-col gap-4">
          <EditorToolbar />
          <div className="flex flex-col lg:flex-row gap-6 relative items-start">
            {/* Contenedor del Documento A4 con Visor Responsive */}
            <div className="w-full flex-1 bg-slate-100 dark:bg-slate-950 p-1 sm:p-4 rounded-xl shadow-inner min-h-screen border border-slate-200 dark:border-slate-800">
              <VisorDocumentoA4>
                <div className="w-full flex flex-col items-center gap-8 print:gap-0" ref={componentRef}>
                  <ReporteMensualTemplate data={dataReporte} mes="Rango" anio={anioReporte} condicionLaboral={condicion} />
                </div>
              </VisorDocumentoA4>
            </div>

            {/* Panel de Acciones */}
            <div className="w-full lg:w-72 shrink-0 lg:sticky lg:top-6 flex flex-col gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6 flex flex-col gap-3 sm:gap-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Acciones del Reporte</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Verifique que la información esté correcta. Puede usar la cinta de <strong>Word</strong> y la regla para retocar textos y márgenes antes de imprimir.
                </p>
                <button 
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-bold text-sm transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                >
                  <Printer className="w-5 h-5" />
                  Imprimir / Guardar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-10 text-slate-500 bg-white dark:bg-slate-800 rounded-xl">
          <p>Faltan parámetros de fecha.</p>
        </div>
      )}
    </div>
  );
}

export default function ReporteRangoPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-20 mt-10">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-500">Cargando parámetros...</p>
      </div>
    }>
      <ReporteRangoContent />
    </Suspense>
  );
}
