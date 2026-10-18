'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface WordRulerProps {
  escala?: number;
  className?: string;
  onMarginChange?: (leftCm: number, rightCm: number, indentCm: number) => void;
}

export default function WordRuler({ escala = 1, className = '', onMarginChange }: WordRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null);

  // Ancho A4 en píxeles a 96 DPI: 210mm = 21cm ≈ 794px
  const TOTAL_WIDTH_PX = 794;
  const TOTAL_WIDTH_CM = 21;
  const PX_PER_CM = TOTAL_WIDTH_PX / TOTAL_WIDTH_CM; // ≈ 37.8095 px/cm

  // Márgenes en centímetros
  const [leftMarginCm, setLeftMarginCm] = useState(2.0);
  const [rightMarginCm, setRightMarginCm] = useState(2.0);
  const [firstLineIndentCm, setFirstLineIndentCm] = useState(0.0);

  // Control de arrastre
  const [activeDrag, setActiveDrag] = useState<'left' | 'right' | 'first-line' | null>(null);
  const [dragVisualX, setDragVisualX] = useState<number | null>(null);
  const [dragTooltip, setDragTooltip] = useState<string>('');
  const [isVisible, setIsVisible] = useState(true);

  // Referencias para el arrastre continuo en window
  const dragInfoRef = useRef<{
    type: 'left' | 'right' | 'first-line';
    startX: number;
    initialLeftCm: number;
    initialRightCm: number;
    initialIndentCm: number;
  } | null>(null);

  // Localizar el contenedor editable del documento
  const getEditableElement = useCallback((): HTMLElement | null => {
    if (typeof document === 'undefined') return null;
    return document.querySelector('[contenteditable="true"]') as HTMLElement | null;
  }, []);

  // Leer márgenes iniciales reales del documento
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = getEditableElement();
      if (el) {
        const cs = window.getComputedStyle(el);
        const pl = parseFloat(cs.paddingLeft) || 0;
        const pr = parseFloat(cs.paddingRight) || 0;
        const ti = parseFloat(cs.textIndent) || 0;

        if (pl > 0) {
          const lCm = Number((pl / PX_PER_CM).toFixed(2));
          setLeftMarginCm(Math.min(8, Math.max(0.5, lCm)));
        }
        if (pr > 0) {
          const rCm = Number((pr / PX_PER_CM).toFixed(2));
          setRightMarginCm(Math.min(8, Math.max(0.5, rCm)));
        }
        if (ti !== 0) {
          const iCm = Number((ti / PX_PER_CM).toFixed(2));
          setFirstLineIndentCm(Math.min(4, Math.max(-2, iCm)));
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [getEditableElement, PX_PER_CM]);

  // Aplicar cambios en el elemento editable
  const applyStylesToDocument = useCallback((lCm: number, rCm: number, iCm: number) => {
    const el = getEditableElement();
    if (!el) return;

    el.style.paddingLeft = `${lCm}cm`;
    el.style.paddingRight = `${rCm}cm`;
    if (iCm !== 0) {
      el.style.textIndent = `${iCm}cm`;
    } else {
      el.style.textIndent = '';
    }

    if (onMarginChange) {
      onMarginChange(lCm, rCm, iCm);
    }

    // Notificar a otros componentes (p.ej. Ribbon)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('word-margin-updated', {
        detail: { leftCm: lCm, rightCm: rCm, indentCm: iCm }
      }));
    }
  }, [getEditableElement, onMarginChange]);

  // Escuchar eventos externos (desde la cinta de Word o botones de presets)
  useEffect(() => {
    const handleSetMargin = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        const { leftCm, rightCm, indentCm } = custom.detail;
        if (typeof leftCm === 'number') setLeftMarginCm(leftCm);
        if (typeof rightCm === 'number') setRightMarginCm(rightCm);
        if (typeof indentCm === 'number') setFirstLineIndentCm(indentCm);
        applyStylesToDocument(
          typeof leftCm === 'number' ? leftCm : leftMarginCm,
          typeof rightCm === 'number' ? rightCm : rightMarginCm,
          typeof indentCm === 'number' ? indentCm : firstLineIndentCm
        );
      }
    };

    const handleToggleRuler = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail && typeof custom.detail.visible === 'boolean') {
        setIsVisible(custom.detail.visible);
      } else {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('word-set-margin', handleSetMargin);
    window.addEventListener('word-toggle-ruler', handleToggleRuler);

    return () => {
      window.removeEventListener('word-set-margin', handleSetMargin);
      window.removeEventListener('word-toggle-ruler', handleToggleRuler);
    };
  }, [applyStylesToDocument, firstLineIndentCm, leftMarginCm, rightMarginCm]);

  // Iniciar arrastre
  const handleStartDrag = (
    type: 'left' | 'right' | 'first-line',
    clientX: number
  ) => {
    setActiveDrag(type);
    dragInfoRef.current = {
      type,
      startX: clientX,
      initialLeftCm: leftMarginCm,
      initialRightCm: rightMarginCm,
      initialIndentCm: firstLineIndentCm,
    };

    const initialX = type === 'left' 
      ? leftMarginCm * PX_PER_CM
      : type === 'right' 
        ? (TOTAL_WIDTH_CM - rightMarginCm) * PX_PER_CM
        : (leftMarginCm + firstLineIndentCm) * PX_PER_CM;
    
    setDragVisualX(initialX);

    if (type === 'left') setDragTooltip(`Margen Izq: ${leftMarginCm.toFixed(1)} cm`);
    else if (type === 'right') setDragTooltip(`Margen Der: ${rightMarginCm.toFixed(1)} cm`);
    else setDragTooltip(`Sangría 1ª Línea: ${firstLineIndentCm >= 0 ? '+' : ''}${firstLineIndentCm.toFixed(1)} cm`);
  };

  // Manejar movimiento de puntero
  useEffect(() => {
    if (!activeDrag) return;

    const handlePointerMove = (e: PointerEvent | MouseEvent | TouchEvent) => {
      if (!dragInfoRef.current) return;

      const clientX = 'touches' in e && e.touches.length > 0 
        ? e.touches[0].clientX 
        : (e as MouseEvent).clientX;

      const { type, startX, initialLeftCm, initialRightCm, initialIndentCm } = dragInfoRef.current;
      
      // Compensar factor de escala para movimiento 1:1 real
      const deltaClientX = clientX - startX;
      const deltaSheetPx = deltaClientX / (escala || 1);
      const deltaCm = deltaSheetPx / PX_PER_CM;

      if (type === 'left') {
        // Margen izquierdo: mín 0.5cm, máx (21 - rightMargin - 4cm)
        let newL = Math.max(0.5, Math.min(TOTAL_WIDTH_CM - initialRightCm - 4.0, initialLeftCm + deltaCm));
        // Ajuste fino a saltos de 0.1cm
        newL = Math.round(newL * 10) / 10;
        setLeftMarginCm(newL);
        setDragVisualX(newL * PX_PER_CM);
        setDragTooltip(`Margen Izquierdo: ${newL.toFixed(1)} cm`);
        applyStylesToDocument(newL, rightMarginCm, firstLineIndentCm);
      } else if (type === 'right') {
        // Margen derecho: delta invertido porque se mide desde el borde derecho
        let newR = Math.max(0.5, Math.min(TOTAL_WIDTH_CM - leftMarginCm - 4.0, initialRightCm - deltaCm));
        newR = Math.round(newR * 10) / 10;
        setRightMarginCm(newR);
        setDragVisualX((TOTAL_WIDTH_CM - newR) * PX_PER_CM);
        setDragTooltip(`Margen Derecho: ${newR.toFixed(1)} cm`);
        applyStylesToDocument(leftMarginCm, newR, firstLineIndentCm);
      } else if (type === 'first-line') {
        // Sangría de primera línea relativa al margen izquierdo: -2.0cm a +4.0cm
        let newI = Math.max(-2.0, Math.min(4.0, initialIndentCm + deltaCm));
        newI = Math.round(newI * 10) / 10;
        setFirstLineIndentCm(newI);
        setDragVisualX((leftMarginCm + newI) * PX_PER_CM);
        setDragTooltip(`Sangría Primera Línea: ${newI >= 0 ? '+' : ''}${newI.toFixed(1)} cm`);
        applyStylesToDocument(leftMarginCm, rightMarginCm, newI);
      }
    };

    const handlePointerUp = () => {
      setActiveDrag(null);
      setDragVisualX(null);
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
  }, [activeDrag, applyStylesToDocument, escala, firstLineIndentCm, leftMarginCm, rightMarginCm, PX_PER_CM]);

  if (!isVisible) return null;

  // Cálculos de posiciones visuales
  const leftMarginPx = leftMarginCm * PX_PER_CM;
  const rightMarginBoundaryPx = (TOTAL_WIDTH_CM - rightMarginCm) * PX_PER_CM;
  const firstLineIndentPx = (leftMarginCm + firstLineIndentCm) * PX_PER_CM;

  // Generación de marcas de centímetros y milímetros
  const cmTicks = [];
  for (let cm = 0; cm <= TOTAL_WIDTH_CM; cm++) {
    const xPos = cm * PX_PER_CM;
    
    // Ticks de milímetros entre centímetros (cada 2mm)
    if (cm < TOTAL_WIDTH_CM) {
      for (let mm = 2; mm <= 8; mm += 2) {
        const isHalf = mm === 5 || mm === 4 || mm === 6;
        const mmX = (cm + mm / 10) * PX_PER_CM;
        cmTicks.push(
          <div
            key={`mm-${cm}-${mm}`}
            className="absolute bottom-0 w-[1px] pointer-events-none"
            style={{
              left: `${mmX}px`,
              height: isHalf ? '5px' : '3px',
              backgroundColor: isHalf ? '#94a3b8' : '#cbd5e1'
            }}
          />
        );
      }
    }

    // Tick principal de centímetro
    cmTicks.push(
      <div
        key={`cm-${cm}`}
        className="absolute bottom-0 w-[1px] bg-slate-400 dark:bg-slate-500 pointer-events-none"
        style={{ left: `${xPos}px`, height: '8px' }}
      />
    );

    // Número de centímetro (del 1 al 20)
    if (cm > 0 && cm < TOTAL_WIDTH_CM) {
      cmTicks.push(
        <span
          key={`num-${cm}`}
          className="absolute top-[2px] text-[9px] font-sans font-bold text-slate-500 dark:text-slate-400 select-none pointer-events-none -translate-x-1/2"
          style={{ left: `${xPos}px` }}
        >
          {cm}
        </span>
      );
    }
  }

  return (
    <div 
      ref={rulerRef}
      className={`relative select-none print:hidden border-b border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 ${className}`}
      style={{ width: `${TOTAL_WIDTH_PX}px`, height: '28px' }}
      title="Regla de Word: Arrastre los marcadores para modificar sangrías y márgenes de impresión"
    >
      {/* 1. Zona sombreada: Margen Izquierdo (No imprimible) */}
      <div 
        className="absolute top-0 bottom-0 left-0 bg-slate-300/80 dark:bg-slate-700/70 border-r border-slate-400/50"
        style={{ width: `${leftMarginPx}px` }}
      />

      {/* 2. Zona central: Área blanca imprimible activa */}
      <div 
        className="absolute top-0 bottom-0 bg-white dark:bg-slate-900 shadow-inner"
        style={{ 
          left: `${leftMarginPx}px`, 
          width: `${rightMarginBoundaryPx - leftMarginPx}px` 
        }}
      />

      {/* 3. Zona sombreada: Margen Derecho (No imprimible) */}
      <div 
        className="absolute top-0 bottom-0 right-0 bg-slate-300/80 dark:bg-slate-700/70 border-l border-slate-400/50"
        style={{ width: `${TOTAL_WIDTH_PX - rightMarginBoundaryPx}px` }}
      />

      {/* 4. Escala de marcas y números de cm */}
      <div className="absolute inset-0 pointer-events-none">
        {cmTicks}
      </div>

      {/* 5. MARCADOR 1: Sangría de Primera Línea (Triángulo invertido superior ▼) */}
      <div
        onMouseDown={(e) => { e.preventDefault(); handleStartDrag('first-line', e.clientX); }}
        onTouchStart={(e) => { handleStartDrag('first-line', e.touches[0].clientX); }}
        className="absolute top-0 -translate-x-1/2 cursor-ew-resize z-30 group p-1 -m-1"
        style={{ left: `${firstLineIndentPx}px` }}
        title={`Sangría de Primera Línea: ${firstLineIndentCm >= 0 ? '+' : ''}${firstLineIndentCm.toFixed(1)} cm`}
      >
        <svg width="12" height="9" viewBox="0 0 12 9" className="drop-shadow-xs">
          <polygon 
            points="1,1 11,1 6,8" 
            fill={activeDrag === 'first-line' ? '#2563eb' : '#475569'} 
            stroke="#1e293b" 
            strokeWidth="0.8" 
            className="group-hover:fill-blue-600 transition-colors"
          />
        </svg>
      </div>

      {/* 6. MARCADOR 2 & 3: Sangría Francesa / Margen Izquierdo (Triángulo inferior ▲ + Rectángulo base ■) */}
      <div
        onMouseDown={(e) => { e.preventDefault(); handleStartDrag('left', e.clientX); }}
        onTouchStart={(e) => { handleStartDrag('left', e.touches[0].clientX); }}
        className="absolute bottom-0 -translate-x-1/2 cursor-ew-resize z-30 group p-1 -m-1 flex flex-col items-center"
        style={{ left: `${leftMarginPx}px` }}
        title={`Margen Izquierdo y Sangría: ${leftMarginCm.toFixed(1)} cm`}
      >
        {/* Triángulo apuntando hacia arriba (Sangría francesa) */}
        <svg width="12" height="7" viewBox="0 0 12 7" className="drop-shadow-xs">
          <polygon 
            points="6,1 11,7 1,7" 
            fill={activeDrag === 'left' ? '#2563eb' : '#475569'} 
            stroke="#1e293b" 
            strokeWidth="0.8" 
            className="group-hover:fill-blue-600 transition-colors"
          />
        </svg>
        {/* Rectángulo de sangría izquierda completa */}
        <div 
          className={`w-[11px] h-[5px] rounded-[1px] border border-slate-900 transition-colors ${
            activeDrag === 'left' ? 'bg-blue-600' : 'bg-slate-600 group-hover:bg-blue-600'
          }`} 
        />
      </div>

      {/* 7. MARCADOR 4: Margen Derecho / Sangría Derecha (Triángulo inferior derecho ▲) */}
      <div
        onMouseDown={(e) => { e.preventDefault(); handleStartDrag('right', e.clientX); }}
        onTouchStart={(e) => { handleStartDrag('right', e.touches[0].clientX); }}
        className="absolute bottom-0 -translate-x-1/2 cursor-ew-resize z-30 group p-1 -m-1"
        style={{ left: `${rightMarginBoundaryPx}px` }}
        title={`Margen Derecho: ${rightMarginCm.toFixed(1)} cm`}
      >
        <svg width="12" height="9" viewBox="0 0 12 9" className="drop-shadow-xs">
          <polygon 
            points="6,1 11,8 1,8" 
            fill={activeDrag === 'right' ? '#2563eb' : '#475569'} 
            stroke="#1e293b" 
            strokeWidth="0.8" 
            className="group-hover:fill-blue-600 transition-colors"
          />
        </svg>
      </div>

      {/* 8. LÍNEA GUÍA VERTICAL DE ALINEACIÓN (Estilo Word mientras se arrastra) */}
      {activeDrag && dragVisualX !== null && (
        <>
          {/* Línea vertical punteada cayendo a través de toda la hoja */}
          <div
            className="absolute top-[28px] w-0 pointer-events-none z-50 border-l-[1.5px] border-dashed border-blue-500 shadow-sm"
            style={{ 
              left: `${dragVisualX}px`,
              height: '1150px' 
            }}
          />

          {/* Badge / Tooltip flotante con medida precisa en cm */}
          <div
            className="absolute -top-7 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none z-50 whitespace-nowrap flex items-center gap-1 border border-blue-400"
            style={{ left: `${dragVisualX}px` }}
          >
            <span>{dragTooltip}</span>
          </div>
        </>
      )}
    </div>
  );
}
