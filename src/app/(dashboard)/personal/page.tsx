'use client';

import React, { useState, useEffect } from 'react';
import { Search, UserPlus } from 'lucide-react';

export default function PersonalPage() {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [buscando, setBuscando] = useState(false);

  // Efecto para buscar automáticamente cuando se escribe
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (busqueda.length >= 2) {
        setBuscando(true);
        try {
          const res = await fetch(`/api/trabajadores/buscar?q=${encodeURIComponent(busqueda)}`);
          const data = await res.json();
          setResultados(data);
        } catch (error) {
          console.error("Error buscando", error);
        } finally {
          setBuscando(false);
        }
      } else {
        setResultados([]); // Limpiar si borran la búsqueda
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [busqueda]);

  return (
    <div className="space-y-6">
      {/* Encabezado y Buscador Principal */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Directorio de Personal</h1>
        <p className="text-slate-500 mb-6 text-sm">
          Busca a cualquier trabajador por DNI o Nombres para ver su historial completo o registrar a un nuevo trabajador en el sistema.
        </p>
        
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Ingresa DNI o Apellidos..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md pl-10 pr-4 py-2 text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium shadow-sm transition-colors flex items-center gap-2">
            <Search className="w-4 h-4" />
            Buscar
          </button>
          <button className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-2 rounded-md font-medium shadow-sm transition-colors flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Nuevo Ingreso
          </button>
        </div>
      </div>

      {/* Resultados de Búsqueda Activa */}
      {busqueda.length >= 2 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">Resultados para "{busqueda}"</h2>
          </div>
          
          {buscando ? (
            <div className="p-8 text-center text-slate-500">Buscando en la base de datos...</div>
          ) : resultados.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No se encontró ningún trabajador con esos datos.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-6 font-medium">DNI</th>
                    <th className="py-3 px-6 font-medium">Trabajador</th>
                    <th className="py-3 px-6 font-medium">Cargo</th>
                    <th className="py-3 px-6 font-medium">Condición Laboral</th>
                    <th className="py-3 px-6 font-medium">Microred</th>
                    <th className="py-3 px-6 font-medium">Establecimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultados.map((trabajador) => (
                    <tr key={trabajador.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-6 text-slate-600">{trabajador.dni}</td>
                      <td className="py-3 px-6 font-medium text-slate-800">
                        {trabajador.apellidos}, {trabajador.nombres}
                      </td>
                      <td className="py-3 px-6 text-slate-500">{trabajador.cargo}</td>
                      <td className="py-3 px-6 text-slate-500">{trabajador.condicionLaboral || 'NO ESPECIFICADA'}</td>
                      <td className="py-3 px-6 text-slate-500">
                        {trabajador.establecimiento?.microred?.nombre || 'NO ASIGNADA'}
                      </td>
                      <td className="py-3 px-6 text-slate-500">
                        {trabajador.establecimiento?.nombre || 'NO ASIGNADO'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

