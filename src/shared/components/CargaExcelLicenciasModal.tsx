"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, X, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useBackHandler } from "@/shared/utils/appBackHandler";

interface CargaExcelLicenciasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CargaExcelLicenciasModal({ isOpen, onClose, onSuccess }: CargaExcelLicenciasModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useBackHandler(isOpen && !loading, onClose);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setResultado(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setResultado(null);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    try {
      const res = await fetch('/api/licencias/importar-excel', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setResultado({ success: true, ...data });
      } else {
        setResultado({ success: false, error: data.error });
      }
    } catch (err: any) {
      setResultado({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCerrar = () => {
    if (resultado?.success) {
      onSuccess();
      router.refresh();
    }
    setFiles([]);
    setResultado(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Importar CITT por Excel</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Sube múltiples archivos .xls (Exportados de EsSalud)</p>
            </div>
          </div>
          <button onClick={handleCerrar} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto">
          {!resultado ? (
            <>
              {/* Área de Drop / Input */}
              <div 
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">Haz clic aquí para seleccionar archivos</p>
                <p className="text-xs text-slate-500">Soporta múltiples archivos .xls, .xlsx</p>
                <input 
                  type="file" 
                  multiple 
                  accept=".xls,.xlsx" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>

              {/* Lista de Archivos Seleccionados */}
              {files.length > 0 && (
                <div className="mt-5">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Archivos seleccionados ({files.length}):</h4>
                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {files.map((file, i) => (
                      <li key={i} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 truncate">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="truncate text-slate-700 dark:text-slate-300">{file.name}</span>
                        </div>
                        <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-rose-500 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              {resultado.success ? (
                <>
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Importación Completada</h3>
                  <div className="flex justify-center gap-6 mb-6">
                    <div className="text-center">
                      <p className="text-3xl font-black text-emerald-600">{resultado.procesados}</p>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Insertados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black text-rose-500">{resultado.omitidos}</p>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Omitidos / Duplicados</p>
                    </div>
                  </div>
                  
                  {/* Lista de Detalles */}
                  <div className="text-left bg-slate-50 dark:bg-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto text-xs space-y-1">
                    {resultado.detalles?.map((det: any, idx: number) => (
                      <div key={idx} className={`flex items-start gap-2 ${det.status === 'error' ? 'text-rose-600' : det.status === 'skipped' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        <span>•</span>
                        <span><strong>{det.dni}</strong>: {det.message} ({det.file})</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Error de Importación</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{resultado.error}</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50 mt-auto">
          <button 
            onClick={handleCerrar}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {resultado ? "Cerrar" : "Cancelar"}
          </button>
          
          {!resultado && (
            <button 
              onClick={handleUpload}
              disabled={files.length === 0 || loading}
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
              ) : (
                <><UploadCloud className="w-4 h-4" /> Importar Datos</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
