'use client';

import { useEffect, useRef } from 'react';

interface BackHandlerEntry {
  id: number;
  onBack: () => void;
}

declare global {
  interface Window {
    __appBackHandlers?: BackHandlerEntry[];
    __handleAppBackButton?: () => boolean;
  }
}

let nextHandlerId = 1;

function ensureGlobalBackDispatcher() {
  if (typeof window === 'undefined') return;
  if (!window.__appBackHandlers) {
    window.__appBackHandlers = [];
  }
  if (!window.__handleAppBackButton) {
    window.__handleAppBackButton = () => {
      const stack = window.__appBackHandlers;
      if (!stack || stack.length === 0) {
        return false;
      }
      const top = stack.pop();
      if (top) {
        try {
          top.onBack();
        } catch (err) {
          console.error('[BackHandler] Error ejecutando retorno de modal:', err);
        }
        return true;
      }
      return false;
    };
  }
}

export function registerBackHandler(onBack: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  ensureGlobalBackDispatcher();
  const id = nextHandlerId++;
  window.__appBackHandlers!.push({ id, onBack });

  return () => {
    const stack = window.__appBackHandlers;
    if (!stack) return;
    const idx = stack.findIndex((item) => item.id === id);
    if (idx !== -1) {
      stack.splice(idx, 1);
    }
  };
}

/**
 * Registra un manejador en pila LIFO para que el botón Atrás de Android (Capacitor WebView)
 * cierre primero el modal/visor superior antes de navegar atrás o salir de la aplicación.
 */
export function useBackHandler(isActive: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!isActive) return;
    return registerBackHandler(() => {
      onBackRef.current();
    });
  }, [isActive]);
}

