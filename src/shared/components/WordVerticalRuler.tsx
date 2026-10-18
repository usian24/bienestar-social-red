'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface WordVerticalRulerProps {
  escala?: number;
  alto?: number; // Altura en px, por defecto 1123px (297mm A4)
  className?: string;
  onMarginChange?: (topCm: number, bottomCm: number) => void;
}

export default function WordVerticalRuler({
  escala = 1,
  alto = 1123,
  className = '',
  onMarginChange,
}: WordVerticalRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null);

  // Dimensiones A4 vertical: 297mm = 29.7 cm
  const TOTAL_HEIGHT_CM = 29.7;
  const PX_PER_CM = alto / TOTAL_HEIGHT_CM; // ≈ 37.81 px/cm

  const [topMarginCm, setTopMarginCm] = useState(2.0);
  const [bottomMarginCm, setBottomMarginCm] = useState(2.0);

  const [activeDrag, setActiveDrag] = useState<'top' | 'bottom' | null>(null);
  const [dragVisualY, setDragVisualY] = useState<number | null>(null);
  const [dragTooltip, setDragTooltip] = useState<string>('');

  const dragInfoRef = useRef<{
    type: 'top' | 'bottom';
    startY: number;
    initialTopCm: number;
    initialBottomCm: number;
  } | null>(null);

  // Localizar el contenedor editable del documento
  const getEditableElement = useCallback((): HTMLElement | null => {
    if (typeof document === 'undefined') return null;
    return document.querySelector('[contenteditable="true"]') as HTMLElement | null;
  }, []);

  // Leer márgenes verticales reales del documento
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = getEditableElement();
      if (el) {
        const cs = window.getComputedStyle(el);
        const pt = parseFloat(cs.paddingTop) || 0;
        const pb = parseFloat(cs.paddingBottom) || 0;

        if (pt > 0) {
          const tCm = Number((pt / PX_PER_CM).toFixed(2));
          setTopMarginCm(Math.min(10, Math.max(0.5, tCm)));
        }
        if (pb > 0) {
          const bCm = Number((pb / PX_PER_CM).toFixed(2));
          setBottomMarginCm(Math.min(10, Math.max(0.5, bCm)));
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [getEditableElement, PX_PER_CM]);

  // Aplicar cambios al elemento editable
  const applyStylesToDocument = useCallback((tCm: number, bCm: number) => {
    const el = getEditableElement();
    if (!el) return;

    el.style.paddingTop = `${tCm}cm`;
    el.style.paddingBottom = `${bCm}cm`;

    if (onMarginChange) {
      onMarginChange(tCm, bCm);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('word-vertical-margin-updated', {
        detail: { topCm: tCm, bottomCm: bCm }
      }));
    }
  }, [getEditableElement, onMarginChange]);

  // Iniciar arrastre
  const handleStartDrag = (type: 'top' | 'bottom', clientY: number) => {
    setActiveDrag(type);
    dragInfoRef.current = {
      type,
      startY: clientY,
      initialTopCm: topMarginCm,
      initialBottomCm: bottomMarginCm,
    };

    const initialY = type === 'top'
      ? topMarginCm * PX_PER_CM
      : (TOTAL_HEIGHT_CM - bottomMarginCm) * PX_PER_CM;

    setDragVisualY(initialY);
    setDragTooltip(type === 'top' ? `Margen Sup: ${topMarginCm.toFixed(1)} cm` : `Margen Inf: ${bottomMarginCm.toFixed(1)} cm`);
  };

  // Movimiento de puntero vertical
  useEffect(() => {
    if (!activeDrag) return;

    const handlePointerMove = (e: PointerEvent | MouseEvent | TouchEvent) => {
      if (!dragInfoRef.current) return;

      const clientY = 'touches' in e && e.touches.length > 0
        ? e.touches[0].clientY
        : (e as MouseEvent).clientY;

      const { type, startY, initialTopCm, initialBottomCm } = dragInfoRef.current;

      const deltaClientY = clientY - startY;
      const deltaSheetPx = deltaClientY / (escala || 1);
      const deltaCm = deltaSheetPx / PX_PER_CM;

      if (type === 'top') {
        let newT = Math.max(0.5, Math.min(TOTAL_HEIGHT_CM - initialBottomCm - 5.0, initialTopCm + deltaCm));
        newT = Math.round(newT * 10) / 10;
        setTopMarginCm(newT);
        setDragVisualY(newT * PX_PER_CM);
        setDragTooltip(`Margen Superior: ${newT.toFixed(1)} cm`);
        applyStylesToDocument(newT, bottomMarginCm);
      } else if (type === 'bottom') {
        let newB = Math.max(0.5, Math.min(TOTAL_HEIGHT_CM - topMarginCm - 5.0, initialBottomCm - deltaCm));
        newB = Math.round(newB * 10) / 10;
        setBottomMarginCm(newB);
        setDragVisualY((TOTAL_HEIGHT_CM - newB) * PX_PER_CM);
        setDragTooltip(`Margen Inferior: ${newB.toFixed(1)} cm`);
        applyStylesToDocument(topMarginCm, newB);
      }
    };

    const handlePointerUp = () => {
      setActiveDrag(null);
      setDragVisualY(null);
      dragInfoRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [activeDrag, applyStylesToDocument, bottomMarginCm, escala, topMarginCm, PX_PER_CM]);

  const topMarginPx = topMarginCm * PX_PER_CM;
  const bottomMarginBoundaryPx = (TOTAL_HEIGHT_CM - bottomMarginCm) * PX_PER_CM;

  // Generación de marcas de cm y mm verticales
  const cmTicks = [];
  const maxCm = Math.floor(TOTAL_HEIGHT_CM);

  for (let cm = 0; cm <= maxCm; cm++) {
    const yPos = cm * PX_PER_CM;

    // Sub-ticks cada 2mm
    if (cm < maxCm) {
      for (let mm = 2; mm <= 8; mm += 2) {
        const isHalf = mm === 5 || mm === 4 || mm === 6;
        const mmY = (cm + mm / 10) * PX_PER_CM;
        cmTicks.push(
          <div
            key={`v-mm-${cm}-${mm}`}
            className="absolute right-0 h-[1px] pointer-events-none"
            style={{
              top: `${mmY}px`,
              width: isHalf ? '5px' : '3px',
              backgroundColor: isHalf ? '#94a3b8' : '#cbd5e1',
            }}
          />
        );
      }
    }

    // Tick principal de cm
    cmTicks.push(
      <div
        key={`v-cm-${cm}`}
        className="absolute right-0 h-[1px] bg-slate-400 dark:bg-slate-500 pointer-events-none"
        style={{ top: `${yPos}px`, width: '8px' }}
      />
    );

    // Número de centímetro
    if (cm > 0 && cm < maxCm) {
      cmTicks.push(
        <span
          key={`v-num-${cm}`}
          className="absolute left-[3px] text-[8px] font-sans font-bold text-slate-500 dark:text-slate-400 select-none pointer-events-none -translate-y-1/2"
          style={{ top: `${yPos}px` }}
        >
          {cm}
        </span>
      );
    }
  }

  return (
    <div
      ref={rulerRef}
      className={`relative select-none print:hidden border-r border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 ${className}`}
      style={{ width: '24px', height: `${alto}px` }}
      title="Regla Vertical: Arrastre los marcadores para modificar los márgenes superior e inferior de impresión"
    >
      {/* 1. Zona sombreada: Margen Superior */}
      <div
        className="absolute top-0 left-0 right-0 bg-slate-300/80 dark:bg-slate-700/70 border-b border-slate-400/50"
        style={{ height: `${topMarginPx}px` }}
      />

      {/* 2. Zona central: Área blanca imprimible */}
      <div
        className="absolute left-0 right-0 bg-white dark:bg-slate-900 shadow-inner"
        style={{
          top: `${topMarginPx}px`,
          height: `${bottomMarginBoundaryPx - topMarginPx}px`,
        }}
      />

      {/* 3. Zona sombreada: Margen Inferior */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-slate-300/80 dark:bg-slate-700/70 border-t border-slate-400/50"
        style={{ height: `${alto - bottomMarginBoundaryPx}px` }}
      />

      {/* 4. Marcas y números */}
      <div className="absolute inset-0 pointer-events-none">
        {cmTicks}
      </div>

      {/* 5. MARCADOR MARGEN SUPERIOR (Triángulo apuntando a la derecha ▶) */}
      <div
        onMouseDown={(e) => { e.preventDefault(); handleStartDrag('top', e.clientY); }}
        onTouchStart={(e) => { handleStartDrag('top', e.touches[0].clientY); }}
        className="absolute right-0 -translate-y-1/2 cursor-ns-resize z-30 group p-1 -m-1"
        style={{ top: `${topMarginPx}px` }}
        title={`Margen Superior: ${topMarginCm.toFixed(1)} cm`}
      >
        <svg width="9" height="12" viewBox="0 0 9 12" className="drop-shadow-xs">
          <polygon
            points="1,1 8,6 1,11"
            fill={activeDrag === 'top' ? '#2563eb' : '#475569'}
            stroke="#1e293b"
            strokeWidth="0.8"
            className="group-hover:fill-blue-600 transition-colors"
          />
        </svg>
      </div>

      {/* 6. MARCADOR MARGEN INFERIOR (Triángulo apuntando a la derecha ▶) */}
      <div
        onMouseDown={(e) => { e.preventDefault(); handleStartDrag('bottom', e.clientY); }}
        onTouchStart={(e) => { handleStartDrag('bottom', e.touches[0].clientY); }}
        className="absolute right-0 -translate-y-1/2 cursor-ns-resize z-30 group p-1 -m-1"
        style={{ top: `${bottomMarginBoundaryPx}px` }}
        title={`Margen Inferior: ${bottomMarginCm.toFixed(1)} cm`}
      >
        <svg width="9" height="12" viewBox="0 0 9 12" className="drop-shadow-xs">
          <polygon
            points="1,1 8,6 1,11"
            fill={activeDrag === 'bottom' ? '#2563eb' : '#475569'}
            stroke="#1e293b"
            strokeWidth="0.8"
            className="group-hover:fill-blue-600 transition-colors"
          />
        </svg>
      </div>

      {/* 7. LÍNEA GUÍA HORIZONTAL MIENTRAS SE ARRASTRA */}
      {activeDrag && dragVisualY !== null && (
        <>
          <div
            className="absolute left-[24px] h-0 pointer-events-none z-50 border-t-[1.5px] border-dashed border-blue-500 shadow-sm"
            style={{
              top: `${dragVisualY}px`,
              width: '794px',
            }}
          />

          <div
            className="absolute -left-1 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none z-50 whitespace-nowrap border border-blue-400"
            style={{ top: `${dragVisualY}px`, transform: 'translateX(-105%)' }}
          >
            <span>{dragTooltip}</span>
          </div>
        </>
      )}
    </div>
  );
}
