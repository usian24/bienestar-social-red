"use client";

import { useEffect, useState } from "react";
import { Users, PlusCircle, Shield, Trash2, X, Eye, EyeOff, Pencil, Heart, Settings, FileText, Folder, Terminal, Bot } from "lucide-react";
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
  const [showPermisoDropdown, setShowPermisoDropdown] = useState(false);

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

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({ dni: '', nombres: '', apellidos: '', password: '', rolId: '', microredId: '', permisosExtra: [] });
    setIsModalOpen(true);
    setErrorMsg('');
  };

  const handleOpenEdit = (u: any) => {
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
    setIsModalOpen(true);
    setErrorMsg('');
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
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">Datos Básicos</h3>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">DNI (Usuario de acceso)</label>
                    <input 
                      required maxLength={8} type="text"
                      disabled={isEditing} 
                      value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value.replace(/\D/g, '')})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-blue-500 text-slate-800 dark:text-slate-100 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nombres</label>
                    <input 
                      required type="text"
                      value={formData.nombres} onChange={e => setFormData({...formData, nombres: e.target.value.toUpperCase()})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Apellidos</label>
                    <input 
                      required type="text"
                      value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value.toUpperCase()})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                    </label>
                    <div className="relative">
                      <input 
                        required={!isEditing} type={showPassword ? "text" : "password"}
                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                        placeholder={isEditing ? 'Déjalo en blanco para no cambiarla' : ''}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md pl-3 pr-10 py-2 text-sm focus:outline-blue-500 text-slate-800 dark:text-slate-100"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Rol de Acceso</label>
                    <select 
                      value={formData.rolId} onChange={e => {
                        setFormData({...formData, rolId: e.target.value, permisosExtra: []});
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-blue-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value="">Seleccione un Rol...</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Microred Asignada</label>
                    <select 
                      value={formData.microredId} onChange={e => setFormData({...formData, microredId: e.target.value})}
                      disabled={roles.find(r => r.id === formData.rolId)?.nombre === 'SUPER_ADMIN'}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-blue-500 disabled:opacity-50 text-slate-800 dark:text-slate-100"
                    >
                      <option value="">Seleccione...</option>
                      {microredes.map(m => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Columna Derecha: Permisos Excepcionales (Ocupa 8 de 12) */}
                <div className="space-y-4 lg:col-span-8">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">Permisos Excepcionales (Haz clic para activar/desactivar)</h3>
                  
                  {roles.find(r => r.id === formData.rolId)?.nombre === 'SUPER_ADMIN' ? (
                    <div className="text-sm text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md font-medium border border-blue-100 dark:border-blue-800">
                      🛡️ Los Súper Administradores tienen acceso total al sistema. No es necesario asignar permisos excepcionales.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                      
                      {/* Grupo 1: Recursos Humanos */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> Recursos Humanos
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['VER_TRABAJADORES', 'EDITAR_TRABAJADORES', 'EXPORTAR_EXCEL_PERSONAL'].map(clave => {
                            const info = PERMISOS_DESCRIPCION[clave as Permiso];
                            if (!info) return null;
                            const isActive = formData.permisosExtra.includes(clave);
                            return (
                              <button
                                key={clave}
                                type="button"
                                onClick={() => {
                                  if (isActive) setFormData({ ...formData, permisosExtra: formData.permisosExtra.filter(p => p !== clave) });
                                  else setFormData({ ...formData, permisosExtra: [...formData.permisosExtra, clave] });
                                }}
                                className={`group relative inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isActive ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-400 shadow-sm dark:bg-blue-900/50 dark:text-blue-300 dark:ring-blue-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              >
                                {info.titulo}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
                                  {info.descripcion}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Grupo 2: Trámites Essalud */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5" /> Trámites Essalud
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['VER_LICENCIAS', 'GESTIONAR_LICENCIAS', 'SUBIR_CITT', 'SUBIR_ARCHIVOS', 'EXPORTAR_PDF_TRAMITE'].map(clave => {
                            const info = PERMISOS_DESCRIPCION[clave as Permiso];
                            if (!info) return null;
                            const isActive = formData.permisosExtra.includes(clave);
                            return (
                              <button
                                key={clave}
                                type="button"
                                onClick={() => {
                                  if (isActive) setFormData({ ...formData, permisosExtra: formData.permisosExtra.filter(p => p !== clave) });
                                  else setFormData({ ...formData, permisosExtra: [...formData.permisosExtra, clave] });
                                }}
                                className={`group relative inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isActive ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400 shadow-sm dark:bg-indigo-900/50 dark:text-indigo-300 dark:ring-indigo-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              >
                                {info.titulo}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
                                  {info.descripcion}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Grupo 3: Administración */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <Settings className="w-3.5 h-3.5" /> Administración
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['ADMINISTRAR_USUARIOS', 'VER_AUDITORIA', 'GESTIONAR_ESTABLECIMIENTOS'].map(clave => {
                            const info = PERMISOS_DESCRIPCION[clave as Permiso];
                            if (!info) return null;
                            const isActive = formData.permisosExtra.includes(clave);
                            return (
                              <button
                                key={clave}
                                type="button"
                                onClick={() => {
                                  if (isActive) setFormData({ ...formData, permisosExtra: formData.permisosExtra.filter(p => p !== clave) });
                                  else setFormData({ ...formData, permisosExtra: [...formData.permisosExtra, clave] });
                                }}
                                className={`group relative inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isActive ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-400 shadow-sm dark:bg-rose-900/50 dark:text-rose-300 dark:ring-rose-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              >
                                {info.titulo}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
                                  {info.descripcion}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Grupo 4: Estadísticas */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Estadísticas
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['VER_REPORTES', 'EXPORTAR_EXCEL_MASIVO'].map(clave => {
                            const info = PERMISOS_DESCRIPCION[clave as Permiso];
                            if (!info) return null;
                            const isActive = formData.permisosExtra.includes(clave);
                            return (
                              <button
                                key={clave}
                                type="button"
                                onClick={() => {
                                  if (isActive) setFormData({ ...formData, permisosExtra: formData.permisosExtra.filter(p => p !== clave) });
                                  else setFormData({ ...formData, permisosExtra: [...formData.permisosExtra, clave] });
                                }}
                                className={`group relative inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isActive ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-400 shadow-sm dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              >
                                {info.titulo}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
                                  {info.descripcion}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Grupo 5: Documentación */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <Folder className="w-3.5 h-3.5" /> Documentación
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['VER_ARCHIVO_HISTORICO', 'ORDENAR_DOCUMENTOS'].map(clave => {
                            const info = PERMISOS_DESCRIPCION[clave as Permiso];
                            if (!info) return null;
                            const isActive = formData.permisosExtra.includes(clave);
                            return (
                              <button
                                key={clave}
                                type="button"
                                onClick={() => {
                                  if (isActive) setFormData({ ...formData, permisosExtra: formData.permisosExtra.filter(p => p !== clave) });
                                  else setFormData({ ...formData, permisosExtra: [...formData.permisosExtra, clave] });
                                }}
                                className={`group relative inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isActive ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-400 shadow-sm dark:bg-amber-900/50 dark:text-amber-300 dark:ring-amber-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              >
                                {info.titulo}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
                                  {info.descripcion}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Grupo 6: Sistema Developer */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <Terminal className="w-3.5 h-3.5" /> Sistema (Developer)
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['VER_LOGS'].map(clave => {
                            const info = PERMISOS_DESCRIPCION[clave as Permiso];
                            if (!info) return null;
                            const isActive = formData.permisosExtra.includes(clave);
                            return (
                              <button
                                key={clave}
                                type="button"
                                onClick={() => {
                                  if (isActive) setFormData({ ...formData, permisosExtra: formData.permisosExtra.filter(p => p !== clave) });
                                  else setFormData({ ...formData, permisosExtra: [...formData.permisosExtra, clave] });
                                }}
                                className={`group relative inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isActive ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-400 shadow-sm dark:bg-purple-900/50 dark:text-purple-300 dark:ring-purple-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              >
                                {info.titulo}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
                                  {info.descripcion}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Grupo 7: Inteligencia Artificial */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5 text-blue-500" /> Inteligencia Artificial
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['USAR_CHATBOT'].map(clave => {
                            const info = PERMISOS_DESCRIPCION[clave as Permiso];
                            if (!info) return null;
                            const isActive = formData.permisosExtra.includes(clave);
                            return (
                              <button
                                key={clave}
                                type="button"
                                onClick={() => {
                                  if (isActive) setFormData({ ...formData, permisosExtra: formData.permisosExtra.filter(p => p !== clave) });
                                  else setFormData({ ...formData, permisosExtra: [...formData.permisosExtra, clave] });
                                }}
                                className={`group relative inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isActive ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-400 shadow-sm dark:bg-sky-900/50 dark:text-sky-300 dark:ring-sky-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              >
                                {info.titulo}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
                                  {info.descripcion}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
                                </div>
                              </button>
                            );
                          })}
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