'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Home, ShieldAlert } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.replace('/inicio');
  };

  return (
    <main className="relative h-full min-h-screen w-full overflow-y-auto bg-[#F5F5F7] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex items-center justify-center p-5 sm:p-8 select-none">
      {/* Iluminación ambiental sutil estilo Apple */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="animate-nf-ambient absolute -top-28 -right-24 w-[380px] h-[380px] sm:w-[520px] sm:h-[520px] rounded-full bg-[#2575e6]/10 dark:bg-[#2575e6]/15 blur-3xl" />
        <div className="animate-nf-ambient absolute -bottom-32 -left-24 w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] rounded-full bg-sky-400/10 dark:bg-sky-500/10 blur-3xl" />
      </div>

      {/* Tarjeta principal Apple-minimalista */}
      <section className="animate-nf-fade-up relative z-10 w-full max-w-md rounded-[28px] bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_24px_70px_-20px_rgba(15,23,42,0.16)] p-7 sm:p-10 text-center">
        {/* Medallón animado con el Logo oficial de la Red de Salud Huánuco */}
        <div className="relative mx-auto w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center mb-6">
          <span
            aria-hidden="true"
            className="animate-nf-pulse absolute inset-0 rounded-full border border-[#2575e6]/30 dark:border-sky-400/25"
          />
          <span
            aria-hidden="true"
            className="animate-nf-pulse-delayed absolute inset-2 rounded-full border border-[#2575e6]/20 dark:border-sky-400/15"
          />
          <div className="animate-nf-float relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-white/15 shadow-[0_12px_32px_-8px_rgba(37,117,230,0.22)] flex items-center justify-center p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-red-huanuco.png"
              alt="Logo Red de Salud Huánuco"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="absolute -bottom-1 px-2.5 py-0.5 rounded-full bg-[#1d1d1f] dark:bg-white text-white dark:text-slate-900 text-[10px] font-semibold tracking-[0.14em] uppercase shadow-sm">
            404
          </span>
        </div>

        {/* Etiqueta institucional */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 text-[#1d4ed8] dark:text-sky-300 text-[11px] font-semibold tracking-wide mb-3">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Red de Salud Huánuco · U.E. 404</span>
        </div>

        {/* Título editorial limpio */}
        <h1 className="text-2xl sm:text-[28px] font-semibold tracking-[-0.025em] text-[#1d1d1f] dark:text-white leading-tight">
          Recurso no encontrado
        </h1>

        <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Es posible que el certificado o documento haya sido eliminado del servidor, o que la ruta consultada ya no esté disponible.
        </p>

        {pathname && pathname !== '/' && (
          <div className="mt-4 px-3.5 py-2 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-white/10 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
            {pathname}
          </div>
        )}

        {/* Acciones claras para regresar sin quedar atrapado */}
        <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold shadow-[0_8px_20px_-6px_rgba(0,113,227,0.45)] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver atrás</span>
          </button>

          <Link
            href="/inicio"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold border border-slate-200/80 dark:border-white/10 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Ir al Inicio</span>
          </Link>
        </div>

        <p className="mt-6 text-[11px] text-slate-400 dark:text-slate-500">
          Sistema de Bienestar Social y Subsidios · Dirección Ejecutiva Huánuco
        </p>
      </section>
    </main>
  );
}

