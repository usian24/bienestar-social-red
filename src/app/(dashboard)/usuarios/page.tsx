"use client";

import { useEffect, useState } from "react";
import { 
  Users, PlusCircle, Shield, Trash2, X, Eye, EyeOff, Pencil, 
  Heart, Settings, FileText, Folder, Terminal, Bot, 
  CheckCircle2, Loader2, Lock, AlertCircle 
} from "lucide-react";
import { useSession } from "next-auth/react";
import { PERMISOS, PERMISOS_DESCRIPCION, Permiso } from '@/shared/utils/permisos';

export default function UsuariosPage() {
  const { data: session } = useSession();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [microredes, setMicroredes] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    dni: string; nombres: string; apellidos: string; password: string; rolId: string; microredId: string; permisosExtra: string[]
  }>({
    dni: '', nombres: '', apellidos: '', password: '', rolId: '', microredId: '', permisosExtra: []
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [trabajadorVinculado, setTrabajadorVinculado] = useState<any | null>(null);
  const [buscandoDni, setBuscandoDni] = useState(false);

  const selectedRol = roles.find(r => r.id === formData.rolId);

  const renderBotonPermiso = (clave: string) => {
    const info = PERMISOS_DESCRIPCION[clave as Permiso];
    if (!info) return null;
    const tienePorRol = selectedRol?.permisos?.includes(clave);
    const tieneExtra = formData.permisosExtra.includes(clave);

    if (tienePorRol) {
      return (
        <div
          key={clave}
          className="group relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs select-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>{info.titulo}</span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/50 px-1 rounded">Base</span>
          <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
            <p className="font-semibold text-emerald-300 mb-0.5">Poder incluido por Rol</p>
            {info.descripcion}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
          </div>
        </div>
      );
    }

    return (
      <button
        key={clave}
        type="button"
        onClick={() => {
          if (tieneExtra) {
            setFormData({ ...formData, permisosExtra: formData.permisosExtra.filter(p => p !== clave) });
          } else {
            setFormData({ ...formData, permisosExtra: [...formData.permisosExtra, clave] });
          }
        }}
        className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
          tieneExtra
            ? 'bg-purple-100 text-purple-800 border border-purple-400 shadow-xs dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-600 ring-1 ring-purple-300'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700 dark:border-slate-700'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${tieneExtra ? 'bg-purple-600' : 'bg-slate-400'}`}></span>
        <span>{info.titulo}</span>
        {tieneExtra ? (
          <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-200/80 dark:bg-purple-900/60 px-1 rounded">+ Extra</span>
        ) : (
          <span className="text-[10px] text-slate-400 font-normal">+</span>
        )}
        <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
          <p className={`font-semibold mb-0.5 ${tieneExtra ? 'text-purple-300' : 'text-slate-300'}`}>
            {tieneExtra ? 'Permiso Extra Otorgado' : 'Clic para conceder como permiso extra'}
          </p>
          {info.descripcion}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
        </div>
      </button>
    );
  };

  useEffect(() => {
    fetchUsuarios();
    fetchMicroredes();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) setRoles(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) setUsuarios(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMicroredes = async () => {
    try {
      const res = await fetch('/api/filtros');
      if (res.ok) {
        const data = await res.json();
        console.log("Microredes cargadas:", data);
        setMicroredes(data);
      }
    } catch (e) {
      console.error("Error al cargar microredes:", e);
    }
  };

  const handleDniChange = async (val: string) => {
    const dniLimpio = val.replace(/\D/g, '').slice(0, 8);
    setFormData(prev => ({ ...prev, dni: dniLimpio }));

    if (dniLimpio.length === 8) {
      setBuscandoDni(true);
      try {
        const res = await fetch(`/api/trabajadores/buscar?q=${dniLimpio}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.trabajadores || []);
          const encontrado = list.find((t: any) => String(t.dni).trim() === dniLimpio);
          if (encontrado) {
            setTrabajadorVinculado(encontrado);
            setFormData(prev => ({
              ...prev,
              nombres: encontrado.nombres || '',
              apellidos: encontrado.apellidos || '',
              microredId: encontrado.establecimiento?.microredId?.toString() || encontrado.establecimiento?.microred?.id?.toString() || prev.microredId
            }));
            return;
          }
        }
      } catch (err) {
        console.error("Error buscando trabajador por DNI:", err);
      } finally {
        setBuscandoDni(false);
      }
    }
    setTrabajadorVinculado(null);
  };

  const handleRolChange = (newRolId: string) => {
    setFormData(prev => ({ ...prev, rolId: newRolId, permisosExtra: [] }));
    if (formData.dni.length === 8) {
      handleDniChange(formData.dni);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({ dni: '', nombres: '', apellidos: '', password: '', rolId: '', microredId: '', permisosExtra: [] });
    setTrabajadorVinculado(null);
    setBuscandoDni(false);
    setIsModalOpen(true);
    setErrorMsg('');
  };

  const handleOpenEdit = async (u: any) => {
    setIsEditing(true);
    setEditId(u.id);
    setFormData({ 
      dni: u.dni, 
      nombres: u.nombres, 
      apellidos: u.apellidos, 
      password: '', // En blanco por seguridad, si escriben se cambia
      rolId: u.rol?.id || '', 
      microredId: u.microred?.id?.toString() || '',
      permisosExtra: u.permisosExtra || []
    });
    setTrabajadorVinculado(null);
    setIsModalOpen(true);
    setErrorMsg('');

    if (u.dni && u.dni.length === 8) {
      try {
        const res = await fetch(`/api/trabajadores/buscar?q=${u.dni}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.trabajadores || []);
          const exacto = list.find((t: any) => String(t.dni).trim() === u.dni);
          if (exacto) setTrabajadorVinculado(exacto);
        }
      } catch (e) {}
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const url = isEditing ? `/api/usuarios/${editId}` : '/api/usuarios';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al guardar');
      }
      setIsModalOpen(false);
      fetchUsuarios();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas desactivar este usuario? (Desaparecerá de esta lista)')) return;
    try {
      const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsuarios();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Error al desactivar el usuario');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando usuarios...</div>;

  const usuariosActivos = usuarios.filter(u => u.activo);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Gestión de Usuarios
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Crea, edita y administra credenciales para los Jefes de Microred</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <th className="py-3 px-4 font-semibold">DNI / Usuario</th>
              <th className="py-3 px-4 font-semibold">Nombres Completos</th>
              <th className="py-3 px-4 font-semibold">Rol</th>
              <th className="py-3 px-4 font-semibold">Microred Asignada</th>
              <th className="py-3 px-4 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {usuariosActivos.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">No hay usuarios creados.</td>
              </tr>
            ) : (
              usuariosActivos.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors bg-white dark:bg-slate-800">
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-200 font-medium">{u.dni}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {u.nombres} {u.apellidos}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded flex w-fit items-center gap-1 ${u.rol?.nombre === 'SUPER_ADMIN' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                      <Shield className="w-3 h-3" />
                      {u.rol?.nombre || 'SIN ROL'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-medium text-xs">
                    {u.microred?.nombre || (u.rol?.nombre === 'SUPER_ADMIN' ? 'SEDE RED SALUD (TODAS)' : '-')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="Editar Usuario"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {u.rol?.nombre !== 'SUPER_ADMIN' && (
                        <button 
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="Desactivar Cuenta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                {isEditing ? 'Editar Credencial' : 'Crear Nueva Credencial'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 flex flex-col max-h-[85vh]">
              {errorMsg && (
                <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded border border-red-200 dark:border-red-800 shrink-0">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto p-1">
                {/* Columna Izquierda: Datos del Usuario (Ocupa 4 de 12) */}
                <div className="space-y-4 lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-700 pb-6 lg:pb-0 lg:pr-6">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">
                    1. Configuración de la Cuenta
                  </h3>
                  
                  {/* Paso 1: Rol de Acceso PRIMERO */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Rol de Acceso <span className="text-blue-600">*</span>
                    </label>
                    <select 
                      required
                      value={formData.rolId} 
                      onChange={e => handleRolChange(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-blue-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value="">Seleccione un Rol...</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                    {selectedRol && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {selectedRol.descripcion || (selectedRol.nombre === 'SUPER_ADMIN' ? 'Control total del sistema' : `Rol con ${selectedRol.permisos?.length || 0} poderes base predefinidos.`)}
                      </p>
                    )}
                  </div>

                  {/* Paso 2: DNI del Servidor */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      DNI del Servidor (Usuario de acceso) <span className="text-blue-600">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        required maxLength={8} type="text"
                        disabled={isEditing} 
                        placeholder="Ej. 46516392 (8 dígitos)"
                        value={formData.dni} 
                        onChange={e => handleDniChange(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-blue-500 text-slate-800 dark:text-slate-100 disabled:opacity-60"
                      />
                      {buscandoDni && (
                        <div className="absolute right-3 top-2.5">
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        </div>
                      )}
                    </div>

                    {trabajadorVinculado && (
                      <div className="mt-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Servidor vinculado del Padrón</span>
                        </div>
                        <p className="text-emerald-700 dark:text-emerald-300 text-[11px] mt-0.5">
                          {trabajadorVinculado.cargo} • {trabajadorVinculado.establecimiento?.nombre} ({trabajadorVinculado.establecimiento?.microred?.nombre})
                        </p>
                        <span className="text-[10px] text-emerald-600/90 dark:text-emerald-400 flex items-center gap-1 mt-1">
                          <Lock className="w-3 h-3 shrink-0" />
                          <span>Datos y microred vinculados automáticamente según padrón oficial.</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Paso 3: Nombres */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Nombres</label>
                      {trabajadorVinculado && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                          <Lock className="w-3 h-3" /> Bloqueado (Padrón)
                        </span>
                      )}
                    </div>
                    <input 
                      required type="text"
                      readOnly={Boolean(trabajadorVinculado)}
                      value={formData.nombres} onChange={e => setFormData({...formData, nombres: e.target.value.toUpperCase()})}
                      className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-md px-3 py-2 text-sm text-slate-800 dark:text-slate-100 ${
                        trabajadorVinculado 
                          ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 cursor-not-allowed text-emerald-900 dark:text-emerald-100 font-medium'
                          : 'border-slate-200 dark:border-slate-700 focus:outline-blue-500'
                      }`}
                    />
                  </div>

                  {/* Paso 4: Apellidos */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Apellidos</label>
                      {trabajadorVinculado && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                          <Lock className="w-3 h-3" /> Bloqueado (Padrón)
                        </span>
                      )}
                    </div>
                    <input 
                      required type="text"
                      readOnly={Boolean(trabajadorVinculado)}
                      value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value.toUpperCase()})}
                      className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-md px-3 py-2 text-sm text-slate-800 dark:text-slate-100 ${
                        trabajadorVinculado 
                          ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 cursor-not-allowed text-emerald-900 dark:text-emerald-100 font-medium'
                          : 'border-slate-200 dark:border-slate-700 focus:outline-blue-500'
                      }`}
                    />
                  </div>

                  {/* Paso 5: Microred */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Microred Asignada</label>
                      {trabajadorVinculado && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                          <Lock className="w-3 h-3" /> Bloqueado (Padrón)
                        </span>
                      )}
                    </div>
                    <select 
                      value={formData.microredId} onChange={e => setFormData({...formData, microredId: e.target.value})}
                      disabled={selectedRol?.nombre === 'SUPER_ADMIN' || Boolean(trabajadorVinculado)}
                      className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-md px-3 py-2 text-sm text-slate-800 dark:text-slate-100 ${
                        trabajadorVinculado 
                          ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 cursor-not-allowed font-medium text-emerald-900 dark:text-emerald-100'
                          : 'border-slate-200 dark:border-slate-700 focus:outline-blue-500 disabled:opacity-50'
                      }`}
                    >
                      <option value="">Seleccione...</option>
                      {microredes.map(m => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Paso 6: Contraseña */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso'}
                    </label>
                    <div className="relative">
                      <input 
                        required={!isEditing} type={showPassword ? "text" : "password"}
                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                        placeholder={isEditing ? 'Déjalo en blanco para mantener la actual' : 'Mínimo 6 caracteres'}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md pl-3 pr-10 py-2 text-sm focus:outline-blue-500 text-slate-800 dark:text-slate-100"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Permisos y Poderes (Ocupa 8 de 12) */}
                <div className="space-y-4 lg:col-span-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Poderes y Permisos de la Cuenta
                      </h3>
                      <p className="text-xs text-slate-500">
                        {selectedRol ? (
                          <>Rol activo: <strong className="text-blue-600 dark:text-blue-400">{selectedRol.nombre}</strong> — Los poderes base se aplican automáticamente</>
                        ) : 'Selecciona un rol en la izquierda para ver sus poderes'}
                      </p>
                    </div>

                    {/* Leyenda visual */}
                    <div className="flex items-center gap-3 text-[11px] shrink-0">
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Base (Por Rol)
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-purple-700 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span> + Extra Concedido
                      </span>
                    </div>
                  </div>
                  
                  {roles.find(r => r.id === formData.rolId)?.nombre === 'SUPER_ADMIN' ? (
                    <div className="text-sm text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl font-medium border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                      <Shield className="w-6 h-6 text-blue-600 shrink-0" />
                      <div>
                        <p className="font-bold">Super Administrador — Control Total</p>
                        <p className="text-xs text-blue-600/80 dark:text-blue-300">Tiene acceso irrestricto a todas las funciones, módulos, microredes y configuraciones del sistema sin necesidad de permisos extra.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                      
                      {/* Grupo 1: Recursos Humanos */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> Recursos Humanos
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['VER_TRABAJADORES', 'EDITAR_TRABAJADORES', 'EXPORTAR_EXCEL_PERSONAL'].map(renderBotonPermiso)}
                        </div>
                      </div>

                      {/* Grupo 2: Trámites Essalud */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5" /> Trámites Essalud
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['VER_LICENCIAS', 'GESTIONAR_LICENCIAS', 'SUBIR_CITT', 'SUBIR_ARCHIVOS', 'EXPORTAR_PDF_TRAMITE'].map(renderBotonPermiso)}
                        </div>
                      </div>

                      {/* Grupo 3: Administración */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <Settings className="w-3.5 h-3.5" /> Administración
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['ADMINISTRAR_USUARIOS', 'VER_AUDITORIA', 'GESTIONAR_ESTABLECIMIENTOS'].map(renderBotonPermiso)}
                        </div>
                      </div>

                      {/* Grupo 4: Estadísticas */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Estadísticas
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['VER_REPORTES', 'EXPORTAR_EXCEL_MASIVO'].map(renderBotonPermiso)}
                        </div>
                      </div>

                      {/* Grupo 5: Documentación */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <Folder className="w-3.5 h-3.5" /> Documentación
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['VER_ARCHIVO_HISTORICO', 'ORDENAR_DOCUMENTOS'].map(renderBotonPermiso)}
                        </div>
                      </div>

                      {/* Grupo 6: Sistema Developer */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <Terminal className="w-3.5 h-3.5" /> Sistema (Developer)
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['VER_LOGS'].map(renderBotonPermiso)}
                        </div>
                      </div>

                      {/* Grupo 7: Inteligencia Artificial */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5 text-blue-500" /> Inteligencia Artificial
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['USAR_CHATBOT'].map(renderBotonPermiso)}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-100 dark:border-slate-700 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 transition-colors shadow-sm">
                  {saving ? 'Guardando...' : (isEditing ? 'Actualizar Credencial' : 'Crear Credencial')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}