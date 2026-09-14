"use client";

import { Eye, FileSpreadsheet, FileText, PlusCircle, Search } from "lucide-react";
import { useState, useEffect } from "react";
import NuevoCittModal from "@/shared/components/NuevoCittModal";
import DetallesTrabajadorModal from "@/shared/components/DetallesTrabajadorModal";

export default function SaludPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado para el Modal de Detalles (Ojo)
  const [trabajadorDetalle, setTrabajadorDetalle] = useState<any | null>(null);

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

  // Cargar datos de la tabla y filtros
  const fetchInicial = async () => {
    setLoading(true);
    try {
      // Cargar registros matemáticos
      const resSalud = await fetch('/api/salud');
      const dataSalud = await resSalud.json();
      setRegistros(dataSalud);

      // Cargar filtros dinámicos (Microredes y Establecimientos)
      const resFiltros = await fetch('/api/filtros');
      const dataFiltros = await resFiltros.json();
      setMicroredesDb(dataFiltros);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInicial();
  }, []);

  // Filtrado de la tabla en tiempo real
  const registrosFiltrados = registros.filter(r => {
    const matchDni = r.dni.includes(searchDni) || r.apellidosNombres.toLowerCase().includes(searchDni.toLowerCase());
    const matchMicrored = microred === 'Todas' || r.microred === microred;
    const matchEstablecimiento = establecimiento === '--Todos--' || r.establecimiento === establecimiento;
    // Condición Laboral, Día, Mes, Año se aplicarán cuando la tabla de Licencias tenga esas fechas.
    return matchDni && matchMicrored && matchEstablecimiento;
  });

  // Obtener establecimientos de la microred seleccionada
  const establecimientosActuales = microred === 'Todas' 
    ? [] 
    : microredesDb.find(m => m.nombre === microred)?.establecimientos || [];

  // Cuando cambia la microred, resetear el establecimiento
  const handleMicroredChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMicrored(e.target.value);
    setEstablecimiento('--Todos--');
  };

  return (
    <>
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Salud (Enfermedad Común)</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión y cálculo de subsidios de 20 días</p>
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
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-blue-500 shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            Nuevo CITT
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
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-blue-500 focus:bg-white transition-colors"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-blue-500 focus:bg-white transition-colors"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-blue-500 focus:bg-white transition-colors disabled:opacity-50"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-blue-500 focus:bg-white transition-colors"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-blue-500 focus:bg-white transition-colors"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-blue-500 focus:bg-white transition-colors"
            >
              <option value="Todos">Todos</option>
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">AÑO</label>
            <select 
              value={anio} 
              onChange={(e) => setAnio(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-blue-500 focus:bg-white transition-colors"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla Matemática */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#0f172a] text-white">
                <th className="py-3 px-4 font-semibold w-24">DNI</th>
                <th className="py-3 px-4 font-semibold">Trabajador</th>
                <th className="py-3 px-4 font-semibold">Establecimiento</th>
                <th className="py-3 px-3 font-semibold text-center text-blue-200">Total Días</th>
                <th className="py-3 px-3 font-bold text-center text-emerald-400">Días Red (1-20)</th>
                <th className="py-3 px-3 font-bold text-center text-rose-400">Días EsSalud (21+)</th>
                <th className="py-3 px-4 font-semibold text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Conectando con la Base de Datos...
                  </td>
                </tr>
              ) : registrosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No hay trabajadores con licencias de salud registradas aún bajo estos filtros. ¡Ingresa un CITT!
                  </td>
                </tr>
              ) : (
                registrosFiltrados.map((item: any) => {
                  const isSubsidio = item.diasSubsidioEsSalud > 0;
                  return (
                    <tr 
                      key={item.id} 
                      className={isSubsidio ? 'bg-red-50 hover:bg-red-100 transition-colors' : 'bg-white hover:bg-slate-50 transition-colors'}
                    >
                      <td className="py-3 px-4 text-slate-600 font-medium">{item.dni}</td>
                      <td className="py-3 px-4 text-slate-800">
                        <div className="font-semibold">{item.apellidosNombres}</div>
                        <div className="text-[11px] text-slate-400">{item.cargo}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        <div className="font-medium text-slate-700">{item.microred}</div>
                        <div>{item.establecimiento}</div>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700 font-medium">{item.totalDias}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">{item.diasRed}</td>
                      <td className={`py-3 px-3 text-center font-bold ${isSubsidio ? 'text-red-600 text-lg' : 'text-slate-400'}`}>
                        {item.diasSubsidioEsSalud}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => setTrabajadorDetalle(item)}
                            className="p-1.5 rounded-md bg-[#3eb6f0] hover:bg-sky-400 text-white shadow-sm transition-colors" 
                            title="Ver Expediente y Licencias"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => window.open(`/salud/reporte/${item.id}`, '_blank')}
                            className="px-2.5 py-1.5 rounded-md text-white shadow-sm transition-colors bg-red-600 hover:bg-red-700 flex items-center gap-1.5 font-bold text-xs"
                            title="Generar Reporte PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Ver Historial, Editar y Eliminar CITTs */}
      <DetallesTrabajadorModal
        isOpen={!!trabajadorDetalle}
        onClose={() => setTrabajadorDetalle(null)}
        trabajadorInfoFijo={trabajadorDetalle}
        onRefreshParent={() => fetchInicial()}
      />

      {/* Modal para Crear CITT */}
      <NuevoCittModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchInicial(); // Refrescar la tabla
        }}
        tipoPorDefecto="ENFERMEDAD_COMUN"
      />
    </>
  );
}