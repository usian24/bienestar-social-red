'use client';

import React from 'react';
import { Menu, Heart, Search, Home, Moon } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#f4f7fb] font-sans text-slate-800 text-sm antialiased overflow-hidden print:overflow-visible print:bg-white print:h-auto print:block">
      {/* Sidebar Lateral */}
      <aside className="w-56 bg-[#f4f7fb] border-r border-slate-200 flex flex-col shrink-0 h-full print:hidden">
        <div className="h-20 flex items-center px-4 gap-3 pt-2">
          <button className="text-slate-500 hover:text-slate-700">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 flex justify-center mt-2">
            <div className="w-[60px] h-[60px] rounded-full border-2 border-blue-300 flex flex-col items-center justify-center bg-[#f4f7fb] text-[6px] text-blue-700 font-bold leading-tight">
               <Heart className="w-5 h-5 text-blue-600 mb-0.5" />
               RED DE
            </div>
          </div>
        </div>

        <div className="px-4 mt-8 mb-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
            <input 
              type="text" 
              placeholder="UC" 
              className="w-full bg-white border border-slate-200 rounded pl-9 pr-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>

        <nav className="space-y-1 px-3 mt-2">
          <Link href="/inicio" className="flex items-center gap-3 px-3 py-2 rounded text-slate-600 hover:bg-slate-100 font-medium">
            <Home className="w-4 h-4 text-slate-400" />
            Inicio
          </Link>
        </nav>

        <div className="px-6 pt-4 pb-1 text-[11px] text-slate-400 font-medium mt-2">
          Reportes
        </div>
        <nav className="space-y-1 px-3">
          <div className="flex items-center gap-3 px-3 py-2 rounded text-slate-900 font-medium">
            <Heart className="w-4 h-4 text-slate-800 fill-slate-800" />
            Licencias
          </div>
          <div className="pl-9 pr-3 py-1 space-y-1">
            <Link href="/salud" className="block px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 font-medium">
              Salud
            </Link>
            <Link href="/maternidad" className="block px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 font-medium">
              Maternidad
            </Link>
            <Link href="/paternidad" className="block px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 font-medium">
              Paternidad
            </Link>
          </div>
        </nav>
      </aside>

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white print:overflow-visible print:h-auto print:block">
        {/* Barra Superior */}
        <header className="h-14 bg-white px-6 flex items-center justify-end shrink-0 border-b border-transparent shadow-sm z-10 print:hidden">
          <div className="flex items-center gap-4">
            <span className="text-[13px] font-medium text-slate-600">
              SEDE RED SALUD HUANUCO
            </span>
            <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full bg-blue-50">
              <Moon className="w-4 h-4 text-blue-600 fill-blue-600/20" />
            </button>
          </div>
        </header>

        {/* Contenido de la página (scrollable) */}
        <main className="flex-1 overflow-y-auto p-6 pt-4 print:overflow-visible print:p-0 print:m-0 print:block">
          {children}
        </main>
      </div>
    </div>
  );
}
