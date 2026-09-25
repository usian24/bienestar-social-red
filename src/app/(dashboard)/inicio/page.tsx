'use client';

import React, { useState, useEffect } from 'react';
import { Users, Activity, FileCheck, Bell, CheckCircle2, CheckCircle, Calendar, BookOpen, History, ExternalLink } from 'lucide-react';

export default function InicioPage() {
  const [kpis, setKpis] = useState({ totalTrabajadores: 0, licenciasActivas: 0, subsidiosPendientes: 0 });
  const [loadingKpis, setLoadingKpis] = useState(true);
  
  // Estado para alertas
  const [alertas, setAlertas] = useState<any[]>([]);
  const [loadingAlertas, setLoadingAlertas] = useState(true);

  // Estado para modal de canje rápido
  const [alertaSeleccionada, setAlertaSeleccionada] = useState<any>(null);
  const [nuevoCitt, setNuevoCitt] = useState('');
  const [guardandoCanje, setGuardandoCanje] = useState(false);
  const [esModoPerdido, setEsModoPerdido] = useState(false);

  const [changelog, setChangelog] = useState<any[]>([]);

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
    async function loadData() {
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
    }
    loadData();
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Tarjetas de Resumen Rápido (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Trabajadores Registrados</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {loadingKpis ? '...' : kpis.totalTrabajadores.toLocaleString()}
              </h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-full">
              <Activity className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Licencias Activas Totales</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {loadingKpis ? '...' : kpis.licenciasActivas.toLocaleString()}
              </h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <FileCheck className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Subsidios Pendientes EsSalud</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {loadingKpis ? '...' : kpis.subsidiosPendientes.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

      {/* Layout de Contenido: Semáforo (Izquierda) + Manual y Changelog (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        
        {/* COLUMNA IZQUIERDA (2/3) - Semáforo */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" /> Semáforo de Canjes Particulares
            </h2>
            <div className="flex gap-3">
              <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                {alertas.filter(a => a.nivelAlerta === 'VENCIDO').length} Vencidos
              </span>
              <span className="text-xs font-medium bg-rose-50 text-rose-700 px-2 py-1 rounded border border-rose-100">
                {alertas.filter(a => a.nivelAlerta === 'ROJO').length} Críticos
              </span>
              <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-100">
                {alertas.filter(a => a.nivelAlerta === 'AMARILLO').length} En Riesgo
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            {loadingAlertas ? (
              <div className="bg-white p-8 text-center rounded-lg shadow-sm border border-slate-200 text-slate-400">Cargando semáforo...</div>
            ) : alertas.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm text-center flex flex-col items-center">
                <CheckCircle className="w-10 h-10 text-emerald-400 mb-3" />
                <p className="text-slate-600 font-medium">No hay certificados particulares en riesgo de vencer.</p>
                <p className="text-sm text-slate-400 mt-1">Todo está al día con EsSalud.</p>
              </div>
            ) : (
              alertas.map((alerta) => (
                <div key={alerta.id} className={`bg-white rounded-lg p-5 border-l-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${alerta.nivelAlerta === 'VENCIDO' ? 'border-l-slate-500' : alerta.nivelAlerta === 'ROJO' ? 'border-l-rose-500' : 'border-l-amber-500'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0 font-bold ${alerta.nivelAlerta === 'VENCIDO' ? 'bg-slate-100 text-slate-700' : alerta.nivelAlerta === 'ROJO' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                      {alerta.diasTranscurridos}
                      <span className="text-[8px] uppercase">Días</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        {alerta.trabajador.apellidos}, {alerta.trabajador.nombres}
                      </h4>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {alerta.trabajador.establecimiento.nombre}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(alerta.creadoEn).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {alerta.nivelAlerta === 'VENCIDO' ? (
                      <button 
                        onClick={() => { setAlertaSeleccionada(alerta); setEsModoPerdido(true); setNuevoCitt(''); }}
                        className="text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 px-4 py-2 rounded-md transition-colors text-center flex items-center justify-center gap-1 shadow-sm"
                      >
                        Marcar Perdido
                      </button>
                    ) : (
                      <button 
                        onClick={() => { setAlertaSeleccionada(alerta); setEsModoPerdido(false); setNuevoCitt(''); }}
                        className="text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-4 py-2 rounded-md transition-colors text-center flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Finalizar Canje
                      </button>
                    )}
                    <a href="/salud" className="text-[10px] font-medium text-slate-400 hover:text-slate-600 text-center transition-colors">
                      Ver Expediente
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA (1/3) - Manual y Changelog */}
        <div className="space-y-6">
          {/* Manual de Uso */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-md">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5" /> Manual de Uso
            </h3>
            <p className="text-blue-100 text-sm mb-4">
              Aprende a sacar el máximo provecho al sistema. Conoce el flujo de subsidios, canjes y registro de expedientes.
            </p>
            <a href="/manual_de_uso.pdf" target="_blank" className="inline-flex items-center gap-2 bg-white text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors">
              Descargar PDF <ExternalLink className="w-4 h-4" />
            </a>
          </div>

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
              <button onClick={() => setAlertaSeleccionada(null)} className="text-slate-400 hover:text-slate-600">✕</button>
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
    </div>
  );
}

