'use client';

import { useReactToPrint } from 'react-to-print';
import { RefObject, useCallback } from 'react';

interface UseImprimirOptions {
  contentRef: RefObject<any>;
  documentTitle?: string;
}

/**
 * Hook personalizado para impresión segura y multiplataforma.
 * Resuelve el error de 'contentWindow' de react-to-print en celulares y WebViews móviles (Android/Capacitor/iOS),
 * activando la impresión nativa window.print() en móviles y react-to-print con fallback automático en escritorio.
 */
export function useImprimir({ contentRef, documentTitle }: UseImprimirOptions) {
  const reactToPrint = useReactToPrint({
    contentRef,
    documentTitle,
    onPrintError: (errorLocation, error) => {
      console.warn(`[Impresión] react-to-print falló en ${errorLocation}. Usando window.print() nativo:`, error);
      if (typeof window !== 'undefined') {
        const tituloAnterior = document.title;
        if (documentTitle) document.title = documentTitle;
        window.print();
        setTimeout(() => { document.title = tituloAnterior; }, 2000);
      }
    }
  });

  const imprimir = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Detectar si el usuario está en celular, tablet o WebView (Android / Capacitor / iOS)
    const esDispositivoMovil = 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 768;

    if (esDispositivoMovil) {
      // En navegadores móviles y WebViews de Android, los iframes ocultos fallan por restricciones
      // de seguridad / sandbox del sistema. window.print() invoca directamente el visor nativo de PDF del celular.
      const tituloAnterior = document.title;
      if (documentTitle) {
        document.title = documentTitle;
      }

      const restaurar = () => {
        document.title = tituloAnterior;
        window.removeEventListener('afterprint', restaurar);
      };
      window.addEventListener('afterprint', restaurar);
      setTimeout(restaurar, 3000);

      window.print();
    } else {
      try {
        reactToPrint();
      } catch (err) {
        console.warn('[Impresión] Error invocando reactToPrint, recurriendo a window.print() nativo:', err);
        const tituloAnterior = document.title;
        if (documentTitle) document.title = documentTitle;
        window.print();
        setTimeout(() => { document.title = tituloAnterior; }, 2000);
      }
    }
  }, [reactToPrint, documentTitle]);

  return imprimir;
}
