'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Activity, FileCheck, Bell, CheckCircle2, CheckCircle, 
  Calendar, BookOpen, History, ExternalLink, ChevronLeft, ChevronRight, Eye, X 
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import TrabajadorDashboard from './TrabajadorDashboard';
import ChatbotAsistente from '@/shared/components/ChatbotAsistente';
import VideoGuiaCard from '@/shared/components/VideoGuiaCard';
import MLMiniCard from '@/shared/components/MLMiniCard';
import DetallesTrabajadorModal from '@/shared/components/DetallesTrabajadorModal';
import { formatCalendarDateDMY } from '@/core/licencias/calculoSubsidios';

export default function InicioPage() {
  const { data: session, status } = useSession();
  const rol = (session?.user as any)?.rol;
  const isSuperAdmin = rol === 'SUPER_ADMIN';
  const userMicroredNombre = (session?.user as any)?.microredNombre;
  const [kpis, setKpis] = useState({ totalTrabajadores: 0, licenciasActivas: 0, subsidiosPendientes: 0 });
  const [loadingKpis, setLoadingKpis] = useState(true);
  
  // Estado para alertas y paginación
  const [alertas, setAlertas] = useState<any[]>([]);
  const [loadingAlertas, setLoadingAlertas] = useState(true);
  const [paginaAlertas, setPaginaAlertas] = useState(1);
  const [filtroNivelAlerta, setFiltroNivelAlerta] = useState<'TODOS' | 'VENCIDO' | 'ROJO' | 'AMARILLO'>('TODOS');
  const ITEMS_POR_PAGINA = 10;

  // Estado para modal de canje rápido
  const [alertaSeleccionada, setAlertaSeleccionada] = useState<any>(null);
  const [nuevoCitt, setNuevoCitt] = useState('');
  const [guardandoCanje, setGuardandoCanje] = useState(false);
  const [esModoPerdido, setEsModoPerdido] = useState(false);

  // Estado para modal de expediente individual
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState<any | null>(null);

  const [changelog, setChangelog] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [resKpi, resAlertas] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/alertas')
      ]);
      
      if (resKpi.ok) setKpis(await resKpi.json());
      if (resAlertas.ok) setAlertas(await resAlertas.json());
    } catch (error) {
      console.error("Error loading data", error);
    } finally {
      setLoadingKpis(false);
      setLoadingAlertas(false);
    }
  };

  useEffect(() => {
    async function loadChangelog() {
      try {
        const res = await fetch('/changelog.json');
        if (res.ok) setChangelog(await res.json());
      } catch (e) {
        console.error(e);
      }
    }
    loadChangelog();
  }, []);

  useEffect(() => {
    let active = true;
    if (status === 'authenticated' && rol && rol !== 'TRABAJADOR') {
      (async () => {
        try {
          const [resKpi, resAlertas] = await Promise.all([
            fetch('/api/dashboard'),
            fetch('/api/alertas')
          ]);
          if (!active) return;
          if (resKpi.ok) setKpis(await resKpi.json());
          if (resAlertas.ok) setAlertas(await resAlertas.json());
        } catch (error) {
          console.error("Error loading data", error);
        } finally {
          if (active) {
            setLoadingKpis(false);
            setLoadingAlertas(false);
          }
        }
      })();
    }
    return () => { active = false; };
  }, [status, rol]);

  const handleVerExpediente = (alerta: any) => {
    const trabajador = alerta.trabajador || {};
    setExpedienteSeleccionado({
      id: trabajador.id || alerta.trabajadorId,
      dni: trabajador.dni || alerta.dni || '',
      apellidosNombres: trabajador.apellidos && trabajador.nombres
        ? `${trabajador.apellidos}, ${trabajador.nombres}`
        : (alerta.apellidosNombres || 'Servidor de Salud'),
      cargo: trabajador.cargo || 'Servidor de Salud',
      microred: trabajador.establecimiento?.microred?.nombre || alerta.microred || '',
      establecimiento: trabajador.establecimiento?.nombre || alerta.establecimiento || '',
      condicionLaboral: trabajador.condicionLaboral || ''
    });
  };

  // Filtrado de alertas según categoría activa
  const alertasFiltradas = alertas.filter(a => {
    if (filtroNivelAlerta === 'TODOS') return true;
    return a.nivelAlerta === filtroNivelAlerta;
  });

  const totalPaginas = Math.max(1, Math.ceil(alertasFiltradas.length / ITEMS_POR_PAGINA));
  const paginaActual = Math.min(paginaAlertas, totalPaginas);
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const alertasPaginadas = alertasFiltradas.slice(indiceInicio, indiceInicio + ITEMS_POR_PAGINA);

  const handleCanjeRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertaSeleccionada) return;
    
    setGuardandoCanje(true);
    try {
      const payload = {
        origen: esModoPerdido ? 'PARTICULAR_PERDIDO' : 'ESSALUD_CITT',
        numeroCertificado: esModoPerdido ? alertaSeleccionada.numeroCertificado : (nuevoCitt || alertaSeleccionada.numeroCertificado),
        fechaInicio: alertaSeleccionada.fechaInicio,
        fechaFin: alertaSeleccionada.fechaFin,
        diasOtorgados: alertaSeleccionada.diasOtorgados,
        anioEjercicio: alertaSeleccionada.anioEjercicio,
        mesEjercicio: alertaSeleccionada.mesEjercicio
      };

      const res = await fetch(`/api/licencias/${alertaSeleccionada.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setAlertas(prev => prev.filter(a => a.id !== alertaSeleccionada.id));
        setAlertaSeleccionada(null);
        setNuevoCitt('');
      } else {
        alert('Hubo un error al guardar el canje');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGuardandoCanje(false);
    }
  };

  if (rol === 'TRABAJADOR') {
    return <TrabajadorDashboard />;
  }

  return (
    <div className="space-y-6">
      {/* Tarjetas de Resumen Rápido (KPIs) - 3 en una fila en celular compactas, espaciosas en desktop */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
        {/* 1. Total Trabajadores */}
        <div className="bg-white p-2.5 sm:p-4 md:p-5 rounded-xl shadow-xs border border-slate-200 hover:border-blue-300 transition-colors flex flex-col justify-between sm:flex-row sm:items-center gap-1.5 sm:gap-3.5 overflow-hidden min-w-0">
          <div className="w-7 h-7 sm:w-10 sm:h-10 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-400 text-[9px] sm:text-[11px] uppercase font-bold tracking-tight truncate">
              <span className="sm:hidden">Personal</span>
              <span className="hidden sm:inline">Total Trabajadores Registrados</span>
            </p>
            <h3 className="text-sm sm:text-xl md:text-2xl font-bold text-slate-800">
              {loadingKpis ? '...' : kpis.totalTrabajadores.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* 2. Licencias Activas */}
        <div className="bg-white p-2.5 sm:p-4 md:p-5 rounded-xl shadow-xs border border-slate-200 hover:border-emerald-300 transition-colors flex flex-col justify-between sm:flex-row sm:items-center gap-1.5 sm:gap-3.5 overflow-hidden min-w-0">
          <div className="w-7 h-7 sm:w-10 sm:h-10 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <Activity className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-400 text-[9px] sm:text-[11px] uppercase font-bold tracking-tight truncate">
              <span className="sm:hidden">Lic. Activas</span>
              <span className="hidden sm:inline">Licencias Activas Totales</span>
            </p>
            <h3 className="text-sm sm:text-xl md:text-2xl font-bold text-slate-800">
              {loadingKpis ? '...' : kpis.licenciasActivas.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* 3. Subsidios Pendientes */}
        <div className="bg-white p-2.5 sm:p-4 md:p-5 rounded-xl shadow-xs border border-slate-200 hover:border-purple-300 transition-colors flex flex-col justify-between sm:flex-row sm:items-center gap-1.5 sm:gap-3.5 overflow-hidden min-w-0">
          <div className="w-7 h-7 sm:w-10 sm:h-10 bg-purple-50 text-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <FileCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-400 text-[9px] sm:text-[11px] uppercase font-bold tracking-tight truncate">
              <span className="sm:hidden">Subsidios</span>
              <span className="hidden sm:inline">Subsidios Pendientes EsSalud</span>
            </p>
            <h3 className="text-sm sm:text-xl md:text-2xl font-bold text-slate-800">
              {loadingKpis ? '...' : kpis.subsidiosPendientes.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* Resumen Ejecutivo de Machine Learning & Modelos Predictivos */}
      <MLMiniCard />

      {/* Layout de Contenido: Semáforo (Izquierda) + Manual y Changelog (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        
        {/* COLUMNA IZQUIERDA (2/3) - Semáforo */}
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" /> Semáforo de Canjes Particulares
                </h2>
                {!isSuperAdmin && userMicroredNombre && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 shadow-xs flex items-center gap-1">
                    {userMicroredNombre}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Plazo límite de 30 días para canjear certificados particulares ante EsSalud {!isSuperAdmin && userMicroredNombre ? `(${userMicroredNombre})` : 'en toda la Red'}
              </p>
            </div>

            {/* Filtros de Nivel y Controles <> Rápidos */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => { setFiltroNivelAlerta('TODOS'); setPaginaAlertas(1); }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer border ${
                    filtroNivelAlerta === 'TODOS'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Todos ({alertas.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setFiltroNivelAlerta('VENCIDO'); setPaginaAlertas(1); }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer border ${
                    filtroNivelAlerta === 'VENCIDO'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {alertas.filter(a => a.nivelAlerta === 'VENCIDO').length} Vencidos
                </button>
                <button
                  type="button"
                  onClick={() => { setFiltroNivelAlerta('ROJO'); setPaginaAlertas(1); }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer border ${
                    filtroNivelAlerta === 'ROJO'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {alertas.filter(a => a.nivelAlerta === 'ROJO').length} Críticos
                </button>
                <button
                  type="button"
                  onClick={() => { setFiltroNivelAlerta('AMARILLO'); setPaginaAlertas(1); }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer border ${
                    filtroNivelAlerta === 'AMARILLO'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  {alertas.filter(a => a.nivelAlerta === 'AMARILLO').length} En Riesgo
                </button>
              </div>

              {/* Botones de Navegación Rápida <> */}
              {totalPaginas > 1 && (
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setPaginaAlertas(Math.max(1, paginaActual - 1))}
                    disabled={paginaActual === 1}
                    className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono font-bold px-1.5 text-slate-800">
                    {paginaActual} / {totalPaginas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPaginaAlertas(Math.min(totalPaginas, paginaActual + 1))}
                    disabled={paginaActual >= totalPaginas}
                    className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    title="Página siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            {loadingAlertas ? (
              <div className="bg-white p-8 text-center rounded-lg shadow-sm border border-slate-200 text-slate-400">
                Cargando semáforo...
              </div>
            ) : alertasFiltradas.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center flex flex-col items-center">
                <CheckCircle className="w-10 h-10 text-emerald-500 mb-3" />
                <p className="text-slate-700 font-semibold text-sm">
                  Sin certificados en este estado {!isSuperAdmin && userMicroredNombre ? `en la ${userMicroredNombre}` : ''}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Los descansos médicos particulares de esta jurisdicción están al día y dentro del plazo de 30 días reglamentarios.
                </p>
              </div>
            ) : (
              alertasPaginadas.map((alerta) => (
                <div 
                  key={alerta.id} 
                  className={`bg-white rounded-lg p-4 sm:p-5 border-l-4 shadow-xs border border-slate-200/80 hover:border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    alerta.nivelAlerta === 'VENCIDO' 
                      ? 'border-l-slate-600' 
                      : alerta.nivelAlerta === 'ROJO' 
                      ? 'border-l-rose-500' 
                      : 'border-l-amber-500'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0 font-bold ${
                      alerta.nivelAlerta === 'VENCIDO' 
                        ? 'bg-slate-100 text-slate-700' 
                        : alerta.nivelAlerta === 'ROJO' 
                        ? 'bg-rose-50 text-rose-600' 
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      <span className="text-base leading-none font-extrabold">{alerta.diasTranscurridos}</span>
                      <span className="text-[8px] uppercase tracking-wider font-semibold">Días</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        {alerta.trabajador?.apellidos || ''}, {alerta.trabajador?.nombres || ''}
                      </h4>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {alerta.trabajador?.establecimiento?.nombre || 'Establecimiento'}
                        {alerta.trabajador?.establecimiento?.microred?.nombre && (
                          <span className="text-slate-400"> · {alerta.trabajador.establecimiento.microred.nombre}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {alerta.fechaInicio && alerta.fechaFin && (
                          <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>
                              {formatCalendarDateDMY(alerta.fechaInicio) === formatCalendarDateDMY(alerta.fechaFin)
                                ? formatCalendarDateDMY(alerta.fechaInicio)
                                : `${formatCalendarDateDMY(alerta.fechaInicio)} – ${formatCalendarDateDMY(alerta.fechaFin)}`}
                            </span>
                            {alerta.diasOtorgados ? (
                              <span className="text-slate-500 font-semibold">· {alerta.diasOtorgados}d</span>
                            ) : null}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-mono font-semibold">
                          {alerta.numeroCertificado || 'Certificado S/N'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Reg: {new Date(alerta.creadoEn).toLocaleDateString('es-PE')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col gap-2 shrink-0 items-end md:items-stretch">
                    {alerta.nivelAlerta === 'VENCIDO' ? (
                      <button 
                        onClick={() => { setAlertaSeleccionada(alerta); setEsModoPerdido(true); setNuevoCitt(''); }}
                        className="text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 px-4 py-2 rounded-md transition-colors text-center flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                      >
                        Marcar Perdido
                      </button>
                    ) : (
                      <button 
                        onClick={() => { setAlertaSeleccionada(alerta); setEsModoPerdido(false); setNuevoCitt(''); }}
                        className="text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-4 py-2 rounded-md transition-colors text-center flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Finalizar Canje
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleVerExpediente(alerta)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50/80 px-2.5 py-1 rounded transition-colors text-center flex items-center justify-center gap-1.5 cursor-pointer border border-transparent hover:border-blue-200"
                      title="Ver expediente e historial médico completo"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver Expediente
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Paginación Inferior tipo Apple con botones < y > */}
          {alertasFiltradas.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-xs text-slate-600">
              <div>
                Mostrando <strong className="text-slate-900">{indiceInicio + 1}</strong> a{' '}
                <strong className="text-slate-900">
                  {Math.min(indiceInicio + ITEMS_POR_PAGINA, alertasFiltradas.length)}
                </strong>{' '}
                de <strong className="text-slate-900">{alertasFiltradas.length}</strong> certificados
                {filtroNivelAlerta !== 'TODOS' && ` (${filtroNivelAlerta})`}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaginaAlertas(p => Math.max(1, p - 1))}
                  disabled={paginaAlertas === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPaginas || Math.abs(p - paginaAlertas) <= 1)
                    .reduce((acc: (number | string)[], p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                        acc.push('...');
                      }
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((page, idx) =>
                      page === '...' ? (
                        <span key={`dots-${idx}`} className="px-1.5 text-slate-400">...</span>
                      ) : (
                        <button
                          key={`page-${page}`}
                          type="button"
                          onClick={() => setPaginaAlertas(Number(page))}
                          className={`min-w-[28px] h-7 px-1.5 rounded-md font-mono text-xs font-semibold transition cursor-pointer ${
                            paginaAlertas === page
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                </div>

                <button
                  type="button"
                  onClick={() => setPaginaAlertas(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAlertas >= totalPaginas}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                  title="Página siguiente"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA (1/3) - Asistente IA, Manual y Changelog */}
        <div className="space-y-6">
          {/* Asistente Virtual BienestarBot */}
          <ChatbotAsistente modo="tarjeta" />

          {/* Video Guía / Tutorial Oficial del Sistema */}
          <VideoGuiaCard />

          {/* Historial de Cambios */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-500" /> Historial de Cambios
              </h3>
            </div>
            <div className="p-5 space-y-6 max-h-[400px] overflow-y-auto">
              {changelog.length === 0 ? (
                <div className="text-slate-400 text-sm text-center">No hay actualizaciones.</div>
              ) : (
                changelog.map((log) => (
                  <div key={log.version} className="relative pl-4 border-l-2 border-slate-200">
                    <div className="absolute w-2.5 h-2.5 bg-blue-500 rounded-full -left-[6px] top-1.5 ring-4 ring-white"></div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">{log.fecha}</span>
                    <h4 className="font-bold text-slate-800 text-sm mt-1 mb-1">{log.titulo}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed mb-2">{log.descripcion}</p>
                    {log.imagen && (
                      <div className="mt-2 rounded overflow-hidden border border-slate-200">
                        <img src={log.imagen} alt={log.titulo} className="w-full h-auto object-cover" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Canje Rápido */}
      {alertaSeleccionada && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Finalizar Canje
              </h3>
              <button onClick={() => setAlertaSeleccionada(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCanjeRapido} className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                {esModoPerdido 
                  ? <>Vas a marcar el certificado de <strong>{alertaSeleccionada.trabajador.nombres} {alertaSeleccionada.trabajador.apellidos}</strong> como <strong>PERDIDO</strong>. Esto sacará la alerta de tu sistema y EsSalud no reembolsará estos días.</>
                  : <>Vas a marcar el certificado particular de <strong>{alertaSeleccionada.trabajador.nombres} {alertaSeleccionada.trabajador.apellidos}</strong> como oficializado en EsSalud.</>}
              </p>
              
              {!esModoPerdido && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nuevo N° de CITT (Opcional)</label>
                  <input 
                    type="text" 
                    value={nuevoCitt}
                    onChange={e => setNuevoCitt(e.target.value)}
                    placeholder="Ej. DAAWD123456"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Si lo dejas en blanco, se conservará el número actual.</p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setAlertaSeleccionada(null)} className="flex-1 bg-slate-100 text-slate-600 font-medium py-2 rounded-md hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={guardandoCanje} className={`flex-1 text-white font-medium py-2 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${esModoPerdido ? 'bg-slate-800 hover:bg-slate-900' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                  {guardandoCanje ? 'Guardando...' : (esModoPerdido ? 'Sí, Dar por Perdido' : 'Confirmar Canje')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Expediente Completo del Servidor */}
      {expedienteSeleccionado && (
        <DetallesTrabajadorModal
          isOpen={!!expedienteSeleccionado}
          onClose={() => setExpedienteSeleccionado(null)}
          trabajadorInfoFijo={expedienteSeleccionado}
          onRefreshParent={loadData}
          reporteUrl="/salud/reporte/"
        />
      )}
    </div>
  );
}

