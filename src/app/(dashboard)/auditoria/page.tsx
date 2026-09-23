"use client";

import { useEffect, useState } from "react";
import { Shield, Activity, Clock, User, FileText } from "lucide-react";
import { useSession } from "next-auth/react";

export default function AuditoriaPage() {
  const { data: session } = useSession();
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditoria();
  }, []);

  const fetchAuditoria = async () => {
    try {
      const res = await fetch('/api/auditoria?limite=100');
      if (res.ok) setRegistros(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if ((session?.user as any)?.rol !== 'SUPER_ADMIN') {
    return (
      <div className="p-8 flex items-center justify-center h-[50vh]">
        <div className="text-center text-slate-500">
          <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <h2 className="text-xl font-bold">Acceso Restringido</h2>
          <p>Solo el Súper Administrador puede ver el historial de auditoría.</p>
        </div>
      </div>
    );
  }

  const getActionColor = (accion: string) => {
    switch (accion) {
      case 'CREAR': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'EDITAR': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'ELIMINAR': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatDetalles = (detalles: string) => {
    try {
      const obj = JSON.parse(detalles);
      return (
        <div className="flex flex-wrap gap-2 mt-1.5 ml-6">
          {Object.entries(obj).map(([key, value]) => {
            if (value === null || value === undefined || value === '') return null;
            
            // Translate keys
            let keyName = key;
            if (key === 'tipoLicencia') keyName = 'Tipo';
            if (key === 'origen') keyName = 'Origen';
            if (key === 'numeroCertificado') keyName = 'N° Certificado';
            if (key === 'diasOtorgados') keyName = 'Días';
            if (key === 'nombres') keyName = 'Nombres';
            if (key === 'apellidos') keyName = 'Apellidos';
            if (key === 'rol') keyName = 'Rol';
            if (key === 'activo') keyName = 'Estado';
            
            // Format values
            let val = String(value);
            if (key === 'activo') val = value ? 'Activo' : 'Inactivo';
            if (key === 'origen' && val === 'ESSALUD_CITT') val = 'EsSalud';
            if (key === 'origen' && val === 'PARTICULAR') val = 'Particular';
            if (key === 'tipoLicencia' && val === 'ENFERMEDAD_COMUN') val = 'Enfermedad Común';

            return (
              <span key={key} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[11px]">
                <span className="font-semibold text-slate-500">{keyName}:</span>
                <span className="text-slate-700">{val}</span>
              </span>
            );
          })}
        </div>
      );
    } catch {
      return <span className="ml-6 text-slate-500 text-sm block mt-1">{detalles}</span>;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-600" /> Historial de Auditoría
        </h1>
        <p className="text-slate-500 mt-2">
          Registro inmutable de todas las acciones realizadas en el sistema (Últimos 100 movimientos).
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando registros...</div>
        ) : registros.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay registros de auditoría aún.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {registros.map((reg) => (
              <div key={reg.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border mt-1 shrink-0 ${getActionColor(reg.accion)}`}>
                    {reg.accion}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-700 text-sm">
                        {reg.usuario ? `${reg.usuario.nombres} ${reg.usuario.apellidos}` : 'Sistema'}
                      </span>
                      {reg.usuario?.rol === 'SUPER_ADMIN' && (
                        <Shield className="w-3 h-3 text-blue-500" />
                      )}
                      <span className="text-xs text-slate-400 font-mono">({reg.usuario?.dni || '---'})</span>
                    </div>
                    <div className="flex flex-col text-sm text-slate-600 mt-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="font-bold text-slate-700">Registro en el módulo {reg.modulo}</span>
                      </div>
                      {formatDetalles(reg.detalles)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0 md:text-right bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <Clock className="w-3 h-3" />
                  {new Date(reg.fecha).toLocaleString('es-PE')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

