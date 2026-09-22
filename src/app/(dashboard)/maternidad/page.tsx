"use client";

import { Eye, FileSpreadsheet, FileText, PlusCircle, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import NuevoCittModal from "@/shared/components/NuevoCittModal";
import DetallesTrabajadorModal from "@/shared/components/DetallesTrabajadorModal";

export default function MaternidadPage() {
  const { data: session } = useSession();
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado para el Modal de Detalles (Ojo)
  const [trabajadorDetalle, setTrabajadorDetalle] = useState<any | null>(null);

  // Datos para filtros dinámicos
  const isSuperAdmin = (session?.user as any)?.rol === 'SUPER_ADMIN';
  const userMicroredId = (session?.user as any)?.microredId;

  const [microredesDb, setMicroredesDb] = useState<any[]>([]);
  
  // Estado de los Filtros
  const [searchDni, setSearchDni] = useState('');
  const [ambito, setAmbito] = useState('Microred');
  const [microred, setMicrored] = useState('Todas');
  const [establecimiento, setEstablecimiento] = useState('--Todos--');
  const [condicionLaboral, setCondicionLaboral] = useState('--TODOS--');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Cargar datos de la tabla y filtros
  const fetchInicial = async () => {
    setLoading(true);
    try {
      // Cargar registros matemáticos
      const resSalud = await fetch('/api/maternidad');
      const dataSalud = await resSalud.json();
      if (Array.isArray(dataSalud)) {
        setRegistros(dataSalud);
      } else {
        console.error("API /api/maternidad devolvió error:", dataSalud);
        setRegistros([]);
      }

      // Cargar filtros dinámicos (Microredes y Establecimientos)
      const resFiltros = await fetch('/api/filtros');
      const dataFiltros = await resFiltros.json();
      if (Array.isArray(dataFiltros)) {
        setMicroredesDb(dataFiltros);
      } else {
        setMicroredesDb([]);
      }
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
    const matchCondicion = condicionLaboral === '--TODOS--' || r.condicionLaboral === condicionLaboral;
    
    // Filtrado por fecha (si tiene alguna licencia dentro del rango)
    let matchFechas = true;
    if (fechaDesde || fechaHasta) {
      if (r.licencias && r.licencias.length > 0) {
        matchFechas = r.licencias.some((lic: any) => {
          const licFecha = new Date(lic.fechaInicio);
          let cumpleDesde = true;
          let cumpleHasta = true;
          
          if (fechaDesde) {
            const desde = new Date(fechaDesde + 'T00:00:00');
            cumpleDesde = licFecha >= desde;
          }
          if (fechaHasta) {
            const hasta = new Date(fechaHasta + 'T23:59:59');
            cumpleHasta = licFecha <= hasta;
          }
          return cumpleDesde && cumpleHasta;
        });
      } else {
        matchFechas = false;
      }
    }

    return matchDni && matchMicrored && matchEstablecimiento && matchCondicion && matchFechas;
  });

  // Obtener establecimientos de la microred seleccionada (o la asignada si es admin)
  const establecimientosActuales = isSuperAdmin
    ? (microred === 'Todas' ? [] : microredesDb.find(m => m.nombre === microred)?.establecimientos || [])
    : (microredesDb.find(m => Number(m.id) === Number(userMicroredId))?.establecimientos || []);

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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Licencias de Maternidad</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gestión de descansos por maternidad (98 días)</p>
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
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-blue-500 shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            Nuevo CITT Maternidad
          </button>
        </div>
      </div>

      {/* Filtros Originales Restaurados y Conectados */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 rounded-lg shadow-sm mb-6 p-5">
        <h2 className="text-[14px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-4">
          FILTROS DE BÚSQUEDA
        </h2>
        
        {/* Fila 1: Ámbito, Microred, Establecimiento */}
        <div className={`grid gap-4 mb-4 ${isSuperAdmin ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>
          {isSuperAdmin && (
            <>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Ámbito</label>
                <select 
                  value={ambito} 
                  onChange={(e) => setAmbito(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-blue-500 focus:bg-white dark:bg-slate-800 transition-colors"
                >
                  <option value="Microred">Microred</option>
                  <option value="Sede Administrativa">Sede Administrativa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Microred</label>
                <select 
                  value={microred} 
                  onChange={handleMicroredChange}
                  disabled={ambito !== 'Microred'}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-blue-500 focus:bg-white dark:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <option value="Todas">-- Todas las Microredes --</option>
                  {microredesDb.map(m => (
                    <option key={m.id} value={m.nombre}>{m.nombre}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Establecimiento</label>
            <select 
              value={establecimiento} 
              onChange={(e) => setEstablecimiento(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-blue-500 focus:bg-white dark:bg-slate-800 transition-colors disabled:opacity-50"
              disabled={isSuperAdmin && microred === 'Todas'}
            >
              <option value="--Todos--">-- Todos los Establecimientos --</option>
              {establecimientosActuales.map((est: any) => (
                <option key={est.id} value={est.nombre}>{est.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fila 2: Condición Laboral y Rango de Fechas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Condición Laboral</label>
              <select 
                value={condicionLaboral} 
                onChange={(e) => setCondicionLaboral(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-blue-500 focus:bg-white dark:bg-slate-800 transition-colors"
              >
                <option value="--TODOS--">--TODOS--</option>
                {Array.from(new Set(registros.map(r => r.condicionLaboral || 'NO ESPECIFICADA'))).sort().map(cond => (
                  <option key={cond} value={cond}>{cond}</option>
                ))}
              </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Fecha Desde</label>
            <input 
              type="date"
              value={fechaDesde} 
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-blue-500 focus:bg-white dark:bg-slate-800 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Fecha Hasta</label>
            <input 
              type="date"
              value={fechaHasta} 
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-blue-500 focus:bg-white dark:bg-slate-800 transition-colors"
            />
          </div>
          <div className="flex justify-end h-full items-end pb-0.5">
            {isSuperAdmin && (
              <button 
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.append('microred', microred);
                  params.append('establecimiento', establecimiento);
                  params.append('condicionLaboral', condicionLaboral);
                  window.open(`/api/maternidad/excel-masivo?${params.toString()}`, '_blank');
                }}
                className="bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-colors w-full md:w-auto"
                title="Descargar Excel Masivo"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel Masivo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
          <table className="w-full text-left border-collapse text-[12px] bg-white dark:bg-slate-800">
              <thead>
                <tr className="bg-[#0f172a] text-white">
                  <th className="py-3 px-4 font-semibold text-center w-12 border-b border-slate-700/50">N°</th>
                  <th className="py-3 px-4 font-semibold border-b border-slate-700/50">Apellidos y Nombres</th>
                  <th className="py-3 px-4 font-semibold border-b border-slate-700/50">Cargo</th>
                  <th className="py-3 px-4 font-semibold border-b border-slate-700/50">Establecimiento</th>
                  <th className="py-3 px-4 font-semibold text-center w-24 border-b border-slate-700/50">DNI</th>
                  <th className="py-3 px-3 font-semibold text-center text-teal-200 border-b border-slate-700/50 leading-tight">Total<br/>Días (98)</th>
                  <th className="py-3 px-4 font-semibold text-center w-28 border-b border-slate-700/50">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600">
                      Conectando con la Base de Datos...
                    </td>
                  </tr>
                ) : registrosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600">
                      No hay trabajadores con licencias de maternidad registradas aún bajo estos filtros. ¡Ingresa un CITT!
                    </td>
                  </tr>
                ) : (
                  registrosFiltrados.map((item: any, i: number) => {
                    return (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="py-3 px-4 text-center font-medium text-slate-600 dark:text-slate-400">
                          {i + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100 uppercase">
                          {item.apellidosNombres}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-[11px] uppercase">
                          {item.cargo}
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          <div className="font-semibold text-slate-700 dark:text-slate-200 uppercase">{item.microred}</div>
                          <div className="text-slate-500 dark:text-slate-400 uppercase">{item.establecimiento}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-600 dark:text-slate-300">
                          {item.dni}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-teal-600 dark:text-teal-400">
                          {item.totalDias}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={() => setTrabajadorDetalle(item)}
                              className="p-1.5 rounded-sm bg-[#3eb6f0] hover:bg-sky-400 text-white shadow-sm transition-colors" 
                              title="Ver Expediente y CITTs"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {(session?.user as any)?.rol === "SUPER_ADMIN" && (
                              <>
                                <button 
                                  onClick={() => window.open(`/api/maternidad/excel/${item.id}`, '_blank')}
                                  className="px-2 py-1.5 rounded-sm text-white shadow-sm transition-colors bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 font-bold text-[10px] uppercase"
                                  title="Descargar Historial Excel"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5" />
                                  EXCEL
                                </button>
                                <button 
                                  onClick={() => window.open(`/maternidad/reporte/${item.id}`, '_blank')}
                                  className="px-2 py-1.5 rounded-sm text-white shadow-sm transition-colors bg-red-600 hover:bg-red-700 flex items-center gap-1 font-bold text-[10px] uppercase"
                                  title="Generar PDF"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  PDF
                                </button>
                              </>
                            )}
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
        tipoLicenciaRestriccion="MATERNIDAD"
        reporteUrl="/maternidad/reporte/"
      />

      {/* Modal para Crear CITT */}
      <NuevoCittModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchInicial(); // Refrescar la tabla
        }}
        tipoPorDefecto="MATERNIDAD"
      />
    </>
  );
}






