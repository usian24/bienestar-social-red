'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Pencil, Trash2, Calendar, FileText, User, Clock, Loader2, Maximize2, ImageOff } from 'lucide-react';
import NuevoCittModal from './NuevoCittModal';
import VisorEvidenciaModal from './VisorEvidenciaModal';
import { useSession } from 'next-auth/react';
import { tienePermiso } from '@/shared/utils/permisos';
import { formatCalendarDateDMY } from '@/core/licencias/calculoSubsidios';
import { useBackHandler } from '@/shared/utils/appBackHandler';

interface DetallesTrabajadorModalProps {
  isOpen: boolean;
  onClose: () => void;
  trabajadorInfoFijo: any | null;
  onRefreshParent: () => void;
  tipoLicenciaRestriccion?: string;
  reporteUrl?: string; // Optional prop for custom PDF report URL
}

export default function DetallesTrabajadorModal({ isOpen, onClose, trabajadorInfoFijo, onRefreshParent, tipoLicenciaRestriccion, reporteUrl = '/salud/reporte/' }: DetallesTrabajadorModalProps) {
  
  const { data: session } = useSession();
  const [licencias, setLicencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [evidenciaVisor, setEvidenciaVisor] = useState<{ url: string; titulo: string } | null>(null);
  const [brokenThumbIds, setBrokenThumbIds] = useState<Record<string, boolean>>({});

  // Estados para Edición
  const [licenciaEditando, setLicenciaEditando] = useState<any>(null);

  const handleCerrarModal = useCallback(() => {
    setEvidenciaVisor(null);
    setLicenciaEditando(null);
    setPreviewId(null);
    setBrokenThumbIds({});
    onClose();
  }, [onClose]);

  useBackHandler(isOpen, handleCerrarModal);

  const fetchDetalles = async () => {
    if (!trabajadorInfoFijo?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/licencias?trabajadorId=${trabajadorInfoFijo.id}`);
      let data = await res.json();
      if (tipoLicenciaRestriccion) {
        data = data.filter((lic: any) => lic.tipoLicencia === tipoLicenciaRestriccion);
      }
      setLicencias(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!isOpen || !trabajadorInfoFijo?.id) return () => { active = false; };
    (async () => {
      try {
        const res = await fetch(`/api/licencias?trabajadorId=${trabajadorInfoFijo.id}`);
        let data = await res.json();
        if (tipoLicenciaRestriccion) {
          data = data.filter((lic: any) => lic.tipoLicencia === tipoLicenciaRestriccion);
        }
        if (active) setLicencias(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isOpen, trabajadorInfoFijo?.id, tipoLicenciaRestriccion]);

  const handleDelete = async (licenciaId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro de licencia? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const res = await fetch(`/api/licencias/${licenciaId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDetalles(); // Recargar historial local
        onRefreshParent(); // Avisar al dashboard que debe recalcular
      } else {
        alert('Hubo un error al eliminar el registro.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Cabecera */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 min-w-0 truncate">
              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="truncate">Historial del Servidor</span>
            </h3>
            <div className="flex gap-2 sm:gap-3 items-center shrink-0">
              {(trabajadorInfoFijo?.id || trabajadorInfoFijo?.trabajadorId) && (
                <a
                  href={`${reporteUrl.endsWith('/') ? reporteUrl : `${reporteUrl}/`}${trabajadorInfoFijo.id || trabajadorInfoFijo.trabajadorId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 sm:px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  title="Abrir Reporte PDF Personal del Servidor"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Reporte Personal PDF</span>
                </a>
              )}
              <button onClick={handleCerrarModal} className="p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:text-slate-300 rounded-md transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Cargando expediente del servidor...
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Consultando histórico de descansos y CITTs registrados
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Tarjeta de Información del Servidor */}
                {trabajadorInfoFijo && (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 rounded-lg p-5 mb-6 shadow-sm flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold">
                      {trabajadorInfoFijo.apellidosNombres ? trabajadorInfoFijo.apellidosNombres.charAt(0) : ''}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {trabajadorInfoFijo.apellidosNombres}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-4 mt-1">
                        <span><strong>DNI:</strong> {trabajadorInfoFijo.dni}</span>
                        <span><strong>Cargo:</strong> {trabajadorInfoFijo.cargo}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {trabajadorInfoFijo.microred} - {trabajadorInfoFijo.establecimiento}
                      </p>
                    </div>
                  </div>
                )}

                {/* Cartillas de Licencias (Mini Documentos) */}
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2 mt-6">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Expediente de Descansos Médicos ({licencias.length})
                </h4>
                
                <div className="space-y-4">
                  {licencias.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 rounded-lg p-8 text-center shadow-sm">
                      <p className="text-slate-500 dark:text-slate-400">No se encontraron licencias registradas para este trabajador.</p>
                    </div>
                  ) : (
                    licencias.map(lic => (
                      <div key={lic.id} className="bg-white dark:bg-slate-800 border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow relative">
                        {/* Banda de color según el origen y tipo */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                          lic.tipoLicencia === 'LEY_30012' ? 'bg-purple-500' :
                          lic.origen === 'PARTICULAR_PERDIDO' ? 'bg-rose-500' :
                          lic.origen === 'ESSALUD_CITT' ? 'bg-blue-500' : 'bg-emerald-500'
                        }`}></div>
                        
                        <div className="p-5 pl-7">
                          {/* Cabecera de la Cartilla */}
                          <div className="flex flex-wrap justify-between items-start gap-2.5 mb-4">
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                                lic.tipoLicencia === 'LEY_30012'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                  : lic.origen === 'PARTICULAR_PERDIDO'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                    : lic.origen === 'ESSALUD_CITT' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {lic.tipoLicencia === 'LEY_30012'
                                  ? 'MINSA - Ley Nº 30012'
                                  : lic.origen === 'PARTICULAR_PERDIDO'
                                    ? 'Particular (Perdido)'
                                    : (lic.origen === 'ESSALUD_CITT' ? 'CITT EsSalud' : 'Certificado Particular')}
                              </span>
                              <h5 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-2">
                                {lic.tipoLicencia === 'LEY_30012' ? 'Ley Nº 30012 (Familiar Grave)' : lic.tipoLicencia.replace('_', ' ')}
                              </h5>
                              {(lic as any).familiarPaciente && (
                                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mt-1 flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-[10px] uppercase font-bold text-purple-800 dark:text-purple-200">
                                    Familiar / Paciente:
                                  </span>
                                  <span>{(lic as any).familiarPaciente}</span>
                                </p>
                              )}
                            </div>
                            
                            {/* Acciones integradas en el mini documento */}
                            <div className="flex gap-2">
                              {tienePermiso((session?.user as any)?.permisos || [], (session?.user as any)?.rol || '', 'GESTIONAR_LICENCIAS') && (
                                <button 
                                  onClick={() => setLicenciaEditando(lic)}
                                  className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors flex items-center gap-1.5 border border-slate-200"
                                >
                                  <Pencil className="w-3.5 h-3.5" /> Editar
                                </button>
                              )}
                              {(session?.user as any)?.rol === 'SUPER_ADMIN' && (
                                <button 
                                  onClick={() => handleDelete(lic.id)}
                                  className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-red-100 hover:text-red-700 rounded-md transition-colors flex items-center gap-1.5 border border-slate-200"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Cuerpo de la Cartilla - Datos Estructurados */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <div>
                              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">N° Certificado</p>
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{lic.numeroCertificado}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Días Otorgados</p>
                              <p className="text-lg font-black text-blue-600">{lic.diasOtorgados} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">días</span></p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Fecha de Inicio</p>
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatCalendarDateDMY(lic.fechaInicio)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Fecha de Fin</p>
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatCalendarDateDMY(lic.fechaFin)}</p>
                            </div>
                          </div>

                          {/* Sección de Evidencia Inline */}
                          {lic.archivoRuta && (
                            <div className="mt-4 border-t border-slate-100 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                              <button 
                                onClick={() => setPreviewId(previewId === lic.id ? null : lic.id)}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors"
                              >
                                {previewId === lic.id ? (
                                  <>Ocultar Evidencia ▲</>
                                ) : (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                    Ver Certificado Adjunto ▼
                                  </>
                                )}
                              </button>
                              {/* Footer / Meta Info de la Cartilla - Siempre visible */}
                              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:justify-between items-start md:items-center text-[11px] text-slate-500 gap-2">
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5" />
                                  <span>
                                    Subido por: <strong className="text-slate-700 dark:text-slate-300 uppercase">{lic.registradoPor?.nombres || 'Administrador'} {lic.registradoPor?.apellidos || ''}</strong> 
                                    {lic.registradoPor?.microred?.nombre ? ` (${lic.registradoPor.microred.nombre})` : (lic.registradoPor?.rol?.nombre || lic.registradoPor?.rol ? ` (${typeof lic.registradoPor.rol === 'string' ? lic.registradoPor.rol : lic.registradoPor.rol.nombre})` : '')}
                                  </span>
                                </div>
                                {lic.creadoEn && (
                                  <div className="flex items-center gap-1.5 font-medium">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{new Date(lic.creadoEn).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {lic.archivoRuta && previewId === lic.id && (
                            <div className="mt-3 bg-slate-100 dark:bg-slate-700 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                              {lic.archivoRuta.toLowerCase().endsWith('.pdf') ? (
                                <div className="text-center p-4">
                                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Este archivo es un PDF. Haz clic abajo para abrirlo.</p>
                                </div>
                              ) : brokenThumbIds[lic.id] ? (
                                <div className="flex flex-col items-center justify-center py-6 px-4 text-center rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-600 mb-3">
                                  <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-300 mb-2.5">
                                    <ImageOff className="w-5 h-5" />
                                  </div>
                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    Imagen no disponible en el servidor
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                                    El archivo adjunto fue eliminado o movido del almacenamiento.
                                  </p>
                                </div>
                              ) : (
                                <div className="flex justify-center mb-4">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEvidenciaVisor({
                                        url: lic.archivoRuta,
                                        titulo: `Certificado ${lic.numeroCertificado || 'S/N'}`,
                                      })
                                    }
                                    className="group relative rounded border border-slate-300 shadow-sm overflow-hidden cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    title="Toca para ampliar con zoom táctil"
                                  >
                                    <img 
                                      src={lic.archivoRuta} 
                                      alt="Certificado" 
                                      onError={() => setBrokenThumbIds((prev) => ({ ...prev, [lic.id]: true }))}
                                      className="max-h-64 object-contain"
                                    />
                                  </button>
                                </div>
                              )}
                              {!brokenThumbIds[lic.id] && (
                                <div className="flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEvidenciaVisor({
                                        url: lic.archivoRuta,
                                        titulo: `Certificado ${lic.numeroCertificado || 'S/N'}`,
                                      })
                                    }
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                    <span>VER EN TAMAÑO GIGANTE</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reutilizamos el NuevoCittModal pero en MODO EDICIÓN */}
      <NuevoCittModal
        isOpen={!!licenciaEditando}
        onClose={() => setLicenciaEditando(null)}
        onSuccess={() => {
          fetchDetalles(); // Recargar historial local
          onRefreshParent(); // Avisar al dashboard que hubo cambios (días calculados)
        }}
        trabajadorFijo={trabajadorInfoFijo}
        editData={licenciaEditando}
      />

      {/* Visor interactivo en pantalla completa con gestos pinch-to-zoom y botón Volver */}
      <VisorEvidenciaModal
        isOpen={!!evidenciaVisor}
        url={evidenciaVisor?.url || null}
        titulo={evidenciaVisor?.titulo}
        onClose={() => setEvidenciaVisor(null)}
      />
    </>
  );
}





