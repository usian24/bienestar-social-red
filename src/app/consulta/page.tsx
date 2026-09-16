"use client";
import React, { useState } from 'react';
import { Search, Heart, ShieldAlert, CheckCircle, FileText, Calendar } from 'lucide-react';

export default function ConsultaPublica() {
  const [dni, setDni] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<any>(null);

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dni.length < 8) return;
    setLoading(true);
    setError('');
    setResultado(null);
    try {
      const res = await fetch(`/api/consulta?dni=${dni}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('No se encontraron registros de subsidios para este DNI.');
        throw new Error('Error al consultar. Intente más tarde.');
      }
      const data = await res.json();
      setResultado(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Consulta de Subsidios (CITT)</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
          Ingrese su número de DNI para verificar el estado de sus días de descanso médico acumulados y la responsabilidad de pago (Empleador o EsSalud).
        </p>

        <form onSubmit={buscar} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Número de DNI" 
              maxLength={8}
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-blue-500 font-medium"
            />
          </div>
          <button 
            type="submit" 
            disabled={dni.length < 8 || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Consultar'}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-lg flex gap-3 text-sm border border-red-200 dark:border-red-800/50">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {resultado && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Tarjeta de Información Personal */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-lg border border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-1">{resultado.apellidosNombres}</h3>
              <div className="text-sm text-slate-500 dark:text-slate-400 grid grid-cols-2 gap-y-2 mt-3">
                <p><span className="font-medium text-slate-700 dark:text-slate-300">DNI:</span> {resultado.dni}</p>
                <p><span className="font-medium text-slate-700 dark:text-slate-300">Cargo:</span> {resultado.cargo}</p>
                <p><span className="font-medium text-slate-700 dark:text-slate-300">Condición:</span> {resultado.condicionLaboral}</p>
                <p><span className="font-medium text-slate-700 dark:text-slate-300">Establecimiento:</span> {resultado.establecimiento}</p>
              </div>
            </div>

            {/* Resumen de Días */}
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" /> Resumen de Días Acumulados Anual
            </h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-4 rounded-xl text-center">
                <p className="text-3xl font-black text-blue-700 dark:text-blue-400">{resultado.resumen.totalDiasAcumulados}</p>
                <p className="text-[11px] font-bold text-blue-600 dark:text-blue-300 uppercase mt-1">Días Totales</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 p-4 rounded-xl text-center">
                <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{resultado.resumen.diasCubiertosPorRed}</p>
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-300 uppercase mt-1">Pago Empleador</p>
                <p className="text-[9px] text-emerald-500 dark:text-emerald-400/80 mt-0.5 leading-tight">Primeros 20 días</p>
              </div>
              <div className={`p-4 rounded-xl text-center border ${resultado.resumen.diasSubsidioEsSalud > 0 ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                <p className={`text-3xl font-black ${resultado.resumen.diasSubsidioEsSalud > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {resultado.resumen.diasSubsidioEsSalud}
                </p>
                <p className={`text-[11px] font-bold uppercase mt-1 ${resultado.resumen.diasSubsidioEsSalud > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  Subsidio EsSalud
                </p>
                <p className={`text-[9px] mt-0.5 leading-tight ${resultado.resumen.diasSubsidioEsSalud > 0 ? 'text-rose-500 dark:text-rose-400/80' : 'text-slate-400 dark:text-slate-500/80'}`}>
                  Día 21 en adelante
                </p>
              </div>
            </div>

            {/* Listado de CITTs */}
            <div className="mt-8">
              <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" /> Descansos Médicos Registrados
              </h4>
              <div className="space-y-3">
                {resultado.licencias.map((lic: any) => (
                  <div key={lic.id} className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-bold w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                        {lic.diasOtorgados}d
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{lic.numeroCertificado}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(lic.fechaInicio).toLocaleDateString('es-PE')} al {new Date(lic.fechaFin).toLocaleDateString('es-PE')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                        {lic.origen}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

