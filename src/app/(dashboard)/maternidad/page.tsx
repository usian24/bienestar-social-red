'use client';

import React, { useState } from 'react';
import { 
  Eye, 
  FileSpreadsheet,
  FileText
} from 'lucide-react';

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

const REGISTROS_MATERNIDAD: RegistroLicencia[] = [
  { id: 1, dni: '45689123', apellidosNombres: 'RODRIGUEZ SALAS, MARIA LUISA', cargo: 'ENFERMERA/O', establecimiento: 'C.S. APARICIO POMARES', essalud: 98, particulares: 0, ley30012: 0, totalDias: 98, microred: 'HUANUCO', condicionLaboral: 'NOMB' },
  { id: 2, dni: '42314567', apellidosNombres: 'VALVERDE RUIZ, SOFIA', cargo: 'OBSTETRA', establecimiento: 'C.S. AMARILIS', essalud: 98, particulares: 0, ley30012: 0, totalDias: 98, microred: 'AMARILIS', condicionLaboral: 'CAS' },
  { id: 3, dni: '72314569', apellidosNombres: 'GOMEZ MARTINEZ, ANA LAURA', cargo: 'MEDICO CIRUJANO', establecimiento: 'C.S. CHURUBAMBA', essalud: 98, particulares: 0, ley30012: 0, totalDias: 98, microred: 'VALLE', condicionLaboral: 'CAS' },
];

export default function MaternidadPage() {
  // Filtros
  const [ambito, setAmbito] = useState('Microred');
  const [microred, setMicrored] = useState('AMARILIS');
  const [establecimiento, setEstablecimiento] = useState('--Todos--');
  const [condicionLaboral, setCondicionLaboral] = useState('--TODOS--');
  const [dia, setDia] = useState('Todos');
  const [mes, setMes] = useState('Todos');
  const [anio, setAnio] = useState('2026');

  return (
    <>
      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-6 p-5">
        <h2 className="text-[15px] font-semibold text-pink-600 uppercase tracking-wide mb-4 flex items-center gap-2">
          LICENCIAS DE MATERNIDAD
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Ámbito</label>
            <select 
              value={ambito} 
              onChange={(e) => setAmbito(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 focus:outline-pink-500"
            >
              <option value="Microred">Microred</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Microred</label>
            <select 
              value={microred} 
              onChange={(e) => setMicrored(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 focus:outline-pink-500"
            >
              <option value="AMARILIS">AMARILIS</option>
              <option value="HUANUCO">HUANUCO</option>
              <option value="VALLE">VALLE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Establecimiento</label>
            <select 
              value={establecimiento} 
              onChange={(e) => setEstablecimiento(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 focus:outline-pink-500"
            >
              <option value="--Todos--">--Todos--</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-1 md:col-span-1">
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Condición Laboral</label>
            <select 
              value={condicionLaboral} 
              onChange={(e) => setCondicionLaboral(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 focus:outline-pink-500"
            >
              <option value="--TODOS--">--TODOS--</option>
              <option value="NOMB">NOMB</option>
              <option value="CAS">CAS</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-1">
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">DÍA</label>
            <select 
              value={dia} 
              onChange={(e) => setDia(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 focus:outline-pink-500"
            >
              <option value="Todos">Todos</option>
              {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="col-span-1 md:col-span-1">
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">MES</label>
            <select 
              value={mes} 
              onChange={(e) => setMes(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 focus:outline-pink-500"
            >
              <option value="Todos">Todos</option>
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-1">
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">AÑO</label>
            <select 
              value={anio} 
              onChange={(e) => setAnio(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-600 focus:outline-pink-500"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
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
                <th className="py-3 px-4 font-semibold text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {REGISTROS_MATERNIDAD.map((item, index) => {
                return (
                  <tr 
                    key={item.id} 
                    className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="py-2.5 px-4 text-center text-slate-500">{item.id}</td>
                    <td className="py-2.5 px-4 text-slate-600">{item.dni}</td>
                    <td className="py-2.5 px-4 text-slate-800 font-medium">{item.apellidosNombres}</td>
                    <td className="py-2.5 px-4 text-slate-500">{item.cargo}</td>
                    <td className="py-2.5 px-4 text-slate-500">{item.establecimiento}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{item.essalud}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{item.particulares}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{item.ley30012}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-pink-700">
                      {item.totalDias}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button className="p-1.5 rounded-md bg-[#3eb6f0] hover:bg-sky-400 text-white shadow-sm transition-colors" title="Ver detalle">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-md bg-[#10b981] hover:bg-emerald-500 text-white shadow-sm transition-colors" title="Exportar a Excel">
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded-md bg-[#ef4444] hover:bg-red-500 text-white shadow-sm transition-colors" title="Generar Informe PDF">
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

