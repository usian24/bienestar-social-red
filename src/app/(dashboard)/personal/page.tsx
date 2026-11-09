"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PersonalPage() {
  const [busqueda, setBusqueda] = useState('');
  const [condicion, setCondicion] = useState('');
  const [condicionesDisponibles, setCondicionesDisponibles] = useState<string[]>([]);
  const [resultados, setResultados] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [buscando, setBuscando] = useState(true);
  
  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchTrabajadores = useCallback(async () => {
    setBuscando(true);
    try {
      const qParams = new URLSearchParams({
        q: busqueda,
        condicion: condicion,
        page: page.toString(),
        limit: limit.toString()
      });
      const res = await fetch(`/api/trabajadores/buscar?${qParams.toString()}`);
      const data = await res.json();
      setResultados(data.trabajadores || []);
      setTotal(data.total || 0);
      if (Array.isArray(data.condiciones)) {
        setCondicionesDisponibles(data.condiciones);
      }
    } catch (error) {
      console.error("Error buscando", error);
    } finally {
      setBuscando(false);
    }
  }, [busqueda, condicion, page, limit]);

  // Cada vez que cambia algo, traer data con un pequeño retraso si están escribiendo
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchTrabajadores();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchTrabajadores]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Encabezado y Buscador Principal */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Directorio de Personal</h1>
        <p className="text-slate-500 mb-6 text-sm">
          Busca a cualquier trabajador por DNI o Nombres para ver su historial completo o registrar a un nuevo trabajador en el sistema.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Ingresa DNI o Apellidos..." 
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-300 rounded-md pl-10 pr-4 py-2 text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="w-full sm:w-64">
            <select
              value={condicion}
              onChange={(e) => { setCondicion(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-300 rounded-md px-4 py-2 text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm"
            >
              <option value="">Todas las Condiciones</option>
              {condicionesDisponibles.map((c) => (
                <option key={c} value={c}>
                  {c === 'NOMBRADO' ? 'Nombrados (D.L. 276)' : c === 'CAS' ? 'CAS (D.L. 1057)' : c}
                </option>
              ))}
            </select>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium shadow-sm transition-colors flex items-center justify-center gap-2">
            <Search className="w-4 h-4" />
            Buscar
          </button>
          <button className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-2 rounded-md font-medium shadow-sm transition-colors flex items-center justify-center gap-2">
            <UserPlus className="w-4 h-4" />
            Nuevo Ingreso
          </button>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            {busqueda.length > 0 ? `Resultados de búsqueda (${total})` : `Listado de Personal (${total})`}
          </h2>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Mostrar:</span>
            <select 
              value={limit} 
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        
        {buscando ? (
          <div className="p-8 text-center text-slate-500">Cargando base de datos...</div>
        ) : resultados.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No se encontraron trabajadores.</div>
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
                    <td className="py-3 px-6 text-slate-600 font-medium">{trabajador.dni}</td>
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

        {/* Paginación */}
        {total > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="text-sm text-slate-500">
              Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, total)} de {total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
