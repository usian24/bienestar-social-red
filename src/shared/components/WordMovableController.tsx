'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Move, AlignLeft, AlignCenter, AlignRight, 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  ZoomIn, ZoomOut, X, Maximize2
} from 'lucide-react';

interface WordMovableControllerProps {
  paperRef: React.RefObject<HTMLDivElement | null>;
  escala?: number;
}

export default function WordMovableController({ paperRef, escala = 1 }: WordMovableControllerProps) {
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  const [bounds, setBounds] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
        setSelectedEl(clicked);
        updateBounds(clicked);
      } else {
        setSelectedEl(null);
        setBounds(null);
      }
    };

    paper.addEventListener('mousedown', handleMouseDown);
    return () => paper.removeEventListener('mousedown', handleMouseDown);
  }, [paperRef, updateBounds]);

  // Actualizar posición periódicamente y cuando cambie de tamaño
  useEffect(() => {
    if (!selectedEl) return;
    updateBounds(selectedEl);

    const observer = new ResizeObserver(() => {
      if (selectedEl) updateBounds(selectedEl);
    });
    observer.observe(selectedEl);

    // Actualizar también al hacer scroll
    const handleScroll = () => {
      if (selectedEl) updateBounds(selectedEl);
    };
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [selectedEl, updateBounds]);

  // =========================================================
  // REDIMENSIONAMIENTO INTERACTIVO POR ARRASTRE DE ESQUINAS
  // =========================================================
  const handleStartResize = (corner: 'se' | 'sw' | 'ne' | 'nw', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedEl) return;

    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidth = selectedEl.offsetWidth;
    const initialHeight = selectedEl.offsetHeight;
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
      selectedEl.style.width = `${newWidth}px`;
      if (selectedEl.tagName.toLowerCase() === 'img') {
        selectedEl.style.height = 'auto'; // Mantener proporción natural
        selectedEl.style.maxHeight = 'none';
      }

      const calculatedHeight = Math.round(newWidth / aspectRatio);
      setSizeTooltip(`${newWidth} × ${calculatedHeight} px`);
      updateBounds(selectedEl);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
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
    if (!selectedEl) return;

    setIsDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;

    const currentLeft = parseFloat(selectedEl.style.left) || 0;
    const currentTop = parseFloat(selectedEl.style.top) || 0;

    selectedEl.style.position = 'relative';
    selectedEl.style.zIndex = '20';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const scale = escala || 1;
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;

      selectedEl.style.left = `${Math.round(currentLeft + deltaX)}px`;
      selectedEl.style.top = `${Math.round(currentTop + deltaY)}px`;

      updateBounds(selectedEl);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Desplazamiento fino con flechas
  const nudge = (dx: number, dy: number) => {
    if (!selectedEl) return;
    selectedEl.style.position = 'relative';
    const currentLeft = parseFloat(selectedEl.style.left) || 0;
    const currentTop = parseFloat(selectedEl.style.top) || 0;

    selectedEl.style.left = `${currentLeft + dx}px`;
    selectedEl.style.top = `${currentTop + dy}px`;
    updateBounds(selectedEl);
  };

  // Redimensionamiento porcentual rápido
  const scalePercent = (factor: number) => {
    if (!selectedEl) return;
    const currentWidth = selectedEl.offsetWidth;
    const newWidth = Math.max(30, Math.round(currentWidth * factor));
    selectedEl.style.width = `${newWidth}px`;
    if (selectedEl.tagName.toLowerCase() === 'img') {
      selectedEl.style.height = 'auto';
    }
    setTimeout(() => updateBounds(selectedEl), 30);
  };

  // Alineaciones estándar
  const setAlignment = (type: 'left' | 'center' | 'right') => {
    if (!selectedEl) return;
    selectedEl.style.position = '';
    selectedEl.style.left = '';
    selectedEl.style.top = '';

    if (type === 'left') {
      selectedEl.style.marginLeft = '0';
      selectedEl.style.marginRight = 'auto';
      selectedEl.style.display = 'block';
    } else if (type === 'center') {
      selectedEl.style.marginLeft = 'auto';
      selectedEl.style.marginRight = 'auto';
      selectedEl.style.display = 'block';
    } else if (type === 'right') {
      selectedEl.style.marginLeft = 'auto';
      selectedEl.style.marginRight = '0';
      selectedEl.style.display = 'block';
    }
    setTimeout(() => updateBounds(selectedEl), 30);
  };

  if (!selectedEl || !bounds) return null;

  const isImage = selectedEl.tagName.toLowerCase() === 'img';
  const tagLabel = isImage ? 'Imagen' : selectedEl.tagName.toLowerCase() === 'table' ? 'Tabla' : 'Cuadro';

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
            setSelectedEl(null);
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
