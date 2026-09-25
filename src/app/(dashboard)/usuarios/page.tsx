"use client";

import { useEffect, useState } from "react";
import { Users, PlusCircle, Shield, Trash2, X, Eye, EyeOff, Pencil } from "lucide-react";
import { useSession } from "next-auth/react";
import { PERMISOS, PERMISOS_DESCRIPCION, Permiso } from '@/shared/utils/permisos';

export default function UsuariosPage() {
  const { data: session } = useSession();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [microredes, setMicroredes] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    dni: string; nombres: string; apellidos: string; password: string; rol: string; microredId: string; permisos: string[]
  }>({
    dni: '', nombres: '', apellidos: '', password: '', rol: 'ADMIN_MICRORED', microredId: '', permisos: []
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchUsuarios();
    fetchMicroredes();
  }, []);

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
    setFormData({ dni: '', nombres: '', apellidos: '', password: '', rol: 'ADMIN_MICRORED', microredId: '', permisos: [] });
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
      rol: u.rol, 
      microredId: u.microred?.id?.toString() || '',
      permisos: u.permisos || []
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
                    <span className={`px-2 py-1 text-[10px] font-bold rounded flex w-fit items-center gap-1 ${u.rol === 'SUPER_ADMIN' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                      <Shield className="w-3 h-3" />
                      {u.rol}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-medium text-xs">
                    {u.microred?.nombre || (u.rol === 'SUPER_ADMIN' ? 'SEDE RED SALUD (TODAS)' : '-')}
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
                      {u.rol !== 'SUPER_ADMIN' && (
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
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                {isEditing ? 'Editar Credencial' : 'Crear Nueva Credencial'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded border border-red-200 dark:border-red-800">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">DNI (Usuario de acceso)</label>
                <input 
                  required maxLength={8} type="text"
                  disabled={isEditing} // No permitir cambiar DNI
                  value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value.replace(/\D/g, '')})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-blue-500 text-slate-800 dark:text-slate-100 disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Rol</label>
                  <select 
                    value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-blue-500 text-slate-800 dark:text-slate-100"
                  >
                    <option value="ADMIN_MICRORED">Administrador</option>
                    <option value="SUPER_ADMIN">Súper Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Microred Asignada</label>
                  <select 
                    value={formData.microredId} onChange={e => setFormData({...formData, microredId: e.target.value})}
                    disabled={formData.rol === 'SUPER_ADMIN'}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-blue-500 disabled:opacity-50 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Seleccione Microred...</option>
                    {microredes.map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Bloque de Permisos Avanzados */}
                <div className="col-span-1 md:col-span-2 mt-4">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                    Permisos Específicos (RBAC)
                  </label>
                  {formData.rol === 'SUPER_ADMIN' ? (
                    <div className="text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md font-medium">
                      🛡️ Los Súper Administradores tienen acceso total al sistema por defecto.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2">
                      {Object.entries(PERMISOS_DESCRIPCION).map(([clave, rawInfo]) => {
                        const info = rawInfo as { titulo: string, descripcion: string };
                        const isChecked = formData.permisos.includes(clave);
                        return (
                          <div key={clave} className="flex items-start gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 hover:border-blue-300 transition-colors">
                            <div className="flex items-center h-5 mt-0.5">
                              <input
                                type="checkbox"
                                id={`perm-${clave}`}
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, permisos: [...formData.permisos, clave] });
                                  } else {
                                    setFormData({ ...formData, permisos: formData.permisos.filter(p => p !== clave) });
                                  }
                                }}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </div>
                            <label htmlFor={`perm-${clave}`} className="flex flex-col cursor-pointer flex-1 select-none">
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">{info.titulo}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{info.descripcion}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 transition-colors">
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
