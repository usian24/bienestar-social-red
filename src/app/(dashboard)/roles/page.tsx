"use client";

import { useEffect, useState } from "react";
import { Shield, PlusCircle, Trash2, X, Pencil, Users, Heart, Settings, FileText, Folder, Terminal, Bot, Info } from "lucide-react";
import { useSession } from "next-auth/react";
import { PERMISOS_DESCRIPCION, Permiso } from '@/shared/utils/permisos';

export default function RolesPage() {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    nombre: string; descripcion: string; permisos: string[]
  }>({
    nombre: '', descripcion: '', permisos: []
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) setRoles(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/roles')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (active) setRoles(data);
        }
      })
      .catch((e) => console.error(e));
    return () => { active = false; };
  }, []);

  const handleOpenModal = (rol?: any) => {
    setErrorMsg('');
    if (rol) {
      setIsEditing(true);
      setEditId(rol.id);
      setFormData({
        nombre: rol.nombre,
        descripcion: rol.descripcion || '',
        permisos: rol.permisos || []
      });
    } else {
      setIsEditing(false);
      setEditId(null);
      setFormData({
        nombre: '', descripcion: '', permisos: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const url = isEditing ? `/api/roles/${editId}` : '/api/roles';
      const method = isEditing ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error guardando rol');
      }
      
      await fetchRoles();
      setIsModalOpen(false);
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este rol?')) return;
    try {
      const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error eliminando rol');
      }
      fetchRoles();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" /> Roles y Permisos Principales
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Crea roles y dales los poderes principales. Al crear un usuario, le asignarás uno de estos roles.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm whitespace-nowrap"
        >
          <PlusCircle className="w-4 h-4" /> Nuevo Rol
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4 text-center">Poderes Asignados</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {roles.map((rol) => (
                <tr key={rol.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {rol.nombre}
                    </span>
                    {rol.esFijo && <span className="ml-2 text-[10px] uppercase font-bold text-rose-500 bg-rose-50 px-1.5 rounded">FIJO</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                    {rol.descripcion || '-'}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">
                    {rol.nombre === 'SUPER_ADMIN' ? (
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">ACCESO TOTAL</span>
                    ) : (
                      <span className="font-semibold text-blue-600">{rol.permisos.length}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleOpenModal(rol)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Editar rol"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {!rol.esFijo && (
                      <button
                        onClick={() => handleDelete(rol.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Eliminar rol"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No hay roles registrados en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                {isEditing ? 'Editar Rol' : 'Crear Nuevo Rol'}
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
                {/* Columna Izquierda: Datos Básicos */}
                <div className="space-y-4 lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-700 pb-6 lg:pb-0 lg:pr-6">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">Información del Rol</h3>
                  
                  {isEditing && roles.find(r => r.id === editId)?.esFijo && (
                    <div className="text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Rol base del sistema:</strong> Puedes agregar o quitar poderes libremente y actualizar la descripción. El nombre clave interno se mantiene protegido.
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nombre del Rol (Ej: JEFE_RECURSOS_HUMANOS)</label>
                    <input 
                      required type="text"
                      disabled={isEditing && roles.find(r => r.id === editId)?.esFijo}
                      value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value.toUpperCase().replace(/\s+/g, '_')})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-blue-500 text-slate-800 dark:text-slate-100 disabled:opacity-60 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Descripción</label>
                    <textarea 
                      rows={3}
                      value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-blue-500 text-slate-800 dark:text-slate-100"
                      placeholder="Para qué sirve este rol..."
                    />
                  </div>
                </div>

                {/* Columna Derecha: Permisos Principales del Rol */}
                <div className="space-y-4 lg:col-span-8">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-2">Poderes Asignados (Haz clic para dar poder al rol)</h3>
                  
                  {roles.find(r => r.id === editId)?.nombre === 'SUPER_ADMIN' ? (
                    <div className="text-sm text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md font-medium border border-blue-100 dark:border-blue-800 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>El Súper Administrador tiene acceso total al sistema. No puedes modificar sus poderes base.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                      
                      {/* Grupo 1: Recursos Humanos */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> Recursos Humanos
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {['VER_TRABAJADORES', 'EDITAR_TRABAJADORES', 'EXPORTAR_EXCEL_PERSONAL'].map(clave => {
                            const info = PERMISOS_DESCRIPCION[clave as Permiso];
                            if (!info) return null;
                            const isActive = formData.permisos.includes(clave);
                            return (
                              <button
                                key={clave} type="button"
                                onClick={() => {
                                  if (isActive) setFormData({ ...formData, permisos: formData.permisos.filter(p => p !== clave) });
                                  else setFormData({ ...formData, permisos: [...formData.permisos, clave] });
                                }}
                                className={`group relative inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isActive ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-400 shadow-sm dark:bg-blue-900/50 dark:text-blue-300 dark:ring-blue-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              >
                                {info.titulo}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
                                  {info.descripcion}<div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
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
                            const isActive = formData.permisos.includes(clave);
                            return (
                              <button
                                key={clave} type="button"
                                onClick={() => {
                                  if (isActive) setFormData({ ...formData, permisos: formData.permisos.filter(p => p !== clave) });
                                  else setFormData({ ...formData, permisos: [...formData.permisos, clave] });
                                }}
                                className={`group relative inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isActive ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400 shadow-sm dark:bg-indigo-900/50 dark:text-indigo-300 dark:ring-indigo-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              >
                                {info.titulo}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
                                  {info.descripcion}<div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
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
                            const isActive = formData.permisos.includes(clave);
                            return (
                              <button
                                key={clave} type="button"
                                onClick={() => {
                                  if (isActive) setFormData({ ...formData, permisos: formData.permisos.filter(p => p !== clave) });
                                  else setFormData({ ...formData, permisos: [...formData.permisos, clave] });
                                }}
                                className={`group relative inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isActive ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-400 shadow-sm dark:bg-rose-900/50 dark:text-rose-300 dark:ring-rose-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              >
                                {info.titulo}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
                                  {info.descripcion}<div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
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
                            const isActive = formData.permisos.includes(clave);
                            return (
                              <button
                                key={clave} type="button"
                                onClick={() => {
                                  if (isActive) setFormData({ ...formData, permisos: formData.permisos.filter(p => p !== clave) });
                                  else setFormData({ ...formData, permisos: [...formData.permisos, clave] });
                                }}
                                className={`group relative inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isActive ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-400 shadow-sm dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              >
                                {info.titulo}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
                                  {info.descripcion}<div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
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
                            const isActive = formData.permisos.includes(clave);
                            return (
                              <button
                                key={clave} type="button"
                                onClick={() => {
                                  if (isActive) setFormData({ ...formData, permisos: formData.permisos.filter(p => p !== clave) });
                                  else setFormData({ ...formData, permisos: [...formData.permisos, clave] });
                                }}
                                className={`group relative inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isActive ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-400 shadow-sm dark:bg-amber-900/50 dark:text-amber-300 dark:ring-amber-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              >
                                {info.titulo}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
                                  {info.descripcion}<div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
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
                            const isActive = formData.permisos.includes(clave);
                            return (
                              <button
                                key={clave} type="button"
                                onClick={() => {
                                  if (isActive) setFormData({ ...formData, permisos: formData.permisos.filter(p => p !== clave) });
                                  else setFormData({ ...formData, permisos: [...formData.permisos, clave] });
                                }}
                                className={`group relative inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isActive ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-400 shadow-sm dark:bg-purple-900/50 dark:text-purple-300 dark:ring-purple-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              >
                                {info.titulo}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
                                  {info.descripcion}<div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
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
                            const isActive = formData.permisos.includes(clave);
                            return (
                              <button
                                key={clave} type="button"
                                onClick={() => {
                                  if (isActive) setFormData({ ...formData, permisos: formData.permisos.filter(p => p !== clave) });
                                  else setFormData({ ...formData, permisos: [...formData.permisos, clave] });
                                }}
                                className={`group relative inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${isActive ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-400 shadow-sm dark:bg-sky-900/50 dark:text-sky-300 dark:ring-sky-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                              >
                                {info.titulo}
                                <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] font-normal text-left p-2 rounded-md shadow-xl z-50">
                                  {info.descripcion}<div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
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
                <button 
                  type="submit" 
                  disabled={saving || (roles.find(r => r.id === editId)?.nombre === 'SUPER_ADMIN')} 
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 transition-colors shadow-sm"
                >
                  {saving ? 'Guardando...' : (isEditing ? 'Actualizar Rol' : 'Crear Rol')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
