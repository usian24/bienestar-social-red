"use client";

import React, { useState, useEffect } from 'react';
import { 
  User, Activity, FileCheck, MapPin, Search, Calendar, Heart, BadgePlus,
  Lock, KeyRound, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, X, Loader2
} from 'lucide-react';
import ChatbotAsistente from '@/shared/components/ChatbotAsistente';

export default function TrabajadorDashboard() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Estados para Cambio de Contraseña de Trabajador
  const [modalPasswordOpen, setModalPasswordOpen] = useState(false);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [passwordConfirmacion, setPasswordConfirmacion] = useState('');
  const [showPassActual, setShowPassActual] = useState(false);
  const [showPassNuevo, setShowPassNuevo] = useState(false);
  const [showPassConfirmacion, setShowPassConfirmacion] = useState(false);
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [errorPassword, setErrorPassword] = useState('');
  const [exitoPassword, setExitoPassword] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/me');
        if (res.ok) setUserData(await res.json());
      } catch (error) {
        console.error("Error loading personal data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const resetFormPassword = () => {
    setPasswordActual('');
    setPasswordNuevo('');
    setPasswordConfirmacion('');
    setErrorPassword('');
    setExitoPassword('');
    setShowPassActual(false);
    setShowPassNuevo(false);
    setShowPassConfirmacion(false);
  };

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPassword('');
    setExitoPassword('');

    if (passwordNuevo.length < 6) {
      setErrorPassword('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (passwordNuevo !== passwordConfirmacion) {
      setErrorPassword('La confirmación de la nueva contraseña no coincide.');
      return;
    }

    if (passwordActual === passwordNuevo) {
      setErrorPassword('La nueva contraseña no puede ser idéntica a la contraseña actual.');
      return;
    }

    setGuardandoPassword(true);
    try {
      const res = await fetch('/api/trabajador/cambiar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passwordActual,
          passwordNuevo,
          passwordConfirmacion
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo actualizar la contraseña.');
      }

      setExitoPassword(data.message || 'Contraseña actualizada correctamente.');
      setPasswordActual('');
      setPasswordNuevo('');
      setPasswordConfirmacion('');

      setTimeout(() => {
        setModalPasswordOpen(false);
        setExitoPassword('');
      }, 2200);
    } catch (err: any) {
      setErrorPassword(err.message || 'Error al conectar con el servidor.');
    } finally {
      setGuardandoPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userData) {
    return <div className="text-center text-slate-500 mt-10">Error cargando información personal.</div>;
  }

  const licenciasFiltradas = userData.licenciasPersonales?.filter((lic: any) => 
    lic.numeroCertificado?.toLowerCase().includes(busqueda.toLowerCase()) ||
    lic.tipoLicencia?.toLowerCase().includes(busqueda.toLowerCase())
  ) || [];

  const diasTotalesOtorgados = userData.licenciasPersonales?.reduce((acc: number, l: any) => acc + (l.diasOtorgados || 0), 0) || 0;

  const nombreEstablecimiento = userData.establecimientoReal?.nombre || 'Sede Administrativa';
  const nombreMicrored = userData.establecimientoReal?.microred?.nombre || userData.microred?.nombre || 'SIN ASIGNAR';

  return (
    <div className="space-y-6">
      
      {/* Saludo Personalizado + Botón de Seguridad de Contraseña */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 sm:p-6 md:p-8 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative z-10">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">¡Hola, {userData.nombres}!</h1>
          <p className="text-blue-100 opacity-90 text-xs sm:text-sm max-w-xl">
            Este es tu panel personal. Aquí puedes consultar el estado de tus trámites, licencias médicas y ver a qué establecimiento perteneces.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetFormPassword();
            setModalPasswordOpen(true);
          }}
          className="relative z-10 px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 backdrop-blur-sm transition-all cursor-pointer active:scale-95 shadow-sm shrink-0"
        >
          <Lock className="w-4 h-4 text-white" />
          <span>Cambiar Contraseña</span>
        </button>
      </div>

      {/* Tarjetas de Resumen Personal (Compactas en 1 sola fila en celular) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
        
        {/* 1. Datos de Red/Sede */}
        <div className="bg-white p-2 sm:p-4 md:p-5 rounded-xl shadow-xs border border-slate-200 hover:border-blue-300 transition-colors flex flex-col justify-between sm:flex-row sm:items-center gap-1.5 sm:gap-3.5 overflow-hidden min-w-0">
          <div className="w-7 h-7 sm:w-10 sm:h-10 bg-indigo-50 text-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-400 text-[9px] sm:text-[11px] uppercase font-bold tracking-tight truncate">
              <span className="sm:hidden">Lugar</span>
              <span className="hidden sm:inline">Lugar de Trabajo</span>
            </p>
            <h3 className="text-xs sm:text-base md:text-lg font-bold text-slate-800 truncate" title={nombreEstablecimiento}>
              {nombreEstablecimiento}
            </h3>
            <p className="hidden md:block text-[11px] text-slate-400 mt-0.5 truncate">
              Microred: {nombreMicrored} | DNI: {userData.dni}
            </p>
          </div>
        </div>

        {/* 2. Licencias Totales */}
        <div className="bg-white p-2 sm:p-4 md:p-5 rounded-xl shadow-xs border border-slate-200 hover:border-blue-300 transition-colors flex flex-col justify-between sm:flex-row sm:items-center gap-1.5 sm:gap-3.5 overflow-hidden min-w-0">
          <div className="w-7 h-7 sm:w-10 sm:h-10 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <FileCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-400 text-[9px] sm:text-[11px] uppercase font-bold tracking-tight truncate">
              <span className="sm:hidden">Licencias</span>
              <span className="hidden sm:inline">Historial Licencias</span>
            </p>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <h3 className="text-sm sm:text-xl md:text-2xl font-bold text-slate-800">
                {userData.licenciasPersonales?.length || 0}
              </h3>
              <span className="text-[9px] sm:text-xs font-semibold text-slate-500 truncate">
                <span className="sm:hidden">totales</span>
                <span className="hidden sm:inline">trámites</span>
              </span>
            </div>
          </div>
        </div>

        {/* 3. Días Otorgados Totales */}
        <div className="bg-white p-2 sm:p-4 md:p-5 rounded-xl shadow-xs border border-slate-200 hover:border-blue-300 transition-colors flex flex-col justify-between sm:flex-row sm:items-center gap-1.5 sm:gap-3.5 overflow-hidden min-w-0">
          <div className="w-7 h-7 sm:w-10 sm:h-10 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <Heart className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-400 text-[9px] sm:text-[11px] uppercase font-bold tracking-tight truncate">
              <span className="sm:hidden">Descanso</span>
              <span className="hidden sm:inline">Días Descanso</span>
            </p>
            <div className="flex items-baseline gap-1 sm:gap-2">
              <h3 className="text-sm sm:text-xl md:text-2xl font-bold text-slate-800">
                {diasTotalesOtorgados}
              </h3>
              <span className="text-[9px] sm:text-xs font-semibold text-slate-500 truncate">
                días
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Layout Principal: Tabla de Trámites (2/3) + Asistente Virtual (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Tabla Visual tipo Excel para Licencias (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" /> Mis Trámites y Licencias
              </h2>
              <p className="text-sm text-slate-500">Historial completo de tus descansos médicos registrados.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar por CITT o Tipo..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100/80 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-4 border-b border-slate-200">N° Certificado / CITT</th>
                  <th className="px-5 py-4 border-b border-slate-200">Tipo Licencia</th>
                  <th className="px-5 py-4 border-b border-slate-200">Origen</th>
                  <th className="px-5 py-4 border-b border-slate-200">Fechas (Inicio - Fin)</th>
                  <th className="px-5 py-4 border-b border-slate-200 text-center">Días</th>
                  <th className="px-5 py-4 border-b border-slate-200">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {licenciasFiltradas.length > 0 ? (
                  licenciasFiltradas.map((lic: any) => (
                    <tr key={lic.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">
                          {lic.numeroCertificado || 'S/N'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium">
                        {lic.tipoLicencia?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[11px] font-bold uppercase text-slate-500">
                          {lic.origen?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(lic.fechaInicio).toLocaleDateString('es-PE')} - {new Date(lic.fechaFin).toLocaleDateString('es-PE')}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                          {lic.diasOtorgados}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {lic.estado === 'ACTIVA' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> ACTIVA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            CERRADA
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500 bg-slate-50/50">
                      <FileCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-600">No se encontraron licencias</p>
                      <p className="text-xs text-slate-400 mt-1">Aún no tienes descansos médicos registrados en el sistema.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Columna Derecha: Asistente Virtual BienestarBot (1/3) */}
        <div className="lg:col-span-1 space-y-6">
          <ChatbotAsistente modo="tarjeta" />
        </div>
      </div>

      {/* MODAL DE CAMBIO DE CONTRASEÑA (EXCLUSIVO TRABAJADORES) */}
      {modalPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-cyan-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Cambiar Mi Contraseña
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Autoservicio de seguridad institucional
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalPasswordOpen(false)}
                disabled={guardandoPassword}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCambiarPassword} className="p-6 space-y-4">
              
              {/* Mensajes de feedback */}
              {errorPassword && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed">{errorPassword}</span>
                </div>
              )}

              {exitoPassword && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2 animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span className="leading-relaxed font-medium">{exitoPassword}</span>
                </div>
              )}

              {/* 1. Contraseña Actual */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <input
                    type={showPassActual ? "text" : "password"}
                    required
                    value={passwordActual}
                    onChange={(e) => setPasswordActual(e.target.value)}
                    placeholder="Ingresa tu clave actual"
                    disabled={guardandoPassword}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassActual(!showPassActual)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 2. Nueva Contraseña */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassNuevo ? "text" : "password"}
                    required
                    minLength={6}
                    value={passwordNuevo}
                    onChange={(e) => setPasswordNuevo(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    disabled={guardandoPassword}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassNuevo(!showPassNuevo)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassNuevo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 3. Confirmar Nueva Contraseña */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassConfirmacion ? "text" : "password"}
                    required
                    minLength={6}
                    value={passwordConfirmacion}
                    onChange={(e) => setPasswordConfirmacion(e.target.value)}
                    placeholder="Repite la nueva clave"
                    disabled={guardandoPassword}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassConfirmacion(!showPassConfirmacion)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassConfirmacion ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Caja Institucional de Soporte por Olvido */}
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-300 leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-blue-950 dark:text-blue-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  ¿Olvidaste tu contraseña actual?
                </p>
                <p>
                  Por motivos de seguridad y control interno, si no recuerdas tu clave actual o perdiste el acceso, debes ponerte en contacto con la <strong>Unidad de Recursos Humanos / Bienestar Social de la Red de Salud Huánuco</strong> para validar tu identidad y solicitar el restablecimiento institucional.
                </p>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalPasswordOpen(false)}
                  disabled={guardandoPassword}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardandoPassword || !passwordActual || !passwordNuevo || !passwordConfirmacion}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-blue-600/20 active:scale-95 flex items-center gap-2"
                >
                  {guardandoPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Actualizar Contraseña</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
