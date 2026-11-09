"use client";

import { useEffect, useState, useRef } from "react";
import { Terminal, RefreshCw, Download, AlertTriangle } from "lucide-react";

export default function LogsPage() {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const cargarLogs = async () => {
    setErrorMsg('');
    try {
      const res = await fetch('/api/logs');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al obtener los logs');
      }
      const data = await res.json();
      setLogs(data.logs);
      
      // Auto-scroll al final
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = () => {
    setLoading(true);
    void cargarLogs();
  };

  useEffect(() => {
    let active = true;
    fetch('/api/logs')
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Error al obtener los logs');
        }
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setLogs(data.logs);
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      })
      .catch((error: any) => {
        if (active) setErrorMsg(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const downloadLogs = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_logs_${new Date().toISOString().split('T')[0]}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 max-w-full overflow-hidden h-[85vh] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Terminal className="w-6 h-6 text-purple-600 dark:text-purple-400" /> Sistema (Developer Logs)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Consola en tiempo real de errores, alertas y eventos críticos del sistema.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm font-medium text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
          
          <button
            onClick={downloadLogs}
            disabled={!logs || loading}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors shadow-sm font-medium text-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Exportar .log
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-3 shrink-0">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      ) : (
        <div className="flex-1 bg-[#1E1E1E] rounded-xl shadow-lg border border-slate-700/50 overflow-hidden flex flex-col">
          <div className="bg-[#2D2D2D] px-4 py-2 border-b border-[#404040] flex items-center gap-2 shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="ml-2 text-xs font-mono text-slate-400">system.log - {logs ? logs.split('\n').length : 0} lineas</span>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1 font-mono text-xs sm:text-sm text-slate-300 whitespace-pre-wrap break-all">
            {loading && !logs ? (
              <span className="text-slate-500 animate-pulse">Obteniendo logs del sistema...</span>
            ) : !logs ? (
              <span className="text-slate-500 italic">No hay logs registrados aún en el servidor.</span>
            ) : (
              logs.split('\n').map((line, i) => {
                // Colorear lineas segun el nivel
                let colorClass = 'text-slate-300';
                if (line.includes('[ERROR]')) colorClass = 'text-red-400 font-bold';
                else if (line.includes('[WARN]')) colorClass = 'text-amber-400 font-bold';
                else if (line.includes('[INFO]')) colorClass = 'text-blue-300';
                else if (line.includes('[DEBUG]')) colorClass = 'text-slate-500';
                
                return (
                  <div key={i} className={`hover:bg-[#2D2D2D]/50 px-1 rounded transition-colors ${colorClass}`}>
                    {line}
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  );
}
