'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  ImageOff,
  Loader2,
  Maximize2,
  RotateCcw,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useBackHandler } from '@/shared/utils/appBackHandler';

interface VisorEvidenciaModalProps {
  isOpen: boolean;
  url: string | null;
  titulo?: string;
  onClose: () => void;
}

interface TransformState {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isPdfUrl(url: string): boolean {
  return url.split('?')[0].toLowerCase().endsWith('.pdf');
}

function VisorEvidenciaContent({
  url,
  titulo,
  onClose,
}: {
  url: string;
  titulo?: string;
  onClose: () => void;
}) {
  const esPdf = isPdfUrl(url);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [transform, setTransform] = useState<TransformState>({ scale: 1, x: 0, y: 0 });
  const transformRef = useRef<TransformState>({ scale: 1, x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [imgLoading, setImgLoading] = useState(!esPdf);
  const [imgError, setImgError] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  // Gestos multi-touch y puntero
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const panStartRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);
  const pinchStartRef = useRef<{
    dist: number;
    midX: number;
    midY: number;
    scale: number;
    tx: number;
    ty: number;
  } | null>(null);
  const tapCandidateRef = useRef<{
    time: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const esDispositivoMovil =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Calcular límites de desplazamiento para que el certificado pueda moverse con la mano sin perderse fuera de pantalla
  const clampTranslation = useCallback(
    (rawX: number, rawY: number, scale: number, rotDeg = rotationRef.current) => {
      const stage = stageRef.current;
      if (!stage) return { x: rawX, y: rawY };

      const stageW = stage.clientWidth;
      const stageH = stage.clientHeight;
      if (stageW <= 0 || stageH <= 0) return { x: rawX, y: rawY };

      let baseW = stageW * 0.85;
      let baseH = stageH * 0.85;

      const img = imgRef.current;
      if (img && naturalSize && naturalSize.w > 0 && naturalSize.h > 0) {
        const padW = Math.max(120, stageW - 24);
        const padH = Math.max(120, stageH - 24);
        const fitRatio = Math.min(padW / naturalSize.w, padH / naturalSize.h);
        baseW = naturalSize.w * fitRatio;
        baseH = naturalSize.h * fitRatio;
      }

      const rotatedQuarter = Math.abs(rotDeg % 180) === 90;
      const effW = (rotatedQuarter ? baseH : baseW) * scale;
      const effH = (rotatedQuarter ? baseW : baseH) * scale;

      const maxX =
        effW > stageW
          ? (effW - stageW) / 2 + 28
          : Math.max(32, (stageW - effW) / 2);
      const maxY =
        effH > stageH
          ? (effH - stageH) / 2 + 28
          : Math.max(32, (stageH - effH) / 2);

      return {
        x: clamp(rawX, -maxX, maxX),
        y: clamp(rawY, -maxY, maxY),
      };
    },
    [naturalSize]
  );

  const commitTransform = useCallback((next: TransformState) => {
    transformRef.current = next;
    setTransform(next);
  }, []);

  const resetView = useCallback(() => {
    setIsInteracting(false);
    rotationRef.current = 0;
    setRotation(0);
    commitTransform({ scale: 1, x: 0, y: 0 });
  }, [commitTransform]);

  const zoomAtPoint = useCallback(
    (targetScale: number, clientX?: number, clientY?: number) => {
      const nextScale = clamp(Number(targetScale.toFixed(3)), MIN_SCALE, MAX_SCALE);
      const prev = transformRef.current;
      const stage = stageRef.current;

      if (!stage || clientX === undefined || clientY === undefined) {
        const ratio = nextScale / prev.scale;
        const clamped =
          nextScale <= 1
            ? { x: 0, y: 0 }
            : clampTranslation(prev.x * ratio, prev.y * ratio, nextScale);
        commitTransform({ scale: nextScale, x: clamped.x, y: clamped.y });
        return;
      }

      const rect = stage.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const factor = nextScale / prev.scale;
      const dx = clientX - cx - prev.x;
      const dy = clientY - cy - prev.y;

      const rawX = clientX - cx - dx * factor;
      const rawY = clientY - cy - dy * factor;
      const clamped = clampTranslation(rawX, rawY, nextScale);
      commitTransform({ scale: nextScale, x: clamped.x, y: clamped.y });
    },
    [clampTranslation, commitTransform]
  );

  const rotateBy90 = useCallback(() => {
    setIsInteracting(false);
    const nextRot = (rotationRef.current + 90) % 360;
    rotationRef.current = nextRot;
    setRotation(nextRot);
    const prev = transformRef.current;
    const clamped = clampTranslation(prev.x, prev.y, prev.scale, nextRot);
    commitTransform({ scale: prev.scale, x: clamped.x, y: clamped.y });
  }, [clampTranslation, commitTransform]);

  // Tecla Escape para escritorio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        zoomAtPoint(transformRef.current.scale + 0.35);
      } else if (e.key === '-') {
        zoomAtPoint(transformRef.current.scale - 0.35);
      } else if (e.key === '0') {
        resetView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, resetView, zoomAtPoint]);

  // Rueda del ratón en escritorio sin desplazar la página detrás
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || esPdf) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      zoomAtPoint(transformRef.current.scale * factor, e.clientX, e.clientY);
    };

    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, [esPdf, zoomAtPoint]);

  const initSinglePointerPan = (pointer: { x: number; y: number }) => {
    pinchStartRef.current = null;
    panStartRef.current = {
      startX: pointer.x,
      startY: pointer.y,
      startTx: transformRef.current.x,
      startTy: transformRef.current.y,
    };
  };

  const initPinch = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    panStartRef.current = null;
    tapCandidateRef.current = null;
    pinchStartRef.current = {
      dist: Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y)),
      midX: (p1.x + p2.x) / 2,
      midY: (p1.y + p2.y) / 2,
      scale: transformRef.current.scale,
      tx: transformRef.current.x,
      ty: transformRef.current.y,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (esPdf) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Algunos WebViews no permiten capturar punteros sintéticos
    }

    const pt = { x: e.clientX, y: e.clientY };
    pointersRef.current.set(e.pointerId, pt);
    setIsInteracting(true);

    const active = Array.from(pointersRef.current.values());
    if (active.length === 1) {
      initSinglePointerPan(active[0]);
      tapCandidateRef.current = {
        time: performance.now(),
        x: pt.x,
        y: pt.y,
        moved: false,
      };
    } else if (active.length >= 2) {
      initPinch(active[0], active[1]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (esPdf || !pointersRef.current.has(e.pointerId)) return;

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const active = Array.from(pointersRef.current.values());

    if (active.length >= 2) {
      if (!pinchStartRef.current) {
        initPinch(active[0], active[1]);
      }
      const start = pinchStartRef.current!;
      const stage = stageRef.current;
      if (!stage) return;

      const rect = stage.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const curDist = Math.max(10, Math.hypot(active[1].x - active[0].x, active[1].y - active[0].y));
      const curMidX = (active[0].x + active[1].x) / 2;
      const curMidY = (active[0].y + active[1].y) / 2;

      const newScale = clamp(start.scale * (curDist / start.dist), MIN_SCALE, MAX_SCALE);
      const factor = newScale / start.scale;

      const dx = start.midX - cx - start.tx;
      const dy = start.midY - cy - start.ty;

      const rawX = curMidX - cx - dx * factor;
      const rawY = curMidY - cy - dy * factor;
      const clamped = clampTranslation(rawX, rawY, newScale);

      commitTransform({ scale: newScale, x: clamped.x, y: clamped.y });
      return;
    }

    if (active.length === 1 && panStartRef.current) {
      const pt = active[0];
      if (tapCandidateRef.current && !tapCandidateRef.current.moved) {
        if (Math.hypot(pt.x - tapCandidateRef.current.x, pt.y - tapCandidateRef.current.y) > 8) {
          tapCandidateRef.current.moved = true;
        }
      }

      const deltaX = pt.x - panStartRef.current.startX;
      const deltaY = pt.y - panStartRef.current.startY;
      const curScale = transformRef.current.scale;
      const clamped = clampTranslation(
        panStartRef.current.startTx + deltaX,
        panStartRef.current.startTy + deltaY,
        curScale
      );

      commitTransform({ scale: curScale, x: clamped.x, y: clamped.y });
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (esPdf) return;
    pointersRef.current.delete(e.pointerId);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignorar si ya fue liberado
    }

    const active = Array.from(pointersRef.current.values());
    if (active.length >= 2) {
      initPinch(active[0], active[1]);
      return;
    }

    if (active.length === 1) {
      // Al levantar un dedo tras un pellizco, reanclar suavemente el arrastre sin saltos
      initSinglePointerPan(active[0]);
      return;
    }

    setIsInteracting(false);
    panStartRef.current = null;
    pinchStartRef.current = null;

    // Detectar doble toque para acercar / ajustar a pantalla
    const tap = tapCandidateRef.current;
    tapCandidateRef.current = null;
    if (tap && !tap.moved && performance.now() - tap.time < 260) {
      const now = performance.now();
      const prevTap = lastTapRef.current;
      if (
        prevTap &&
        now - prevTap.time < 320 &&
        Math.hypot(tap.x - prevTap.x, tap.y - prevTap.y) < 36
      ) {
        lastTapRef.current = null;
        if (transformRef.current.scale > 1.15) {
          commitTransform({ scale: 1, x: 0, y: 0 });
        } else {
          zoomAtPoint(2.4, tap.x, tap.y);
        }
      } else {
        lastTapRef.current = { time: now, x: tap.x, y: tap.y };
      }
    }
  };

  const porcentajeZoom = Math.round(transform.scale * 100);

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950 text-white flex flex-col select-none"
      style={{ touchAction: 'none', overscrollBehavior: 'none' }}
    >
      {/* Barra superior con botón explícito Volver + Cerrar */}
      <header className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 bg-slate-900/95 border-b border-white/10 shrink-0 z-20 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/25 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
          title="Volver al expediente"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        <div className="min-w-0 text-center flex-1">
          <p className="text-xs sm:text-sm font-semibold text-white truncate">
            {titulo || 'Certificado Médico Adjunto'}
          </p>
          {!esPdf && (
            <p className="text-[10px] text-slate-400 truncate hidden sm:block">
              Pellizca con dos dedos para acercar/alejar · Arrastra para mover · Doble toque para zoom rápido
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={url}
            download
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
            title="Descargar evidencia"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-rose-500/80 text-slate-200 hover:text-white transition-colors cursor-pointer"
            title="Cerrar visor"
            aria-label="Cerrar visor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Escenario principal */}
      {esPdf ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-900 overflow-hidden">
          {esDispositivoMovil ? (
            <div className="max-w-sm w-full bg-slate-800/90 border border-white/10 rounded-2xl p-6 text-center shadow-2xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mx-auto text-blue-300">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Documento PDF Adjunto</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Descarga el archivo para abrirlo con tu lector de PDF en el celular sin salir de la aplicación.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 pt-1">
                <a
                  href={url}
                  download
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar / Abrir PDF
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Volver a la aplicación
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col gap-3 max-w-5xl">
              <div className="flex justify-end">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir PDF en pestaña nueva
                </a>
              </div>
              <iframe
                src={url}
                title={titulo || 'Certificado PDF'}
                className="w-full flex-1 rounded-xl bg-white border border-white/10"
              />
            </div>
          )}
        </div>
      ) : (
        <div
          ref={stageRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className="flex-1 min-h-0 relative overflow-hidden flex items-center justify-center bg-slate-950 p-3 sm:p-6"
          style={{
            touchAction: 'none',
            overscrollBehavior: 'none',
            cursor: isInteracting ? 'grabbing' : transform.scale > 1 ? 'grab' : 'default',
          }}
        >
          {imgLoading && !imgError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300 z-10 pointer-events-none">
              <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
              <span className="text-xs font-medium">Cargando certificado...</span>
            </div>
          )}

          {imgError ? (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="max-w-xs w-full bg-slate-900/95 border border-white/10 rounded-3xl p-6 text-center space-y-3.5 z-10 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mx-auto text-slate-300">
                <ImageOff className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  Evidencia no disponible
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Es posible que la imagen haya sido eliminada del almacenamiento o no se pueda cargar en este momento.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al expediente</span>
              </button>
            </div>
          ) : (
            <div
              className="flex items-center justify-center max-w-full max-h-full pointer-events-none"
              style={{
                transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                willChange: 'transform',
                transition: isInteracting
                  ? 'none'
                  : 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              <img
                ref={imgRef}
                src={url}
                alt={titulo || 'Certificado Médico'}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onLoad={(e) => {
                  const target = e.currentTarget;
                  setNaturalSize({
                    w: target.naturalWidth || 1000,
                    h: target.naturalHeight || 1000,
                  });
                  setImgLoading(false);
                }}
                onError={() => {
                  setImgLoading(false);
                  setImgError(true);
                }}
                className="max-w-[calc(100vw-24px)] max-h-[calc(100dvh-176px)] w-auto h-auto object-contain rounded shadow-2xl select-none pointer-events-none"
              />
            </div>
          )}
        </div>
      )}

      {/* Barra inferior de controles táctiles (solo imágenes) */}
      {!esPdf && !imgError && (
        <footer className="px-3 py-3 bg-slate-900/95 border-t border-white/10 flex flex-col items-center gap-1.5 shrink-0 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="inline-flex items-center gap-1 sm:gap-2 bg-slate-800/90 border border-white/10 rounded-full px-2.5 py-1.5 shadow-xl">
            <button
              type="button"
              onClick={() => zoomAtPoint(transformRef.current.scale - 0.35)}
              disabled={transform.scale <= MIN_SCALE}
              className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 disabled:opacity-35 text-white transition-colors cursor-pointer"
              title="Alejar zoom"
              aria-label="Alejar zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={resetView}
              className="px-2.5 py-1 rounded-full hover:bg-white/10 text-xs font-mono font-bold min-w-[54px] text-center text-slate-100 cursor-pointer"
              title="Restablecer zoom al 100%"
            >
              {porcentajeZoom}%
            </button>

            <button
              type="button"
              onClick={() => zoomAtPoint(transformRef.current.scale + 0.45)}
              disabled={transform.scale >= MAX_SCALE}
              className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 disabled:opacity-35 text-white transition-colors cursor-pointer"
              title="Acercar zoom"
              aria-label="Acercar zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-white/15 mx-0.5" />

            <button
              type="button"
              onClick={rotateBy90}
              className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 text-white transition-colors cursor-pointer"
              title="Rotar 90 grados"
              aria-label="Rotar 90 grados"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={resetView}
              className="px-2.5 py-1.5 rounded-full hover:bg-white/10 active:bg-white/20 text-slate-200 hover:text-white text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
              title="Ajustar a pantalla"
            >
              {transform.scale === 1 && rotation === 0 && transform.x === 0 && transform.y === 0 ? (
                <Maximize2 className="w-3.5 h-3.5" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span className="inline">Ajustar</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 sm:hidden text-center">
            Usa dos dedos para acercar/alejar y un dedo para mover
          </p>
        </footer>
      )}
    </div>
  );
}

export default function VisorEvidenciaModal({
  isOpen,
  url,
  titulo,
  onClose,
}: VisorEvidenciaModalProps): React.JSX.Element | null {
  useBackHandler(isOpen && !!url, onClose);

  if (!isOpen || !url || typeof document === 'undefined') {
    return null;
  }

  return (
    <>
      {createPortal(
        <VisorEvidenciaContent key={url} url={url} titulo={titulo} onClose={onClose} />,
        document.body
      )}
    </>
  );
}
