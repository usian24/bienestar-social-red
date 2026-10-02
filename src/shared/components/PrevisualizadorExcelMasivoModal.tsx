"use client";

import React, { useEffect, useState } from 'react';
import { X, FileSpreadsheet, Download, Loader2 } from 'lucide-react';

interface PrevisualizadorExcelMasivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    microred: string;
    establecimiento: string;
    condicionLaboral: string;
    tipoLicencia?: string;
    desde?: string;
    hasta?: string;
  };
}

export default function PrevisualizadorExcelMasivoModal({ isOpen, onClose, filters }: PrevisualizadorExcelMasivoModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const fetchPreview = async () => {
      setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams({
          microred: filters.microred,
          establecimiento: filters.establecimiento,
          condicionLaboral: filters.condicionLaboral,
          tipoLicencia: filters.tipoLicencia || '--TODOS--',
          desde: filters.desde || '',
          hasta: filters.hasta || '',
          preview: 'true'
        });
        const res = await fetch(`/api/salud/excel-masivo?${query.toString()}`);
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.error || 'Error al generar la previsualización');
        }
        const json = await res.json();
        setData(json);
        setActiveTab(0);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, JSON.stringify(filters)]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const query = new URLSearchParams({
      microred: filters.microred,
      establecimiento: filters.establecimiento,
      condicionLaboral: filters.condicionLaboral,
      tipoLicencia: filters.tipoLicencia || '--TODOS--',
      desde: filters.desde || '',
      hasta: filters.hasta || ''
    });
    window.open(`/api/salud/excel-masivo?${query.toString()}`, '_blank');
    onClose();
  };

  const currentSheet = data?.sheets?.[activeTab];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-[1400px] border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
                Previsualización de Excel Masivo
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Reporte Mensual Separado por Meses
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
              <p>Generando bloques mensuales...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-rose-500 p-6 text-center">
              {error}
            </div>
          ) : data && data.sheets && data.sheets.length > 0 ? (
            <>
              {/* TABS para las diferentes hojas (Microredes) */}
              {data.sheets.length > 1 && (
                <div className="flex overflow-x-auto border-b border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 px-2 pt-2">
                  {data.sheets.map((sheet: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTab(idx)}
                      className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors whitespace-nowrap ${activeTab === idx ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-t border-l border-r border-slate-300 dark:border-slate-700' : 'text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                    >
                      {sheet.name}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="flex-1 overflow-auto p-4 sm:p-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm overflow-x-auto rounded-lg pb-10">
                  <table className="w-full text-left border-collapse text-[10px] whitespace-nowrap">
                    <tbody>
                      {currentSheet.rows.map((row: any, rIdx: number) => {
                        if (row.type === 'title') {
                          return (
                            <tr key={rIdx}>
                              <td colSpan={14} className="py-3 px-2 text-center font-bold text-slate-900 border border-slate-300 text-xs" style={{ backgroundColor: row.bgColor }}>
                                {row.value}
                              </td>
                            </tr>
                          );
                        }
                        if (row.type === 'header') {
                          return (
                            <tr key={rIdx} className="bg-[#D9E1F2] text-slate-900">
                              {row.values.map((v: string, i: number) => {
                                if (v === '') return null; // Saltar la columna vacía usada para el colspan de Excel
                                return (
                                  <th key={i} className="py-2 px-2 font-bold text-center border border-slate-300" colSpan={v === 'FECHA SUBSIDIO' ? 2 : 1}>
                                    {v}
                                  </th>
                                );
                              })}
                            </tr>
                          );
                        }
                        if (row.type === 'worker') {
                          return row.chunks.map((chunk: any, cIdx: number) => (
                            <tr key={`${rIdx}-${cIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200">
                              {cIdx === 0 ? (
                                <>
                                  <td rowSpan={row.chunks.length} className="py-1.5 px-2 text-center border border-slate-300 dark:border-slate-700 align-middle">{chunk.nro}</td>
                                  <td rowSpan={row.chunks.length} className="py-1.5 px-2 border border-slate-300 dark:border-slate-700 align-middle whitespace-normal min-w-[150px]">{chunk.apellidosNombres}</td>
                                  <td rowSpan={row.chunks.length} className="py-1.5 px-2 border border-slate-300 dark:border-slate-700 align-middle whitespace-normal min-w-[120px]">{chunk.cargo}</td>
                                  <td rowSpan={row.chunks.length} className="py-1.5 px-2 border border-slate-300 dark:border-slate-700 align-middle whitespace-normal">{chunk.condicion}</td>
                                  <td rowSpan={row.chunks.length} className="py-1.5 px-2 border border-slate-300 dark:border-slate-700 align-middle whitespace-normal min-w-[120px]">{chunk.establecimiento}</td>
                                  <td rowSpan={row.chunks.length} className="py-1.5 px-2 text-center border border-slate-300 dark:border-slate-700 align-middle">{chunk.dni}</td>
                                </>
                              ) : null}
                              
                              <td className="py-1.5 px-2 text-center border border-slate-300 dark:border-slate-700">{chunk.citt}</td>
                              <td className="py-1.5 px-2 text-center border border-slate-300 dark:border-slate-700">{chunk.inicio}</td>
                              <td className="py-1.5 px-2 text-center border border-slate-300 dark:border-slate-700">{chunk.fin}</td>
                              <td className="py-1.5 px-2 text-center border border-slate-300 dark:border-slate-700 font-medium text-emerald-600 dark:text-emerald-400">{chunk.fin20Dias}</td>
                              <td className="py-1.5 px-2 text-center border border-slate-300 dark:border-slate-700 font-medium text-rose-600 dark:text-rose-400">{chunk.subsidioStart}</td>
                              <td className="py-1.5 px-2 text-center border border-slate-300 dark:border-slate-700 font-medium text-rose-600 dark:text-rose-400">{chunk.subsidioEnd}</td>
                              
                              <td className={`py-1.5 px-2 text-center border border-slate-300 dark:border-slate-700 font-bold ${chunk.isRed ? '!bg-[#D9E1F2] text-slate-900' : ''}`}>
                                {chunk.totalDias}
                              </td>

                              {cIdx === 0 ? (
                                <td rowSpan={row.chunks.length} className="py-1.5 px-2 text-center border border-slate-300 dark:border-slate-700 align-middle font-bold text-sm">
                                  {row.totalSubsidioMes}
                                </td>
                              ) : null}
                            </tr>
                          ));
                        }
                        return null;
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              No hay datos para exportar.
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDownload}
            disabled={loading || !!error || !data || !data.sheets || data.sheets.length === 0}
            className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Descargar Excel Ahora
          </button>
        </div>
      </div>
    </div>
  );
}
