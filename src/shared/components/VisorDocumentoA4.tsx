'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Maximize2, ZoomIn, ZoomOut, Ruler } from 'lucide-react';
import WordRuler from './WordRuler';
import WordVerticalRuler from './WordVerticalRuler';
import WordMovableController from './WordMovableController';

interface VisorDocumentoA4Props {
  children: React.ReactNode;
  conRegla?: boolean;
}

export default function VisorDocumentoA4({ children, conRegla = true }: VisorDocumentoA4Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  
  const [modo, setModo] = useState<'ajustar' | 'manual'>('ajustar');
  const [zoomManual, setZoomManual] = useState(1);
  const [escalaAjustada, setEscalaAjustada] = useState(1);
  const [mostrarRegla, setMostrarRegla] = useState(conRegla);

  // Dimensiones estándar A4 a 96 DPI: 210mm x 297mm (794px x 1123px)
  const ANCHO_A4_PX = 794;
  const ALTO_A4_PX = 1123;
  const ANCHO_REGLA_VERT_PX = 24;
  const ALTO_REGLA_HORIZ_PX = 28;

  // Medir contenedor y calcular escala de ajuste a pantalla
  const recalcularEscala = () => {
    if (!containerRef.current) return;
    const anchoContenedor = containerRef.current.clientWidth;
    const anchoTotal = ANCHO_A4_PX + (mostrarRegla ? ANCHO_REGLA_VERT_PX : 0);
    
    if (anchoContenedor > 0) {
      const disponible = Math.max(280, anchoContenedor - 16);
      const factor = Math.min(1, disponible / anchoTotal);
      setEscalaAjustada(factor);
    }
  };

  useEffect(() => {
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
  }, [mostrarRegla]);

  // Escuchar si la cinta de Word solicita alternar la regla
  useEffect(() => {
    const handleToggleRuler = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail && typeof custom.detail.visible === 'boolean') {
        setMostrarRegla(custom.detail.visible);
      } else {
        setMostrarRegla(prev => !prev);
      }
    };
    window.addEventListener('word-toggle-ruler', handleToggleRuler);
    return () => window.removeEventListener('word-toggle-ruler', handleToggleRuler);
  }, []);

  const escalaFinal = modo === 'ajustar' ? escalaAjustada : zoomManual;
  const esAjustado = modo === 'ajustar';

  const anchoTotalPixel = ANCHO_A4_PX + (mostrarRegla ? ANCHO_REGLA_VERT_PX : 0);
  const altoTotalPixel = ALTO_A4_PX + (mostrarRegla ? ALTO_REGLA_HORIZ_PX : 0);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Barra de Controles de Zoom y Vista (Plana y limpia, sin sobrecarga) */}
      <div className="w-full max-w-[210mm] sm:max-w-4xl flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs mb-3 print:hidden">
        
        {/* Selector de Modo */}
        <div className="flex items-center gap-1.5">
          <div className="inline-flex bg-white dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setModo('ajustar')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
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
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                !esAjustado && zoomManual === 1 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>100% Real</span>
            </button>
          </div>

          {/* Alternar Reglas */}
          <button
            type="button"
            onClick={() => {
              const nuevo = !mostrarRegla;
              setMostrarRegla(nuevo);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('word-toggle-ruler', { detail: { visible: nuevo } }));
              }
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              mostrarRegla 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800' 
                : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
            title="Mostrar u ocultar las Reglas de Word"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Reglas {mostrarRegla ? 'Visibles' : 'Ocultas'}</span>
          </button>
        </div>

        {/* Controles de Zoom fino */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setModo('manual');
              setZoomManual(prev => Math.max(0.35, +(prev - 0.1).toFixed(2)));
            }}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Reducir Zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          
          <span className="font-mono text-slate-700 dark:text-slate-200 min-w-[38px] text-center font-bold text-[11px]">
            {Math.round(escalaFinal * 100)}%
          </span>
          
          <button
            type="button"
            onClick={() => {
              setModo('manual');
              setZoomManual(prev => Math.min(1.5, +(prev + 0.1).toFixed(2)));
            }}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
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
        {/* Wrapper Escalado que reserva el espacio visual exacto */}
        <div
          className="print:w-[210mm] print:h-auto print:transform-none transition-transform duration-200"
          style={{
            width: `${Math.ceil(anchoTotalPixel * escalaFinal)}px`,
            height: `${Math.ceil(altoTotalPixel * escalaFinal)}px`,
            position: 'relative',
          }}
        >
          {/* Estructura A4 con Regla Horizontal, Regla Vertical y Hoja */}
          <div
            ref={sheetRef}
            className="print:transform-none origin-top-left relative"
            style={{
              width: `${anchoTotalPixel}px`,
              minHeight: `${altoTotalPixel}px`,
              transform: `scale(${escalaFinal})`,
              transformOrigin: 'top left',
            }}
          >
            {/* FILA 1: Esquina de Word + Regla Horizontal */}
            {mostrarRegla && (
              <div className="flex items-center w-full print:hidden">
                {/* Esquina superior izquierda 24px x 28px */}
                <div 
                  className="w-[24px] h-[28px] bg-slate-300 dark:bg-slate-700 border-r border-b border-slate-400/60 dark:border-slate-600 flex items-center justify-center shrink-0 select-none"
                  title="Esquina de Reglas de Word"
                >
                  <div className="w-2 h-2 border-b-2 border-r-2 border-slate-600 dark:border-slate-300"></div>
                </div>
                {/* Regla Horizontal 794px */}
                <div className="w-[794px] shrink-0">
                  <WordRuler escala={escalaFinal} />
                </div>
              </div>
            )}

            {/* FILA 2: Regla Vertical + Hoja A4 */}
            <div className="flex items-start w-full print:block">
              {/* Regla Vertical fija a 1123px (29.7 cm estándar A4) */}
              {mostrarRegla && (
                <div className="w-[24px] shrink-0 print:hidden">
                  <WordVerticalRuler escala={escalaFinal} alto={ALTO_A4_PX} />
                </div>
              )}

              {/* Hoja de Documento A4 794px con paperRef */}
              <div 
                ref={paperRef}
                className="w-[794px] shrink-0 relative print:w-[210mm] print:m-0"
              >
                {children}

                {/* Controlador interactivo para mover y redimensionar imágenes, tablas y cuadros */}
                <WordMovableController paperRef={paperRef} escala={escalaFinal} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
