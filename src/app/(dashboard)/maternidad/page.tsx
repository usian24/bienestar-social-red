"use client";

import { Eye, FileSpreadsheet, FileText, PlusCircle, Search } from "lucide-react";
import { useState, useEffect } from "react";

export default function MaternidadPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Datos para filtros dinámicos
  const [microredesDb, setMicroredesDb] = useState<any[]>([]);
  
  // Estado de los Filtros
  const [searchDni, setSearchDni] = useState('');
  const [ambito, setAmbito] = useState('Microred');
  const [microred, setMicrored] = useState('Todas');
  const [establecimiento, setEstablecimiento] = useState('--Todos--');
  const [condicionLaboral, setCondicionLaboral] = useState('--TODOS--');
  const [dia, setDia] = useState('Todos');
  const [mes, setMes] = useState('Todos');
  const [anio, setAnio] = useState('2026');

  // Cargar datos
  useEffect(() => {
    const fetchInicial = async () => {
      setLoading(true);
      try {
        const resFiltros = await fetch('/api/filtros');
        const dataFiltros = await resFiltros.json();
        setMicroredesDb(dataFiltros);
        // Aquí iría el fetch de maternidad en el futuro
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchInicial();
  }, []);

  const establecimientosActuales = microred === 'Todas' 
    ? [] 
    : microredesDb.find(m => m.nombre === microred)?.establecimientos || [];

  const handleMicroredChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMicrored(e.target.value);
    setEstablecimiento('--Todos--');
  };

  return (
    <>
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Licencias de Maternidad</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de descansos pre y post natal (98 días)</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input 
              type="text"
              placeholder="Buscar por DNI o Apellidos..."
              value={searchDni}
              onChange={(e) => setSearchDni(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-pink-500 shadow-sm"
            />
          </div>
          <button className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap">
            <PlusCircle className="w-4 h-4" />
            Nuevo CITT Maternidad
          </button>
        </div>
      </div>

      {/* Filtros Originales Restaurados y Conectados */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-6 p-5">
        <h2 className="text-[14px] font-semibold text-slate-600 uppercase tracking-wide mb-4">
          FILTROS DE BÚSQUEDA
        </h2>
        
        {/* Fila 1: Ámbito, Microred, Establecimiento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Ámbito</label>
            <select 
              value={ambito} 
              onChange={(e) => setAmbito(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-pink-500 focus:bg-white transition-colors"
            >
              <option value="Microred">Microred</option>
              <option value="Sede Administrativa">Sede Administrativa</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Microred</label>
            <select 
              value={microred} 
              onChange={handleMicroredChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-pink-500 focus:bg-white transition-colors"
            >
              <option value="Todas">-- Todas las Microredes --</option>
              {microredesDb.map(m => (
                <option key={m.id} value={m.nombre}>{m.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Establecimiento</label>
            <select 
              value={establecimiento} 
              onChange={(e) => setEstablecimiento(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-pink-500 focus:bg-white transition-colors disabled:opacity-50"
              disabled={microred === 'Todas'}
            >
              <option value="--Todos--">-- Todos los Establecimientos --</option>
              {establecimientosActuales.map((est: any) => (
                <option key={est.id} value={est.nombre}>{est.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila 2: Condición Laboral, Día, Mes, Año */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Condición Laboral</label>
            <select 
              value={condicionLaboral} 
              onChange={(e) => setCondicionLaboral(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-pink-500 focus:bg-white transition-colors"
            >
              <option value="--TODOS--">--TODOS--</option>
              <option value="NOMB">NOMBRADO 276</option>
              <option value="CAS">CAS 1057</option>
              <option value="LEY 30057">SERVIR LEY 30057</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">DÍA</label>
            <select 
              value={dia} 
              onChange={(e) => setDia(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-pink-500 focus:bg-white transition-colors"
            >
              <option value="Todos">Todos</option>
              {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">MES</label>
            <select 
              value={mes} 
              onChange={(e) => setMes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-pink-500 focus:bg-white transition-colors"
            >
              <option value="Todos">Todos</option>
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">AÑO</label>
            <select 
              value={anio} 
              onChange={(e) => setAnio(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-pink-500 focus:bg-white transition-colors"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#0f172a] text-white">
                <th className="py-3 px-4 font-semibold w-24">DNI</th>
                <th className="py-3 px-4 font-semibold">Trabajador</th>
                <th className="py-3 px-4 font-semibold">Establecimiento</th>
                <th className="py-3 px-3 font-semibold text-center text-pink-200">Total Días (98)</th>
                <th className="py-3 px-4 font-semibold text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-500">
                  No hay trabajadores con licencias de maternidad registradas aún.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
