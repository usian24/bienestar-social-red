'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Move, AlignLeft, AlignCenter, AlignRight, 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  ZoomIn, ZoomOut, X
} from 'lucide-react';

interface WordMovableControllerProps {
  paperRef: React.RefObject<HTMLDivElement | null>;
  escala?: number;
}

export default function WordMovableController({ paperRef, escala = 1 }: WordMovableControllerProps) {
  const selectedElRef = useRef<HTMLElement | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<{ tick: number; tagLabel: string } | null>(null);
  const [bounds, setBounds] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [sizeTooltip, setSizeTooltip] = useState<string | null>(null);

  // Recalcular los límites exactos del elemento respecto al papel
  const updateBounds = useCallback((el: HTMLElement) => {
    if (!paperRef.current) return;
    const paperRect = paperRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const scale = escala || 1;
    const left = (elRect.left - paperRect.left) / scale;
    const top = (elRect.top - paperRect.top) / scale;
    const width = elRect.width / scale;
    const height = elRect.height / scale;

    setBounds({
      left: Math.round(left),
      top: Math.round(top),
      width: Math.round(width),
      height: Math.round(height),
    });
  }, [paperRef, escala]);

  // Manejar clics para seleccionar imagen, tabla o cuadro
  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Ignorar si el clic fue en la propia barra de control o en un botón/manija
      if (target.closest('.word-movable-control')) return;

      // Detectar si el clic fue en una imagen o tabla o cuadro
      const clicked = target.closest('img, table, .bg-slate-50') as HTMLElement | null;

      if (clicked && paper.contains(clicked)) {
        const tag = clicked.tagName.toLowerCase();
        const tagLabel = tag === 'img' ? 'Imagen' : tag === 'table' ? 'Tabla' : 'Cuadro';
        selectedElRef.current = clicked;
        setSelectedMeta((prev) => ({ tick: (prev?.tick || 0) + 1, tagLabel }));
        updateBounds(clicked);
      } else {
        selectedElRef.current = null;
        setSelectedMeta(null);
        setBounds(null);
      }
    };

    paper.addEventListener('mousedown', handleMouseDown);
    return () => paper.removeEventListener('mousedown', handleMouseDown);
  }, [paperRef, updateBounds]);

  // Actualizar posición periódicamente y cuando cambie de tamaño
  useEffect(() => {
    const el = selectedElRef.current;
    if (!selectedMeta || !el) return;

    const observer = new ResizeObserver(() => {
      if (selectedElRef.current) updateBounds(selectedElRef.current);
    });
    observer.observe(el);

    // Actualizar también al hacer scroll
    const handleScroll = () => {
      if (selectedElRef.current) updateBounds(selectedElRef.current);
    };
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [selectedMeta, updateBounds]);

  // =========================================================
  // REDIMENSIONAMIENTO INTERACTIVO POR ARRASTRE DE ESQUINAS
  // =========================================================
  const handleStartResize = (corner: 'se' | 'sw' | 'ne' | 'nw', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = selectedElRef.current;
    if (!el) return;

    const startX = e.clientX;
    const initialWidth = el.offsetWidth;
    const initialHeight = el.offsetHeight;
    const aspectRatio = initialWidth / (initialHeight || 1);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const scale = escala || 1;
      const deltaClientX = moveEvent.clientX - startX;
      let newWidth = initialWidth;

      if (corner === 'se' || corner === 'ne') {
        newWidth = Math.max(30, Math.round(initialWidth + deltaClientX / scale));
      } else {
        newWidth = Math.max(30, Math.round(initialWidth - deltaClientX / scale));
      }

      // Aplicar ancho
      el.style.width = `${newWidth}px`;
      if (el.tagName.toLowerCase() === 'img') {
        el.style.height = 'auto'; // Mantener proporción natural
        el.style.maxHeight = 'none';
      }

      const calculatedHeight = Math.round(newWidth / aspectRatio);
      setSizeTooltip(`${newWidth} × ${calculatedHeight} px`);
      updateBounds(el);
    };

    const handleMouseUp = () => {
      setSizeTooltip(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // =========================================================
  // ARRASTRE LIBRE PARA MOVER EL ELEMENTO
  // =========================================================
  const handleStartMove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = selectedElRef.current;
    if (!el) return;

    const startX = e.clientX;
    const startY = e.clientY;

    const currentLeft = parseFloat(el.style.left) || 0;
    const currentTop = parseFloat(el.style.top) || 0;

    el.style.position = 'relative';
    el.style.zIndex = '20';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const scale = escala || 1;
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;

      el.style.left = `${Math.round(currentLeft + deltaX)}px`;
      el.style.top = `${Math.round(currentTop + deltaY)}px`;

      updateBounds(el);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Desplazamiento fino con flechas
  const nudge = (dx: number, dy: number) => {
    const el = selectedElRef.current;
    if (!el) return;
    el.style.position = 'relative';
    const currentLeft = parseFloat(el.style.left) || 0;
    const currentTop = parseFloat(el.style.top) || 0;

    el.style.left = `${currentLeft + dx}px`;
    el.style.top = `${currentTop + dy}px`;
    updateBounds(el);
  };

  // Redimensionamiento porcentual rápido
  const scalePercent = (factor: number) => {
    const el = selectedElRef.current;
    if (!el) return;
    const currentWidth = el.offsetWidth;
    const newWidth = Math.max(30, Math.round(currentWidth * factor));
    el.style.width = `${newWidth}px`;
    if (el.tagName.toLowerCase() === 'img') {
      el.style.height = 'auto';
    }
    setTimeout(() => {
      if (selectedElRef.current) updateBounds(selectedElRef.current);
    }, 30);
  };

  // Alineaciones estándar
  const setAlignment = (type: 'left' | 'center' | 'right') => {
    const el = selectedElRef.current;
    if (!el) return;
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';

    if (type === 'left') {
      el.style.marginLeft = '0';
      el.style.marginRight = 'auto';
      el.style.display = 'block';
    } else if (type === 'center') {
      el.style.marginLeft = 'auto';
      el.style.marginRight = 'auto';
      el.style.display = 'block';
    } else if (type === 'right') {
      el.style.marginLeft = 'auto';
      el.style.marginRight = '0';
      el.style.display = 'block';
    }
    setTimeout(() => {
      if (selectedElRef.current) updateBounds(selectedElRef.current);
    }, 30);
  };

  if (!selectedMeta || !bounds) return null;

  const tagLabel = selectedMeta.tagLabel;

  // Posición de la barra flotante encima del elemento
  const toolbarTop = Math.max(2, bounds.top - 34);
  const toolbarLeft = bounds.left;

  return (
    <>
      {/* CUADRO DE SELECCIÓN AZUL EXACTAMENTE ALREDEDOR DEL ELEMENTO */}
      <div
        className="word-movable-control absolute pointer-events-none z-30 print:hidden border-2 border-blue-500 ring-1 ring-blue-500/30"
        style={{
          left: `${bounds.left}px`,
          top: `${bounds.top}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
        }}
      >
        {/* Tooltip de tamaño mientras se redimensiona */}
        {sizeTooltip && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
            {sizeTooltip}
          </div>
        )}

        {/* 4 ESQUINAS DE REDIMENSIONAMIENTO (DRAGGABLE CORNER HANDLES) */}
        {/* Esquina Superior Izquierda (NW) */}
        <div
          onMouseDown={(e) => handleStartResize('nw', e)}
          className="pointer-events-auto absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-[2px] cursor-nwse-resize shadow-xs hover:scale-125 transition-transform"
          title="Arrastre para cambiar tamaño"
        />

        {/* Esquina Superior Derecha (NE) */}
        <div
          onMouseDown={(e) => handleStartResize('ne', e)}
          className="pointer-events-auto absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-[2px] cursor-nesw-resize shadow-xs hover:scale-125 transition-transform"
          title="Arrastre para cambiar tamaño"
        />

        {/* Esquina Inferior Izquierda (SW) */}
        <div
          onMouseDown={(e) => handleStartResize('sw', e)}
          className="pointer-events-auto absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-[2px] cursor-nesw-resize shadow-xs hover:scale-125 transition-transform"
          title="Arrastre para cambiar tamaño"
        />

        {/* Esquina Inferior Derecha (SE) */}
        <div
          onMouseDown={(e) => handleStartResize('se', e)}
          className="pointer-events-auto absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-[2px] cursor-nwse-resize shadow-xs hover:scale-125 transition-transform"
          title="Arrastre para cambiar tamaño"
        />
      </div>

      {/* BARRA DE CONTROL FLOTANTE (ESTILO WORD) ENCIMA DE LA IMAGEN/CUADRO */}
      <div
        className="word-movable-control absolute z-40 print:hidden bg-slate-900 text-white rounded shadow-lg border border-slate-700 px-1.5 py-1 flex items-center gap-1 text-[11px] select-none animate-in fade-in duration-100"
        style={{
          left: `${toolbarLeft}px`,
          top: `${toolbarTop}px`,
        }}
      >
        {/* Botón para Arrastrar y Mover libremente */}
        <button
          type="button"
          onMouseDown={handleStartMove}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded cursor-grab active:cursor-grabbing font-bold text-[10px]"
          title="Mantenga presionado y arrastre para mover"
        >
          <Move className="w-3 h-3" />
          <span>Mover {tagLabel}</span>
        </button>

        <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5"></div>

        {/* Botones de Tamaño Rápido (-10% / +10%) */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => scalePercent(0.9)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Reducir tamaño (-10%)"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => scalePercent(1.1)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Aumentar tamaño (+10%)"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5"></div>

        {/* Flechas de ajuste fino */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => nudge(0, -6)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Subir"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => nudge(0, 6)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Bajar"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => nudge(-6, 0)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Izquierda"
          >
            <ArrowLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => nudge(6, 0)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Derecha"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5"></div>

        {/* Alineación */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setAlignment('left')}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Alinear a la izquierda"
          >
            <AlignLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setAlignment('center')}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Centrar"
          >
            <AlignCenter className="w-3.5 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setAlignment('right')}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Alinear a la derecha"
          >
            <AlignRight className="w-3 h-3" />
          </button>
        </div>

        <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5"></div>

        {/* Cerrar selección */}
        <button
          type="button"
          onClick={() => {
            selectedElRef.current = null;
            setSelectedMeta(null);
            setBounds(null);
          }}
          className="p-1 rounded hover:bg-red-800 text-slate-400 hover:text-white"
          title="Deseleccionar"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </>
  );
}
