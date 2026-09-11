'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Eye, 
  Menu, 
  Home, 
  Heart, 
  Moon,
  Clock,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

type Submodulo = 'SALUD' | 'MATERNIDAD_PATERNIDAD';

interface RegistroLicencia {
  id: number;
  dni: string;
  apellidosNombres: string;
  cargo: string;
  establecimiento: string;
  essalud: number;
  particulares: number;
  ley30012: number;
  totalDias: number;
  microred: string;
  condicionLaboral: string;
}

const REGISTROS_DATA: RegistroLicencia[] = [
  { id: 1, dni: '40917914', apellidosNombres: 'ABAD LUCAS, ANITA GISELA', cargo: 'TECNICO EN LABORATORIO', establecimiento: 'C.S. ACOMAYO', essalud: 2, particulares: 0, ley30012: 0, totalDias: 2, microred: 'AMARILIS', condicionLaboral: '--TODOS--' },
  { id: 2, dni: '46974163', apellidosNombres: 'ACHIC ALVARADO, VANESSA SILIANA', cargo: 'ENFERMERA/O', establecimiento: 'P.S. PUEBLO LIBRE DE MAYOBAMBA', essalud: 2, particulares: 0, ley30012: 0, totalDias: 2, microred: 'AMARILIS', condicionLaboral: '--TODOS--' },
  { id: 3, dni: '71234646', apellidosNombres: 'ALCA LUCAS, DEZIRE AGATHA', cargo: 'MEDICO CIRUJANO', establecimiento: 'P.S. PUEBLO LIBRE DE MAYOBAMBA', essalud: 0, particulares: 4, ley30012: 0, totalDias: 4, microred: 'AMARILIS', condicionLaboral: '--TODOS--' },
  { id: 4, dni: '21442571', apellidosNombres: 'ALTAMIRANO TABER, ANA MARIA BERTHA', cargo: 'CIRUJANO DENTISTA', establecimiento: 'C.S. ACOMAYO', essalud: 30, particulares: 0, ley30012: 0, totalDias: 30, microred: 'AMARILIS', condicionLaboral: '--TODOS--' },
  { id: 5, dni: '22509130', apellidosNombres: 'ARRIAGA CASTAÑEDA, YVONE YARDENNY', cargo: 'OBSTETRA', establecimiento: 'C.S. ACOMAYO', essalud: 1, particulares: 0, ley30012: 0, totalDias: 1, microred: 'AMARILIS', condicionLaboral: '--TODOS--' },
  { id: 6, dni: '44517153', apellidosNombres: 'AYRA SALAZAR, DINA MERINA', cargo: 'TECNICO EN ESTADISTICA', establecimiento: 'C.S. ACOMAYO', essalud: 2, particulares: 0, ley30012: 0, totalDias: 2, microred: 'AMARILIS', condicionLaboral: '--TODOS--' },
  { id: 7, dni: '42900829', apellidosNombres: 'CALDERON SANCHEZ, SYBILA', cargo: 'ENFERMERA/O', establecimiento: 'C.S. ACOMAYO', essalud: 0, particulares: 2, ley30012: 0, totalDias: 2, microred: 'AMARILIS', condicionLaboral: '--TODOS--' },
  { id: 8, dni: '42164813', apellidosNombres: 'CALIXTO MALLQUI, MITHCEN MILAGROS', cargo: 'TECNICO EN ENFERMERIA', establecimiento: 'P.S. PUENTE DURAND', essalud: 82, particulares: 0, ley30012: 0, totalDias: 82, microred: 'AMARILIS', condicionLaboral: '--TODOS--' },
  { id: 9, dni: '22516472', apellidosNombres: 'CASTRO HERRERA, DIANE KAROL', cargo: 'OBSTETRA', establecimiento: 'C.S. ACOMAYO', essalud: 0, particulares: 15, ley30012: 0, totalDias: 15, microred: 'AMARILIS', condicionLaboral: '--TODOS--' },
  { id: 10, dni: '45695272', apellidosNombres: 'ESPINOZA TORRES, LISBETH DORKAS', cargo: 'ENFERMERA/O', establecimiento: 'C.S. ACOMAYO', essalud: 0, particulares: 1, ley30012: 0, totalDias: 1, microred: 'AMARILIS', condicionLaboral: '--TODOS--' },
  { id: 11, dni: '22474328', apellidosNombres: 'ESPINOZA VALDIVIA, ROSARIO BEATRIZ', cargo: 'OBSTETRA', establecimiento: 'P.S. PUENTE DURAND', essalud: 1, particulares: 3, ley30012: 0, totalDias: 4, microred: 'AMARILIS', condicionLaboral: '--TODOS--' }
];

export default function LicenciasPage() {
  const [submodulo, setSubmodulo] = useState<Submodulo>('SALUD');
  
  // Filtros
  const [ambito, setAmbito] = useState('Microred');
  const [microred, setMicrored] = useState('AMARILIS');
  const [establecimiento, setEstablecimiento] = useState('--Todos--');
  const [condicionLaboral, setCondicionLaboral] = useState('--TODOS--');
  const [mes, setMes] = useState('Todos');
  const [anio, setAnio] = useState('2026');

  return (
    <div className="flex h-screen bg-[#f4f7fb] font-sans text-slate-800 text-sm antialiased">
      {/* Sidebar Lateral */}
      <aside className="w-56 bg-[#f4f7fb] border-r border-slate-200 flex flex-col shrink-0">
        <div className="h-20 flex items-center px-4 gap-3 pt-2">
          <button className="text-slate-500 hover:text-slate-700">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 flex justify-center mt-2">
            {/* Logo placeholder */}
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
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded text-slate-600 hover:bg-slate-100 font-medium">
            <Home className="w-4 h-4 text-slate-400" />
            Inicio
          </a>
        </nav>

        <div className="px-6 pt-4 pb-1 text-[11px] text-slate-400 font-medium mt-2">
          Reportes
        </div>
        <nav className="space-y-1 px-3">
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-100 text-slate-900 font-medium">
            <Heart className="w-4 h-4 text-slate-800 fill-slate-800" />
            Licencias
          </a>
        </nav>
      </aside>

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white">
        {/* Barra Superior */}
        <header className="h-14 bg-white px-6 flex items-center justify-end shrink-0 border-b-0 border-transparent">
          <div className="flex items-center gap-4">
            <span className="text-[13px] font-medium text-slate-600">
              SEDE RED SALUD HUANUCO
            </span>
            <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full bg-blue-50">
              <Moon className="w-4 h-4 text-blue-600 fill-blue-600/20" />
            </button>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="p-6 pt-2">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setSubmodulo('SALUD')}
              className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold transition-all shadow-sm ${
                submodulo === 'SALUD'
                  ? 'bg-[#1c64f2] text-white border border-[#1c64f2]'
                  : 'bg-white text-[#1c64f2] border border-[#1c64f2]'
              }`}
            >
              <Clock className="w-4 h-4" />
              Salud
            </button>
            <button
              onClick={() => setSubmodulo('MATERNIDAD_PATERNIDAD')}
              className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold transition-all shadow-sm ${
                submodulo === 'MATERNIDAD_PATERNIDAD'
                  ? 'bg-[#1c64f2] text-white border border-[#1c64f2]'
                  : 'bg-white text-[#1c64f2] border border-[#1c64f2]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Maternidad/Paternidad
            </button>
          </div>

          {/* Filtros */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row p-1">
            <div className="flex-1 p-4">
              <h2 className="text-[15px] font-semibold text-slate-600 uppercase tracking-wide mb-4">
                LICENCIAS DE SALUD
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 font-medium">Ámbito</label>
                  <select 
                    value={ambito} 
                    onChange={(e) => setAmbito(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 focus:outline-blue-500"
                  >
                    <option value="Microred">Microred</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 font-medium">Microred</label>
                  <select 
                    value={microred} 
                    onChange={(e) => setMicrored(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 focus:outline-blue-500"
                  >
                    <option value="AMARILIS">AMARILIS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 font-medium">Establecimiento</label>
                  <select 
                    value={establecimiento} 
                    onChange={(e) => setEstablecimiento(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 focus:outline-blue-500"
                  >
                    <option value="--Todos--">--Todos--</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 font-medium">Condición Laboral</label>
                  <select 
                    value={condicionLaboral} 
                    onChange={(e) => setCondicionLaboral(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 focus:outline-blue-500"
                  >
                    <option value="--TODOS--">--TODOS--</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 font-medium">MES</label>
                  <select 
                    value={mes} 
                    onChange={(e) => setMes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 focus:outline-blue-500"
                  >
                    <option value="Todos">Todos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 font-medium">AÑO</label>
                  <select 
                    value={anio} 
                    onChange={(e) => setAnio(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 focus:outline-blue-500"
                  >
                    <option value="2026">2026</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bloque derecho con botones */}
            <div className="w-full md:w-56 bg-slate-50/50 border-l border-slate-100 p-6 flex flex-col justify-center gap-3">
              <button className="w-full bg-[#1c64f2] hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center gap-2 shadow-sm transition-colors">
                <Eye className="w-4 h-4" />
                Mostrar
              </button>
              <button className="w-full bg-[#10b981] hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center gap-2 shadow-sm transition-colors">
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
            </div>
          </div>

          {/* Tabla de Resultados */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#0f172a] text-white">
                    <th className="py-3 px-4 font-semibold text-center w-12">#</th>
                    <th className="py-3 px-4 font-semibold w-24">DNI</th>
                    <th className="py-3 px-4 font-semibold">Apellidos y Nombres</th>
                    <th className="py-3 px-4 font-semibold">Cargo</th>
                    <th className="py-3 px-4 font-semibold">Establecimiento</th>
                    <th className="py-3 px-3 font-semibold text-center">Essalud</th>
                    <th className="py-3 px-3 font-semibold text-center">Particulares</th>
                    <th className="py-3 px-3 font-semibold text-center">Ley 30012</th>
                    <th className="py-3 px-3 font-bold text-center">Total días</th>
                    <th className="py-3 px-4 font-semibold text-center w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {REGISTROS_DATA.map((item, index) => {
                    const isOver20 = item.totalDias > 20;
                    return (
                      <tr 
                        key={item.id} 
                        className={isOver20 ? 'bg-[#fde4e4]' : (index % 2 === 0 ? 'bg-white' : 'bg-slate-50')}
                      >
                        <td className="py-2.5 px-4 text-center text-slate-500">{item.id}</td>
                        <td className="py-2.5 px-4 text-slate-600">{item.dni}</td>
                        <td className="py-2.5 px-4 text-slate-800 font-medium">{item.apellidosNombres}</td>
                        <td className="py-2.5 px-4 text-slate-500">{item.cargo}</td>
                        <td className="py-2.5 px-4 text-slate-500">{item.establecimiento}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{item.essalud}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{item.particulares}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{item.ley30012}</td>
                        <td className={`py-2.5 px-3 text-center font-bold ${isOver20 ? 'text-red-700' : 'text-slate-700'}`}>
                          {item.totalDias}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button className="p-1.5 rounded-md bg-[#3eb6f0] hover:bg-sky-400 text-white shadow-sm transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}