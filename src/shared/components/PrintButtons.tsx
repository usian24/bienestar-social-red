"use client";

import React from 'react';

export default function PrintButtons() {
  return (
    <div className="no-print fixed bottom-8 right-8 flex gap-4 z-50">
      <button 
        onClick={() => window.close()} 
        className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded hover:bg-slate-300 shadow-md"
      >
        Cerrar
      </button>
      <button 
        onClick={() => window.print()} 
        className="px-4 py-2 bg-red-600 text-white font-bold rounded shadow hover:bg-red-700 flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Descargar / Imprimir PDF
      </button>
    </div>
  );
}

