"use client";

import React, { useMemo } from 'react';
import { X, FileSpreadsheet, Download } from 'lucide-react';

interface PrevisualizadorExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  trabajador: any;
}

export default function PrevisualizadorExcelModal({ isOpen, onClose, trabajador }: PrevisualizadorExcelModalProps) {
  
  const rows = useMemo(() => {
    if (!trabajador || !trabajador.licencias || trabajador.licencias.length === 0) return [];

    let diasRedRestantes = 20;
    let totalSubsidioGlobal = 0;

    // Primer paso: pre-calcular total de subsidio global
    trabajador.licencias.forEach((lic: any) => {
      if (lic.origen === 'ESSALUD_CITT') {
         const redDays = Math.min(lic.diasOtorgados, diasRedRestantes);
         const subDays = lic.diasOtorgados - redDays;
         diasRedRestantes -= redDays;
         totalSubsidioGlobal += subDays;
      }
    });

    diasRedRestantes = 20; // reset
    const resultRows: any[] = [];

    // Segundo paso: generar filas
    trabajador.licencias.forEach((lic: any) => {
      // Las fechas de la BD llegan como strings ISO en UTC (ej: '2026-08-01T05:00:00.000Z')
      const dateInicio = new Date(lic.fechaInicio);
      const dateFin = new Date(lic.fechaFin);

      // Convertir a string de fecha respetando la zona horaria de Perú
      const fInicio = dateInicio.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
      const fFin = dateFin.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
      
      let redDaysUsed = 0;
      let subsidioDays = 0;
      let fin20Str = '';
      let subsidioInicioStr = '';

      if (lic.origen === 'ESSALUD_CITT') {
         redDaysUsed = Math.min(lic.diasOtorgados, diasRedRestantes);
         subsidioDays = lic.diasOtorgados - redDaysUsed;
         diasRedRestantes -= redDaysUsed;

         if (subsidioDays > 0) {
            const subStartObj = new Date(dateInicio.getTime());
            subStartObj.setDate(subStartObj.getDate() + redDaysUsed);
            subsidioInicioStr = subStartObj.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
            
            const fin20Obj = new Date(subStartObj.getTime());
            fin20Obj.setDate(fin20Obj.getDate() - 1);
            fin20Str = fin20Obj.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
         }
      }

      resultRows.push({
        nombres: (trabajador.apellidosNombres || '').toUpperCase(),
        cargo: (trabajador.cargo || '').toUpperCase(),
        condicion: (trabajador.condicionLaboral || '').toUpperCase(),
        establecimiento: (trabajador.establecimiento || '').toUpperCase(),
        dni: trabajador.dni,
        citt: lic.numeroCertificado,
        inicio: fInicio,
        fin: fFin,
        fin20: fin20Str,
        subsidio: subsidioInicioStr,
        totalCitt: lic.diasOtorgados,
        diasSubsidios: totalSubsidioGlobal,
        isRed: redDaysUsed > 0 // Para pintar de azito
      });
    });

    return resultRows;
  }, [trabajador]);

  if (!isOpen || !trabajador) return null;

  const handleDownload = () => {
    window.open(`/api/salud/excel/${trabajador.id}`, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-[1200px] border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
                Previsualización de Excel
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Historial de {trabajador.apellidosNombres}
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

        <div className="flex-1 overflow-auto p-6 bg-slate-100 dark:bg-slate-950">
            {rows.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                    Este trabajador no tiene licencias registradas para generar el Excel.
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-sm overflow-x-auto rounded-lg">
                    {/* Header estilo Excel */}
                    <div className="bg-[#4F81BD] text-white font-bold text-center py-3 text-lg border-b border-slate-300">
                        Historial de CITTs
                    </div>
                    <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
                    <thead>
                        <tr className="bg-[#4F81BD] text-white">
                        <th className="py-2 px-2 font-bold text-center border border-slate-300/30">N°</th>
                        <th className="py-2 px-2 font-bold border border-slate-300/30">APELLIDOS Y NOMBRES</th>
                        <th className="py-2 px-2 font-bold border border-slate-300/30">CARGO</th>
                        <th className="py-2 px-2 font-bold border border-slate-300/30">CONDICIÓN LABORAL</th>
                        <th className="py-2 px-2 font-bold border border-slate-300/30">ESTABLECIMIENTO</th>
                        <th className="py-2 px-2 font-bold text-center border border-slate-300/30">DNI</th>
                        <th className="py-2 px-2 font-bold border border-slate-300/30">CITT O CMP</th>
                        <th className="py-2 px-2 font-bold text-center border border-slate-300/30">FECHA DE INICIO</th>
                        <th className="py-2 px-2 font-bold text-center border border-slate-300/30">FECHA FIN</th>
                        <th className="py-2 px-2 font-bold text-center border border-slate-300/30">FIN 20 DÍAS (RED)</th>
                        <th className="py-2 px-2 font-bold text-center border border-slate-300/30">FECHA SUBSIDIO</th>
                        <th className="py-2 px-2 font-bold text-center border border-slate-300/30">TOTAL DE DIAS</th>
                        <th className="py-2 px-2 font-bold text-center border border-slate-300/30">DIAS SUBSIDIOS</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
                        {rows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            {/* Merge simulado para Nro, Nombres, Cargo, Condición, Establecimiento, Dni, Dias Subsidios */}
                            {i === 0 ? (
                                <>
                                    <td rowSpan={rows.length} className="py-1 px-2 text-center border border-slate-300 dark:border-slate-700 align-middle">1</td>
                                    <td rowSpan={rows.length} className="py-1 px-2 border border-slate-300 dark:border-slate-700 align-middle whitespace-normal min-w-[150px]">{r.nombres}</td>
                                    <td rowSpan={rows.length} className="py-1 px-2 border border-slate-300 dark:border-slate-700 align-middle whitespace-normal min-w-[150px]">{r.cargo}</td>
                                    <td rowSpan={rows.length} className="py-1 px-2 border border-slate-300 dark:border-slate-700 align-middle whitespace-normal">{r.condicion}</td>
                                    <td rowSpan={rows.length} className="py-1 px-2 border border-slate-300 dark:border-slate-700 align-middle whitespace-normal min-w-[150px]">{r.establecimiento}</td>
                                    <td rowSpan={rows.length} className="py-1 px-2 text-center border border-slate-300 dark:border-slate-700 align-middle">{r.dni}</td>
                                </>
                            ) : null}
                            
                            <td className="py-1 px-2 text-center border border-slate-300 dark:border-slate-700">{r.citt}</td>
                            <td className="py-1 px-2 text-center border border-slate-300 dark:border-slate-700">{r.inicio}</td>
                            <td className="py-1 px-2 text-center border border-slate-300 dark:border-slate-700">{r.fin}</td>
                            <td className="py-1 px-2 text-center border border-slate-300 dark:border-slate-700 font-medium text-emerald-600 dark:text-emerald-400">{r.fin20}</td>
                            <td className="py-1 px-2 text-center border border-slate-300 dark:border-slate-700 font-medium text-rose-600 dark:text-rose-400">{r.subsidio}</td>
                            
                            <td className={`py-1 px-2 text-center border border-slate-300 dark:border-slate-700 font-bold ${r.isRed ? 'bg-[#D9E1F2] text-slate-900' : ''}`}>
                                {r.totalCitt}
                            </td>

                            {i === 0 ? (
                                <td rowSpan={rows.length} className="py-1 px-2 text-center border border-slate-300 dark:border-slate-700 align-middle font-bold text-lg">
                                    {r.diasSubsidios}
                                </td>
                            ) : null}
                        </tr>
                        ))}
                    </tbody>
                    </table>
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
            disabled={rows.length === 0}
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
