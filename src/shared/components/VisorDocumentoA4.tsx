'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

interface VisorDocumentoA4Props {
  children: React.ReactNode;
}

export default function VisorDocumentoA4({ children }: VisorDocumentoA4Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  
  const [modo, setModo] = useState<'ajustar' | 'manual'>('ajustar');
  const [zoomManual, setZoomManual] = useState(1);
  const [escalaAjustada, setEscalaAjustada] = useState(1);
  const [altoHoja, setAltoHoja] = useState(1123); // Altura A4 en px base (297mm)

  // Medir contenedor y calcular escala de ajuste a pantalla
  const recalcularEscala = () => {
    if (!containerRef.current) return;
    const anchoContenedor = containerRef.current.clientWidth;
    // Ancho estándar A4 = 794px (210mm a 96DPI)
    const anchoA4 = 794;
    
    // Si la pantalla es más pequeña que A4, calcular factor de escala
    if (anchoContenedor > 0) {
      // Dejar un margen de seguridad de 12px a los lados
      const disponible = Math.max(280, anchoContenedor - 16);
      const factor = Math.min(1, disponible / anchoA4);
      setEscalaAjustada(factor);
    }

    if (sheetRef.current) {
      const scrollH = sheetRef.current.scrollHeight;
      if (scrollH > 100) {
        setAltoHoja(scrollH);
      }
    }
  };

  useEffect(() => {
    // Al montar, si la pantalla es móvil (< 850px), modo ajustar por defecto
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 850) {
        setModo('ajustar');
      } else {
        setModo('manual');
        setZoomManual(1);
      }
    }

    recalcularEscala();

    const handleResize = () => {
      recalcularEscala();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Observador de cambios de tamaño en el contenido editable
  useEffect(() => {
    if (!sheetRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.target.scrollHeight;
        if (h > 100) setAltoHoja(h);
      }
    });

    observer.observe(sheetRef.current);
    return () => observer.disconnect();
  }, []);

  const escalaFinal = modo === 'ajustar' ? escalaAjustada : zoomManual;
  const esAjustado = modo === 'ajustar';

  return (
    <div className="w-full flex flex-col items-center">
      {/* Barra de Controles de Zoom / Vista (Oculta al Imprimir) */}
      <div className="w-full max-w-[210mm] flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 text-xs mb-4 print:hidden">
        
        {/* Selector de Modo */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium text-[11px] hidden sm:inline">Vista de Hoja:</span>
          <div className="inline-flex bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-600">
            <button
              type="button"
              onClick={() => setModo('ajustar')}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                esAjustado 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Ajustar a Pantalla</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setModo('manual');
                setZoomManual(1);
              }}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                !esAjustado && zoomManual === 1 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>100% Real</span>
            </button>
          </div>
        </div>

        {/* Controles de Zoom fino */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setModo('manual');
              setZoomManual(prev => Math.max(0.35, +(prev - 0.1).toFixed(2)));
            }}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Reducir Zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          
          <span className="font-mono text-slate-700 dark:text-slate-200 min-w-[42px] text-center font-bold text-[11px]">
            {Math.round(escalaFinal * 100)}%
          </span>
          
          <button
            type="button"
            onClick={() => {
              setModo('manual');
              setZoomManual(prev => Math.min(1.5, +(prev + 0.1).toFixed(2)));
            }}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Contenedor Exterior que mide el ancho disponible */}
      <div 
        ref={containerRef}
        className="w-full flex justify-center overflow-x-auto p-1 sm:p-2 print:overflow-visible print:p-0 print:m-0"
      >
        {/* Wrapper Escalado que reserva el espacio visual exacto para no dejar huecos */}
        <div
          className="print:w-[210mm] print:h-auto print:transform-none transition-transform duration-200"
          style={{
            width: `${Math.ceil(794 * escalaFinal)}px`,
            height: `${Math.ceil(altoHoja * escalaFinal)}px`,
            position: 'relative',
          }}
        >
          {/* Hoja Real A4 con transform scale */}
          <div
            ref={sheetRef}
            className="print:transform-none origin-top-left"
            style={{
              width: '794px',
              minHeight: '1123px',
              transform: `scale(${escalaFinal})`,
              transformOrigin: 'top left',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
