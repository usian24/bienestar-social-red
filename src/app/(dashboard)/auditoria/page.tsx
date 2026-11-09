'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Shield, 
  Activity, 
  Clock, 
  User, 
  FileText, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Server, 
  Database, 
  Cpu, 
  Zap, 
  Search, 
  RefreshCw, 
  Trash2, 
  Filter, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  Terminal, 
  Bot, 
  HeartPulse, 
  HardDrive,
  X 
} from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function AuditoriaPage() {
  const { data: session } = useSession();
  const esSuperAdmin = (session?.user as any)?.rol === 'SUPER_ADMIN';

  const [pestañaActiva, setPestañaActiva] = useState<'errores' | 'auditoria' | 'salud'>('errores');
  const [registros, setRegistros] = useState<any[]>([]);
  const [saludData, setSaludData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSalud, setLoadingSalud] = useState(false);

  // Filtros
  const [filtroModulo, setFiltroModulo] = useState('TODOS');
  const [filtroNivel, setFiltroNivel] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [errorExpandidoId, setErrorExpandidoId] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [ejecutandoPrueba, setEjecutandoPrueba] = useState(false);
  const [mensajeFeedback, setMensajeFeedback] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/auditoria?limite=200';
      if (pestañaActiva === 'errores') {
        url += '&tipo=ERRORES';
      } else if (pestañaActiva === 'auditoria') {
        url += '&tipo=AUDITORIA';
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRegistros(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error cargando logs:', e);
    } finally {
      setLoading(false);
    }
  }, [pestañaActiva]);

  const cargarSalud = useCallback(async () => {
    setLoadingSalud(true);
    try {
      const res = await fetch('/api/sistema/salud');
      if (res.ok) {
        const data = await res.json();
        setSaludData(data);
      }
    } catch (e) {
      console.error('Error cargando métricas de salud:', e);
    } finally {
      setLoadingSalud(false);
    }
  }, []);

  // Cargar datos al montar
  useEffect(() => {
    if (!esSuperAdmin) return;
    let active = true;
    let url = '/api/auditoria?limite=200';
    if (pestañaActiva === 'errores') {
      url += '&tipo=ERRORES';
    } else if (pestañaActiva === 'auditoria') {
      url += '&tipo=AUDITORIA';
    }

    Promise.all([fetch(url), fetch('/api/sistema/salud')])
      .then(async ([resLogs, resSalud]) => {
        if (!active) return;
        if (resLogs.ok) {
          const data = await resLogs.json();
          if (active) setRegistros(Array.isArray(data) ? data : []);
        }
        if (resSalud.ok) {
          const salud = await resSalud.json();
          if (active) setSaludData(salud);
        }
      })
      .catch((e) => console.error('Error cargando logs/salud:', e))
      .finally(() => {
        if (active) {
          setLoading(false);
          setLoadingSalud(false);
        }
      });

    return () => { active = false; };
  }, [esSuperAdmin, pestañaActiva]);

  const ejecutarPruebaError = async () => {
    setEjecutandoPrueba(true);
    setMensajeFeedback(null);
    try {
      const res = await fetch('/api/sistema/salud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'ERROR_TEST' })
      });
      const data = await res.json();
      if (res.ok) {
        setMensajeFeedback('Evento de error simulado registrado exitosamente. Comprueba la bitácora abajo.');
        await cargarDatos();
        await cargarSalud();
      } else {
        setMensajeFeedback('Error al ejecutar prueba: ' + data.error);
      }
    } catch (err: any) {
      setMensajeFeedback('Error de conexión: ' + err.message);
    } finally {
      setEjecutandoPrueba(false);
      setTimeout(() => setMensajeFeedback(null), 5000);
    }
  };

  const purgarLogs = async () => {
    if (!confirm('¿Deseas purgar los registros de errores y advertencias de prueba? Las auditorías de negocio se conservarán.')) {
      return;
    }
    try {
      const res = await fetch('/api/auditoria?soloErrores=true', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMensajeFeedback(`Se eliminaron ${data.eliminados} registros de la bitácora.`);
        await cargarDatos();
        await cargarSalud();
      }
    } catch (err: any) {
      alert('Error purgando logs: ' + err.message);
    }
  };

  const copiarStack = (id: string, texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2500);
  };

  // Filtrado reactivo en memoria
  const registrosFiltrados = useMemo(() => {
    return registros.filter(reg => {
      // Filtro por módulo
      if (filtroModulo !== 'TODOS' && reg.modulo !== filtroModulo) {
        return false;
      }

      // Filtro por nivel (para pestaña de errores)
      if (filtroNivel !== 'TODOS') {
        const accionStr = String(reg.accion || '').toUpperCase();
        if (filtroNivel === 'CRITICO' && !accionStr.startsWith('CRITICO')) return false;
        if (filtroNivel === 'ERROR' && !accionStr.startsWith('ERROR')) return false;
        if (filtroNivel === 'ADVERTENCIA' && !accionStr.startsWith('ADVERTENCIA')) return false;
      }

      // Filtro por búsqueda
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const matchesAccion = (reg.accion || '').toLowerCase().includes(q);
        const matchesModulo = (reg.modulo || '').toLowerCase().includes(q);
        const matchesDetalles = (reg.detalles || '').toLowerCase().includes(q);
        const matchesUsuario = (reg.usuario?.nombres || '').toLowerCase().includes(q) || (reg.usuario?.dni || '').includes(q);
        return matchesAccion || matchesModulo || matchesDetalles || matchesUsuario;
      }

      return true;
    });
  }, [registros, filtroModulo, filtroNivel, busqueda]);

  // Si no es Super Admin
  if (!esSuperAdmin) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center text-slate-500 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-md">
          <Shield className="w-12 h-12 mx-auto mb-4 text-rose-500" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Acceso Restringido</h2>
          <p className="text-sm mt-2 text-slate-500">Solo el Súper Administrador tiene credenciales para auditar eventos y fallas del sistema.</p>
        </div>
      </div>
    );
  }

  // Parseador seguro de detalles
  const parsearDetalles = (detallesStr: string) => {
    try {
      return JSON.parse(detallesStr);
    } catch {
      return { mensaje: detallesStr };
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto font-sans space-y-6">
      
      {/* CABECERA PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2 border border-blue-200/60 dark:border-blue-900">
            <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Centro de Observabilidad
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Logs, Diagnóstico y Salud del Sistema
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
            Detección activa de errores, trazabilidad de excepciones, salud de la base de datos y auditoría de cambios.
          </p>
        </div>

        {/* Acciones Globales */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={ejecutarPruebaError}
            disabled={ejecutandoPrueba}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            title="Genera un error simulado para comprobar que el sistema lo atrapa y lo muestra de inmediato"
          >
            <Zap className="w-4 h-4" />
            <span>{ejecutandoPrueba ? 'Probando...' : 'Simular Error'}</span>
          </button>

          <button
            onClick={() => { cargarDatos(); cargarSalud(); }}
            disabled={loading || loadingSalud}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            title="Recargar logs y métricas"
          >
            <RefreshCw className={`w-4 h-4 ${loading || loadingSalud ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={purgarLogs}
            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Purgar errores antiguos"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MENSAJE DE FEEDBACK TEMPORAL */}
      {mensajeFeedback && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs font-medium flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <span>{mensajeFeedback}</span>
          <button onClick={() => setMensajeFeedback(null)} className="text-slate-400 hover:text-white p-1 ml-4 rounded hover:bg-slate-800 transition cursor-pointer" title="Cerrar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TARJETAS KPI DE TELEMETRÍA EN VIVO */}
      {saludData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Tarjeta 1: PostgreSQL */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${saludData.baseDatos.estado === 'ONLINE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-700'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">PostgreSQL</div>
              <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${saludData.baseDatos.estado === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {saludData.baseDatos.estado}
                <span className="text-[11px] font-mono text-slate-400">({saludData.baseDatos.latenciaMs}ms)</span>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Errores en 24 Horas */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${saludData.estadisticas24h.errores > 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fallas (24h)</div>
              <div className="text-sm font-bold text-slate-800 dark:text-white">
                {saludData.estadisticas24h.errores} {saludData.estadisticas24h.errores === 1 ? 'Error' : 'Errores'}
                {saludData.estadisticas24h.advertencias > 0 && (
                  <span className="text-[11px] text-amber-500 ml-1.5 font-normal">({saludData.estadisticas24h.advertencias} adv.)</span>
                )}
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Asistente IA */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">BienestarBot IA</div>
              <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {saludData.inteligenciaArtificial.estado}
              </div>
            </div>
          </div>

          {/* Tarjeta 4: Memoria RAM Servidor */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Memoria RAM</div>
              <div className="text-sm font-bold text-slate-800 dark:text-white font-mono">
                {saludData.servidor.memoria.heapUsadoMB} MB
                <span className="text-[11px] text-slate-400 font-sans ml-1">({saludData.servidor.memoria.porcentajeUso}%)</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* PESTAÑAS PRINCIPALES */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2">
        <button
          onClick={() => setPestañaActiva('errores')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            pestañaActiva === 'errores'
              ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Bitácora de Errores y Fallas</span>
          {saludData?.estadisticas24h?.errores > 0 && (
            <span className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[10px] px-1.5 py-0.5 rounded-full font-black">
              {saludData.estadisticas24h.errores}
            </span>
          )}
        </button>

        <button
          onClick={() => setPestañaActiva('auditoria')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            pestañaActiva === 'auditoria'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Auditoría de Acciones de Negocio</span>
        </button>

        <button
          onClick={() => setPestañaActiva('salud')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            pestañaActiva === 'salud'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>Monitor de Salud y Telemetría</span>
        </button>
      </div>

      {/* PESTAÑA 1 & 2: LISTADO DE LOGS (ERRORES O AUDITORIA) */}
      {(pestañaActiva === 'errores' || pestañaActiva === 'auditoria') && (
        <div className="space-y-4">
          
          {/* BARRA DE FILTROS Y BÚSQUEDA */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por mensaje, endpoint, módulo o DNI..."
                className="w-full bg-transparent text-sm focus:outline-none dark:text-white placeholder:text-slate-400"
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer" title="Limpiar búsqueda">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro por Módulo */}
              <select
                value={filtroModulo}
                onChange={(e) => setFiltroModulo(e.target.value)}
                className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 focus:outline-none dark:text-white cursor-pointer"
              >
                <option value="TODOS">Todos los Módulos</option>
                <option value="CHATBOT">Chatbot / IA</option>
                <option value="EXCEL_IMPORT">Excel Masivo</option>
                <option value="LICENCIAS">Licencias / CITT</option>
                <option value="USUARIOS">Usuarios</option>
                <option value="AUTH">Seguridad / Auth</option>
                <option value="BD">Base de Datos</option>
                <option value="SISTEMA">Sistema / Health</option>
              </select>

              {/* Filtro por Nivel (Solo para pestaña de errores) */}
              {pestañaActiva === 'errores' && (
                <select
                  value={filtroNivel}
                  onChange={(e) => setFiltroNivel(e.target.value)}
                  className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 focus:outline-none dark:text-white cursor-pointer"
                >
                  <option value="TODOS">Todos los Niveles</option>
                  <option value="CRITICO">Crítico</option>
                  <option value="ERROR">Error</option>
                  <option value="ADVERTENCIA">Advertencia</option>
                </select>
              )}
            </div>
          </div>

          {/* LISTADO DE EVENTOS */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span>Cargando eventos de telemetría...</span>
              </div>
            ) : registrosFiltrados.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                {pestañaActiva === 'errores' ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-80" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">¡Excelente! No hay errores registrados.</p>
                    <p className="text-xs text-slate-400">Todos los servicios y endpoints están operando con normalidad.</p>
                  </div>
                ) : (
                  <p>No se encontraron registros de auditoría con los filtros actuales.</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {registrosFiltrados.map((reg) => {
                  const detalles = parsearDetalles(reg.detalles);
                  const esError = reg.accion.startsWith('ERROR') || reg.accion.startsWith('CRITICO') || detalles.nivel === 'ERROR';
                  const esCritico = reg.accion.startsWith('CRITICO') || detalles.nivel === 'CRITICO';
                  const esAdv = reg.accion.startsWith('ADVERTENCIA') || detalles.nivel === 'ADVERTENCIA';
                  const expandido = errorExpandidoId === reg.id;

                  return (
                    <div key={reg.id} className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        
                        {/* Insignia y Datos Principales */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Badge de Nivel */}
                          <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase border shrink-0 mt-0.5 ${
                            esCritico 
                              ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                              : esError
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : esAdv
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          }`}>
                            {reg.accion.replace(/_/g, ' ')}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                                {reg.modulo}
                              </span>

                              {detalles.ruta && (
                                <span className="text-xs font-mono text-slate-500 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                                  {detalles.ruta}
                                </span>
                              )}

                              <span className="text-xs text-slate-500 font-medium">
                                por {reg.usuario ? `${reg.usuario.nombres} ${reg.usuario.apellidos}` : 'Servidor / Sistema'}
                              </span>
                            </div>

                            {/* Mensaje Principal del Log */}
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1 break-words">
                              {detalles.mensaje || detalles.mensajeError || reg.detalles}
                            </p>

                            {/* Metadatos Rápidos */}
                            {detalles.datos && (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {Object.entries(detalles.datos).map(([k, v]) => (
                                  <span key={k} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-300">
                                    <span className="font-semibold text-slate-400">{k}:</span>
                                    <span>{String(v)}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Fecha y Botón Expandir */}
                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                          <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(reg.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            <span className="text-[10px] text-slate-400">({new Date(reg.fecha).toLocaleDateString()})</span>
                          </span>

                          {(detalles.stack || detalles.mensajeError || Object.keys(detalles).length > 2) && (
                            <button
                              onClick={() => setErrorExpandidoId(expandido ? null : reg.id)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                              title="Ver detalles técnicos y traza"
                            >
                              {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* DETALLE TÉCNICO EXPANDIBLE (STACK TRACE / PAYLOAD COMPLETO) */}
                      {expandido && (
                        <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                              <Terminal className="w-3.5 h-3.5 text-blue-500" /> Traza de Error y Contexto Técnico
                            </span>
                            <button
                              onClick={() => copiarStack(reg.id, JSON.stringify(detalles, null, 2))}
                              className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-semibold"
                            >
                              {copiadoId === reg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiadoId === reg.id ? '¡Copiado!' : 'Copiar Diagnóstico'}</span>
                            </button>
                          </div>

                          <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-60 overflow-y-auto">
                            {detalles.stack ? (
                              <pre className="whitespace-pre-wrap">{detalles.stack}</pre>
                            ) : (
                              <pre className="whitespace-pre-wrap">{JSON.stringify(detalles, null, 2)}</pre>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: MONITOR DE SALUD Y TELEMETRÍA DEL SISTEMA */}
      {pestañaActiva === 'salud' && (
        <div className="space-y-6">
          {loadingSalud ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span>Diagnosticando servicios del sistema...</span>
            </div>
          ) : saludData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Tarjeta: Motor de Base de Datos PostgreSQL */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-xl">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">Base de Datos PostgreSQL</h3>
                      <p className="text-xs text-slate-400">Esquema: {saludData.baseDatos.esquema} • Motor: {saludData.baseDatos.motor}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {saludData.baseDatos.estado}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] text-slate-400 font-semibold">Latencia Ping</div>
                    <div className="text-lg font-mono font-bold text-slate-800 dark:text-white mt-0.5">{saludData.baseDatos.latenciaMs} ms</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] text-slate-400 font-semibold">Total Licencias</div>
                    <div className="text-lg font-mono font-bold text-slate-800 dark:text-white mt-0.5">{saludData.volumenDatos.licencias}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] text-slate-400 font-semibold">Trabajadores en BD</div>
                    <div className="text-lg font-mono font-bold text-slate-800 dark:text-white mt-0.5">{saludData.volumenDatos.trabajadores}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[11px] text-slate-400 font-semibold">Usuarios Registrados</div>
                    <div className="text-lg font-mono font-bold text-slate-800 dark:text-white mt-0.5">{saludData.volumenDatos.usuarios}</div>
                  </div>
                </div>
              </div>

              {/* Tarjeta: Proceso Servidor & Memoria */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded-xl">
                      <Server className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">Servidor Node.js / Next.js</h3>
                      <p className="text-xs text-slate-400">Versión: {saludData.servidor.nodeVersion} • SO: {saludData.servidor.plataforma}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
                    {saludData.servidor.entorno}
                  </span>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Uso de Heap de Memoria:</span>
                    <span className="font-mono text-slate-800 dark:text-white">
                      {saludData.servidor.memoria.heapUsadoMB} MB / {saludData.servidor.memoria.heapTotalMB} MB ({saludData.servidor.memoria.porcentajeUso}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        saludData.servidor.memoria.porcentajeUso > 80 ? 'bg-rose-500' : 'bg-purple-600'
                      }`}
                      style={{ width: `${Math.min(100, saludData.servidor.memoria.porcentajeUso)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>Memoria RSS Total: {saludData.servidor.memoria.rssMB} MB</span>
                    <span>Uptime: {Math.floor(saludData.servidor.uptimeSegundos / 60)} minutos</span>
                  </div>
                </div>
              </div>

              {/* Tarjeta: Motor IA Gemini */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">BienestarBot (Google Gemini)</h3>
                      <p className="text-xs text-slate-400">Modelo: {saludData.inteligenciaArtificial.modeloRecomendado}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {saludData.inteligenciaArtificial.estado}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {saludData.inteligenciaArtificial.apiKeyPresente 
                    ? `Las credenciales de Google Gemini (${saludData.inteligenciaArtificial.clavesConfiguradas ?? 1} clave(s) activa(s)) se encuentran configuradas y el asistente responde en tiempo real con respaldo local.`
                    : 'No se detectaron credenciales activas de Gemini. El asistente funciona en modo de contingencia con respuestas institucionales directas.'}
                </p>
              </div>

              {/* Tarjeta: Resumen de Observabilidad */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded-xl">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">Seguridad y Resiliencia</h3>
                    <p className="text-xs text-slate-400">Registro inmutable en tabla Auditoria</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Eventos registrados en 24h:</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">{saludData.estadisticas24h.totalEventos}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fallas capturadas en 24h:</span>
                    <span className={`font-bold font-mono ${saludData.estadisticas24h.errores > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {saludData.estadisticas24h.errores}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Advertencias capturadas en 24h:</span>
                    <span className="font-bold font-mono text-amber-600">{saludData.estadisticas24h.advertencias}</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center text-slate-400 p-8">No se pudieron cargar las métricas de salud.</div>
          )}
        </div>
      )}

    </div>
  );
}
