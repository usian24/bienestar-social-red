'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, AlertCircle } from 'lucide-react';

interface NuevoCittModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tipoPorDefecto?: 'ENFERMEDAD_COMUN' | 'MATERNIDAD' | 'PATERNIDAD';
  editData?: any; // Datos de la licencia a editar
  trabajadorFijo?: any; // Si ya sabemos de qué trabajador es (ej: desde el modal de detalles)
}

export default function NuevoCittModal({ 
  isOpen, onClose, onSuccess, tipoPorDefecto = 'ENFERMEDAD_COMUN', editData, trabajadorFijo 
}: NuevoCittModalProps) {
  // Estados del Buscador de Trabajador
  const [busqueda, setBusqueda] = useState('');
  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<any | null>(null);
  const [buscando, setBuscando] = useState(false);

  // Estados del Formulario del CITT
  const [origen, setOrigen] = useState('ESSALUD_CITT');
  const [numeroCertificado, setNumeroCertificado] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [diasOtorgados, setDiasOtorgados] = useState('');
  
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [archivoAdjunto, setArchivoAdjunto] = useState<File | null>(null);

  // Rellenar datos si estamos en modo edición o si viene trabajador fijo
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setOrigen(editData.origen);
        setNumeroCertificado(editData.numeroCertificado);
        // Formatear la fecha a YYYY-MM-DD
        const fecha = new Date(editData.fechaInicio);
        setFechaInicio(fecha.toISOString().split('T')[0]);
        setDiasOtorgados(editData.diasOtorgados.toString());
      } else {
        setOrigen('ESSALUD_CITT');
        setNumeroCertificado('');
        setFechaInicio('');
        setDiasOtorgados('');
        setArchivoAdjunto(null);
      }

      if (trabajadorFijo) {
        setTrabajadorSeleccionado(trabajadorFijo);
      } else if (!editData) {
        setTrabajadorSeleccionado(null);
      }
      setError('');
    }
  }, [isOpen, editData, trabajadorFijo]);

  // Buscar trabajador cuando escriben el DNI o Nombre
  useEffect(() => {
    const delay = setTimeout(async () => {
      const q = busqueda.trim();
      if (q.length >= 2 && !trabajadorSeleccionado) {
        setBuscando(true);
        try {
          const res = await fetch(`/api/trabajadores/buscar?q=${encodeURIComponent(q)}`);
          const data = await res.json();
          setTrabajadores(data);
        } catch (e) {
          console.error(e);
        } finally {
          setBuscando(false);
        }
      } else {
        setTrabajadores([]);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [busqueda, trabajadorSeleccionado]);

  // Limpiar formulario al cerrar
  if (!isOpen) return null;

  const seleccionarTrabajador = (t: any) => {
    setTrabajadorSeleccionado(t);
    setBusqueda('');
    setTrabajadores([]);
  };

  const calcularFechaFin = (inicio: string, dias: number) => {
    if (!inicio || !dias) return '';
    const date = new Date(inicio + 'T00:00:00'); // Evitar desfase de zona horaria
    date.setDate(date.getDate() + (dias - 1)); // -1 porque el día de inicio cuenta como el día 1
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trabajadorSeleccionado) {
      setError('Debes seleccionar un trabajador primero.');
      return;
    }
    if (!fechaInicio || !diasOtorgados || !numeroCertificado) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setGuardando(true);
    setError('');

    // Calcular Fecha de Fin y Año/Mes contable basado en la fecha de inicio
    const fechaFinCalculada = calcularFechaFin(fechaInicio, parseInt(diasOtorgados));
    const fechaObj = new Date(fechaInicio + 'T00:00:00');
    const mesContable = fechaObj.getMonth() + 1;
    const anioContable = fechaObj.getFullYear();

    try {
      let archivoRutaStr = editData?.archivoRuta || null;

      // Subir archivo si hay uno nuevo
      if (archivoAdjunto) {
        const formData = new FormData();
        formData.append('file', archivoAdjunto);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Error subiendo el archivo adjunto.");
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          archivoRutaStr = uploadData.url;
        }
      }

      const url = editData ? `/api/licencias/${editData.id}` : '/api/licencias';
      const method = editData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trabajadorId: trabajadorSeleccionado.id,
          tipoLicencia: tipoPorDefecto,
          origen,
          numeroCertificado,
          fechaInicio,
          fechaFin: fechaFinCalculada,
          diasOtorgados: parseInt(diasOtorgados),
          anioEjercicio: anioContable,
          mesEjercicio: mesContable,
          archivoRuta: archivoRutaStr
        })
      });

      if (!res.ok) throw new Error('Error al guardar el CITT');

      // Limpiar y cerrar
      setTrabajadorSeleccionado(null);
      setNumeroCertificado('');
      setFechaInicio('');
      setDiasOtorgados('');
      setArchivoAdjunto(null);
      onSuccess(); // Avisar a la pantalla principal que recargue
      onClose(); // Cerrar modal
    } catch (err) {
      setError('Hubo un problema guardando el registro.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {editData ? 'Editar CITT' : 'Registrar Nuevo CITT'}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:text-slate-300 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* 1. Selección de Trabajador */}
          <div className="mb-8">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3">1. Datos del Servidor</h4>
            
            {!trabajadorSeleccionado ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Escribe DNI o Apellidos (Ej. 6079 o Rojas)..." 
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-blue-500"
                />
                
                {buscando && <p className="text-xs text-blue-500 mt-2 ml-1">Buscando en la base de datos...</p>}
                
                {trabajadores.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                    {trabajadores.map(t => (
                      <li 
                        key={t.id} 
                        onClick={() => seleccionarTrabajador(t)}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 flex flex-col"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {t.dni} - {t.apellidosNombres ? t.apellidosNombres : `${t.apellidos}, ${t.nombres}`}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{t.establecimiento?.nombre} ({t.establecimiento?.microred?.nombre})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-xs text-blue-500 font-semibold mb-1">TRABAJADOR SELECCIONADO:</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    {trabajadorSeleccionado.dni} - {trabajadorSeleccionado.apellidosNombres ? trabajadorSeleccionado.apellidosNombres : `${trabajadorSeleccionado.apellidos}, ${trabajadorSeleccionado.nombres}`}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{trabajadorSeleccionado.cargo} en {trabajadorSeleccionado.establecimiento?.nombre}</p>
                </div>
                <button 
                  onClick={() => setTrabajadorSeleccionado(null)}
                  className="text-xs bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 px-3 py-1.5 border border-slate-200 rounded shadow-sm"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>

          {/* 2. Datos del CITT */}
          <div className={`transition-opacity ${!trabajadorSeleccionado ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3">2. Detalle del Descanso Médico</h4>
            
            <form id="citt-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Origen del Certificado</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="ESSALUD_CITT" checked={origen === 'ESSALUD_CITT'} onChange={(e) => setOrigen(e.target.value)} className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">CITT EsSalud</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="PARTICULAR" checked={origen === 'PARTICULAR'} onChange={(e) => setOrigen(e.target.value)} className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">Certificado Particular (Especie Valorada)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Número de Certificado</label>
                <input 
                  type="text" 
                  required
                  value={numeroCertificado}
                  onChange={(e) => setNumeroCertificado(e.target.value.toUpperCase())}
                  placeholder="Ej. A-12345678"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Fecha de Inicio</label>
                <input 
                  type="date" 
                  required
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Cantidad de Días Otorgados</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={diasOtorgados}
                  onChange={(e) => setDiasOtorgados(e.target.value)}
                  placeholder="Ej. 15"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Fecha de Fin (Calculada)</label>
                <input 
                  type="date" 
                  disabled
                  value={calcularFechaFin(fechaInicio, parseInt(diasOtorgados || '0'))}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 rounded-md text-sm text-slate-500 dark:text-slate-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  Evidencia del Descanso (Opcional)
                </label>
                
                <div className="flex flex-wrap gap-3 mb-3">
                  <label className="cursor-pointer px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-sm font-semibold flex items-center gap-2 border border-blue-200 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    Subir Archivo
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) setArchivoAdjunto(e.target.files[0]);
                      }}
                      className="hidden"
                    />
                  </label>

                  <label className="cursor-pointer px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md text-sm font-semibold flex items-center gap-2 border border-emerald-200 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    Tomar Foto
                    <input 
                      type="file" 
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) setArchivoAdjunto(e.target.files[0]);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {archivoAdjunto ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate mr-4">📎 {archivoAdjunto.name}</span>
                    <button type="button" onClick={() => setArchivoAdjunto(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">Quitar</button>
                  </div>
                ) : editData?.archivoRuta ? (
                  <p className="text-xs text-emerald-600 font-medium bg-emerald-50 p-2 rounded inline-block border border-emerald-100">✅ Ya existe una evidencia guardada para este registro.</p>
                ) : null}
              </div>

            </form>
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="citt-form"
            disabled={!trabajadorSeleccionado || guardando}
            className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {guardando ? 'Guardando...' : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {editData ? 'Actualizar Licencia' : 'Registrar Licencia'}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}


