"use client";
import React, { useState } from 'react';
import { Search, Activity, Heart, Baby, Calendar, AlertCircle } from 'lucide-react';

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
        if (res.status === 404) throw new Error('No se encontraron registros para este número de DNI.');
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

  const hasSalud = resultado?.resumen?.salud?.total > 0;
  const hasMaternidad = resultado?.resumen?.maternidad?.total > 0;
  const hasPaternidad = resultado?.resumen?.paternidad?.total > 0;

  return (
    <div className="max-w-4xl mx-auto pb-24 font-sans selection:bg-blue-100 selection:text-blue-900 relative">
      
      {/* Background Watermark Logo */}
      <div className="fixed inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0 overflow-hidden">
        <img 
          src="/images/logo-red-huanuco.png" 
          alt="Watermark" 
          className="w-[80vw] max-w-[800px] h-auto object-contain grayscale"
        />
      </div>

      <div className="relative z-10">
        
        {/* Branding Centered */}
        <div className="flex flex-col items-center justify-center mt-4 mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
          <img 
            src="/images/logo-red-huanuco.png" 
            alt="Red de Salud Huánuco" 
            className="h-20 w-auto mb-4 drop-shadow-sm" 
          />
          <h1 className="text-xl font-medium text-slate-800 tracking-tight">Red de Salud Huánuco</h1>
          <p className="text-sm text-slate-500 font-light mt-1">Portal del Trabajador - Bienestar Social</p>
        </div>

        {/* Search Header with Explanation */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-slate-900 mb-6">
            Portal de Transparencia de Subsidios.
          </h2>
          <p className="text-lg md:text-xl text-slate-500 max-w-3xl mx-auto font-light leading-relaxed">
            Bienvenido al portal oficial de la Unidad de Bienestar Social. Aquí podrás consultar el estado de tus descansos médicos (CITT) y conocer exactamente qué entidad asume el pago de tus días de licencia según la normativa vigente de EsSalud.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={buscar} className="max-w-lg mx-auto relative flex items-center mb-16 group">
          <Search className="absolute left-6 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Ingresa tu número de DNI..." 
            maxLength={8}
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-white border border-slate-200 rounded-full pl-14 pr-32 py-4 text-lg text-slate-900 focus:outline-none focus:ring-[3px] focus:ring-blue-100 focus:border-blue-400 shadow-sm transition-all placeholder:text-slate-400"
          />
          <button 
            type="submit" 
            disabled={dni.length < 8 || loading}
            className="absolute right-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full font-medium transition-all disabled:opacity-30 disabled:hover:bg-slate-900 text-sm active:scale-95"
          >
            {loading ? 'Buscando' : 'Consultar'}
          </button>
        </form>

        {error && (
          <div className="max-w-md mx-auto bg-slate-50 text-slate-600 px-6 py-4 rounded-2xl flex items-center justify-center gap-3 text-sm mb-12 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <p>{error}</p>
          </div>
        )}

        {/* Results Section */}
        {resultado && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 bg-white/80 backdrop-blur-sm rounded-[2rem] border border-slate-200 p-8 md:p-12 shadow-sm">
            
            {/* Header: User Info */}
            <div className="border-b border-slate-100 pb-8 mb-12 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-3">Servidor Público</p>
                <h3 className="text-3xl font-semibold tracking-tight text-slate-900">{resultado.apellidosNombres}</h3>
              </div>
              <div className="text-slate-500 font-light text-sm md:text-right space-y-1">
                <p>{resultado.cargo} • {resultado.condicionLaboral}</p>
                <p>{resultado.establecimiento}</p>
              </div>
            </div>

            {/* Calculations */}
            <div className="space-y-16">
              
              {!hasSalud && !hasMaternidad && !hasPaternidad && (
                <div className="text-center text-slate-400 py-12 font-light">
                  No hay descansos médicos registrados para este periodo.
                </div>
              )}

              {hasSalud && (
                <div>
                  <h4 className="text-lg font-medium text-slate-900 mb-8 flex items-center justify-center md:justify-start gap-2">
                    <Activity className="w-5 h-5 text-slate-400" strokeWidth={1.5} /> Enfermedad Común
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                    <div>
                      <p className="text-5xl font-light tracking-tight text-slate-900">{resultado.resumen.salud.total}</p>
                      <p className="text-sm text-slate-500 mt-2 font-light">Días registrados</p>
                    </div>
                    <div>
                      <p className="text-5xl font-light tracking-tight text-slate-900">{resultado.resumen.salud.red}</p>
                      <p className="text-sm text-slate-500 mt-2 font-light">Pago Red de Salud</p>
                    </div>
                    <div>
                      <p className={`text-5xl font-light tracking-tight ${resultado.resumen.salud.essalud > 0 ? 'text-blue-600' : 'text-slate-900'}`}>
                        {resultado.resumen.salud.essalud}
                      </p>
                      <p className="text-sm text-slate-500 mt-2 font-light">Subsidio EsSalud</p>
                    </div>
                  </div>
                </div>
              )}

              {hasMaternidad && (
                <div className={hasSalud ? "pt-12 border-t border-slate-100" : ""}>
                  <h4 className="text-lg font-medium text-slate-900 mb-8 flex items-center justify-center md:justify-start gap-2">
                    <Heart className="w-5 h-5 text-slate-400" strokeWidth={1.5} /> Maternidad
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center md:text-left">
                    <div>
                      <p className="text-5xl font-light tracking-tight text-slate-900">{resultado.resumen.maternidad.total}</p>
                      <p className="text-sm text-slate-500 mt-2 font-light">Días registrados</p>
                    </div>
                    <div>
                      <p className="text-5xl font-light tracking-tight text-blue-600">{resultado.resumen.maternidad.essalud}</p>
                      <p className="text-sm text-slate-500 mt-2 font-light">Cobertura EsSalud</p>
                    </div>
                  </div>
                </div>
              )}

              {hasPaternidad && (
                <div className={(hasSalud || hasMaternidad) ? "pt-12 border-t border-slate-100" : ""}>
                  <h4 className="text-lg font-medium text-slate-900 mb-8 flex items-center justify-center md:justify-start gap-2">
                    <Baby className="w-5 h-5 text-slate-400" strokeWidth={1.5} /> Paternidad
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center md:text-left">
                    <div>
                      <p className="text-5xl font-light tracking-tight text-slate-900">{resultado.resumen.paternidad.total}</p>
                      <p className="text-sm text-slate-500 mt-2 font-light">Días registrados</p>
                    </div>
                    <div>
                      <p className="text-5xl font-light tracking-tight text-slate-900">{resultado.resumen.paternidad.red}</p>
                      <p className="text-sm text-slate-500 mt-2 font-light">Pago Red de Salud</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
            
            {/* List of CITTs */}
            <div className="mt-16 pt-12 border-t border-slate-100">
              <h4 className="text-xl font-medium text-slate-900 mb-8 text-center">Historial de Descansos</h4>
              <div className="space-y-4">
                {resultado.licencias.map((lic: any) => (
                  <div key={lic.id} className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-shadow hover:shadow-sm">
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 bg-white rounded-2xl flex flex-col items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                        <span className="text-lg font-medium text-slate-900 leading-none">{lic.diasOtorgados}</span>
                        <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">días</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-medium text-slate-900">{lic.numeroCertificado}</span>
                          <span className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-medium tracking-wide">
                            {lic.origen === 'ESSALUD_CITT' ? 'EsSalud' : 'Particular'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 font-light capitalize">
                          {lic.tipoLicencia.replace('_', ' ').toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-slate-500 font-light border-t border-slate-100 md:border-0 pt-4 md:pt-0">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-300" />
                        <span>{new Date(lic.fechaInicio).toLocaleDateString('es-PE')}</span>
                      </div>
                      <span className="text-slate-300">-</span>
                      <div className="flex items-center gap-2">
                        <span>{new Date(lic.fechaFin).toLocaleDateString('es-PE')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Informational Guide (Visible only when no results) */}
        {!resultado && !loading && !error && (
          <div className="mt-24 max-w-5xl mx-auto animate-in fade-in duration-1000">
            
            <div className="text-center mb-16">
              <h3 className="text-3xl font-semibold tracking-tight text-slate-900">Normativas claras. Cuentas claras.</h3>
              <p className="text-lg text-slate-500 mt-4 font-light max-w-2xl mx-auto">
                El cálculo de coberturas se realiza automáticamente en base a la Ley N° 26790 de EsSalud y las normativas vigentes.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 md:gap-8 text-center md:text-left mb-24">
              <div>
                <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center mb-6 mx-auto md:mx-0">
                  <Activity className="w-6 h-6 text-slate-700" strokeWidth={1.5} />
                </div>
                <h4 className="text-lg font-medium text-slate-900 mb-3">Enfermedad Común</h4>
                <p className="text-slate-500 font-light leading-relaxed text-[15px]">
                  Los primeros 20 días de incapacidad en el año son cubiertos por la Red de Salud. A partir del día 21, EsSalud asume el 100% mediante el Subsidio por Incapacidad Temporal.
                </p>
              </div>
              
              <div>
                <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center mb-6 mx-auto md:mx-0">
                  <Heart className="w-6 h-6 text-slate-700" strokeWidth={1.5} />
                </div>
                <h4 className="text-lg font-medium text-slate-900 mb-3">Maternidad</h4>
                <p className="text-slate-500 font-light leading-relaxed text-[15px]">
                  Corresponde a 98 días de descanso (distribuidos en periodos pre y post natal). EsSalud asume el 100% del pago mediante el Subsidio por Maternidad.
                </p>
              </div>

              <div>
                <div className="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-2xl flex items-center justify-center mb-6 mx-auto md:mx-0">
                  <Baby className="w-6 h-6 text-slate-700" strokeWidth={1.5} />
                </div>
                <h4 className="text-lg font-medium text-slate-900 mb-3">Paternidad</h4>
                <p className="text-slate-500 font-light leading-relaxed text-[15px]">
                  El descanso consta de 10 a 14 días consecutivos otorgados al momento del nacimiento. Es pagado íntegramente por el Empleador.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200/60 pt-20">
              <div className="text-center mb-16">
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Pasos para el trámite</h3>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <span className="text-sm font-semibold text-slate-300 mb-4 tracking-widest uppercase">Paso 01</span>
                  <h5 className="text-base font-medium text-slate-900 mb-2">Certificado Original</h5>
                  <p className="text-sm text-slate-500 font-light leading-relaxed">
                    Entrega del CITT original (copia del trabajador y copia del empleador) emitido por EsSalud.
                  </p>
                </div>
                
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <span className="text-sm font-semibold text-slate-300 mb-4 tracking-widest uppercase">Paso 02</span>
                  <h5 className="text-base font-medium text-slate-900 mb-2">Canje Particular</h5>
                  <p className="text-sm text-slate-500 font-light leading-relaxed">
                    Si te atendiste en clínica, el certificado debe ser canjeado por un CITT de EsSalud en menos de 30 días.
                  </p>
                </div>

                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <span className="text-sm font-semibold text-slate-300 mb-4 tracking-widest uppercase">Paso 03</span>
                  <h5 className="text-base font-medium text-slate-900 mb-2">Plazo de entrega</h5>
                  <p className="text-sm text-slate-500 font-light leading-relaxed">
                    Presentar el documento físico a Recursos Humanos dentro de las 72 horas para justificar la inasistencia.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
