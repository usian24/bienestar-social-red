'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Heart, Search, Home, Moon, Sun, Shield, Settings, Users, LogOut, ChevronLeft, Bell, Activity, FileText, FolderOpen, Terminal, X, Brain, BookOpen } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { tienePermiso } from '@/shared/utils/permisos';
import { useBackHandler } from '@/shared/utils/appBackHandler';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useBackHandler(isMobileMenuOpen, () => setIsMobileMenuOpen(false));
  const [busquedaMenu, setBusquedaMenu] = useState('');
  
  const showMenu = (name: string) => {
    if (!busquedaMenu) return true;
    return name.toLowerCase().includes(busquedaMenu.toLowerCase());
  };
  const [logoError, setLogoError] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  
  const { data: session, status } = useSession();
  const sessionRol = (session?.user as any)?.rol as string | undefined;
  const rol = sessionRol || 'CONSULTA';
  const permisos = (session?.user as any)?.permisos || [];
  const isSuperAdmin = rol === 'SUPER_ADMIN';
  const pathname = usePathname();

  useEffect(() => {
    // Al cargar la app, comprobar si ya está en dark mode dentro de rAF (sin setState síncrono)
    const rafId = requestAnimationFrame(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setDarkMode(isDark);
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && sessionRol && sessionRol !== 'TRABAJADOR') {
      fetch('/api/alertas')
        .then(res => (res.ok ? res.json() : []))
        .then(data => {
          if (Array.isArray(data)) setAlertCount(data.length);
        })
        .catch(e => console.error(e));
    }
  }, [status, sessionRol]);

  const handleCerrarSesion = async () => {
    try {
      await signOut({ redirect: false });
    } catch (e) {
      console.error('Error al cerrar sesión', e);
    } finally {
      window.location.href = '/login';
    }
  };

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  };

  return (
    <div className={`flex h-screen bg-[#f4f7fb] dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 text-sm antialiased overflow-hidden print:overflow-visible print:bg-white print:h-auto print:block transition-colors duration-300`}>
      {/* Sidebar Lateral para Escritorio (Oculto en móvil) */}
      <aside className={`hidden md:flex ${isSidebarOpen ? 'w-56' : 'w-16'} bg-[#f4f7fb] dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex-col shrink-0 h-full print:hidden transition-all duration-300 overflow-x-hidden`}>
        <div className={`py-4 flex items-center px-4 pt-4 ${isSidebarOpen ? 'gap-3' : 'justify-center'}`}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className={`flex-1 flex justify-center mt-2 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
            {!logoError ? (
              <img 
                src="/images/logo-red-huanuco.png" 
                alt="Logo Red" 
                onError={() => setLogoError(true)}
                className="h-24 object-contain"
              />
            ) : (
              <div className="w-[80px] h-[80px] rounded-full border-2 border-blue-300 flex flex-col items-center justify-center bg-[#f4f7fb] dark:bg-slate-800 text-[8px] text-blue-700 dark:text-blue-400 font-bold leading-tight shrink-0">
                 <Heart className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-0.5" />
                 RED DE
              </div>
            )}
          </div>
        </div>

        <div className={`px-4 mt-6 mb-4 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar menú..." 
              value={busquedaMenu}
              onChange={(e) => setBusquedaMenu(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded pl-9 pr-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 shadow-sm dark:text-white transition-colors duration-300"
            />
          </div>
        </div>

        <nav className={`space-y-1 mt-2 ${isSidebarOpen ? 'px-3' : 'px-2'}`}>
          {showMenu('Inicio') && (
            <Link href="/inicio" className={`flex items-center rounded font-medium transition-colors ${isSidebarOpen ? 'gap-3 px-3 py-2' : 'justify-center p-3'} ${pathname === "/inicio" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`} title="Inicio">
              <Home className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
              {isSidebarOpen && <span>Inicio</span>}
            </Link>
          )}
        </nav>

        {showMenu('Personal') && tienePermiso(permisos, rol, 'VER_TRABAJADORES') && (
          <>
            {isSidebarOpen && (
              <div className="px-6 pt-4 pb-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2 whitespace-nowrap overflow-hidden text-ellipsis">
                Recursos Humanos
              </div>
            )}
            <nav className={`space-y-1 ${isSidebarOpen ? 'px-3' : 'px-2 mt-4'}`}>
              <div className={`flex items-center rounded text-slate-900 dark:text-slate-100 font-medium ${isSidebarOpen ? 'gap-3 px-3 py-2' : 'justify-center p-3'}`} title="Directorio">
                <Users className="w-5 h-5 text-slate-800 dark:text-slate-200 fill-slate-800 dark:fill-slate-200 shrink-0" />
                {isSidebarOpen && <span>Directorio</span>}
              </div>
              <div className={`${isSidebarOpen ? 'pl-9 pr-3 py-1 space-y-1' : 'flex flex-col gap-2 mt-2'}`}>
                <Link href="/personal" className={`block rounded-md text-sm font-medium transition-colors ${isSidebarOpen ? 'px-3 py-2' : 'text-center text-[10px] py-2'} ${pathname === "/personal" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`} title="Personal Activo">
                  {isSidebarOpen ? 'Personal Activo' : 'PER'}
                </Link>
              </div>
            </nav>
          </>
        )}

        {(showMenu('Salud') || showMenu('Maternidad') || showMenu('Paternidad')) && (tienePermiso(permisos, rol, 'VER_LICENCIAS') || tienePermiso(permisos, rol, 'GESTIONAR_LICENCIAS')) && (
          <>
            {isSidebarOpen && (
              <div className="px-6 pt-4 pb-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2 whitespace-nowrap overflow-hidden text-ellipsis">
                Trámites Essalud
              </div>
            )}
            
            <nav className={`space-y-1 ${isSidebarOpen ? 'px-3' : 'px-2 mt-4'}`}>
              <div className={`flex items-center rounded text-slate-900 dark:text-slate-100 font-medium ${isSidebarOpen ? 'gap-3 px-3 py-2' : 'justify-center p-3'}`} title="Licencias">
                <Heart className="w-5 h-5 text-slate-800 dark:text-slate-200 fill-slate-800 dark:fill-slate-200 shrink-0" />
                {isSidebarOpen && <span>Licencias</span>}
              </div>
              
              <div className={`${isSidebarOpen ? 'pl-9 pr-3 py-1 space-y-1' : 'flex flex-col gap-2 mt-2'}`}>
                {showMenu('Salud') && (
                  <Link href="/salud" className={`block rounded-md text-sm font-medium transition-colors ${isSidebarOpen ? 'px-3 py-2' : 'text-center text-[10px] py-2'} ${pathname === "/salud" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`} title="Salud">
                    {isSidebarOpen ? 'Salud' : 'SAL'}
                  </Link>
                )}
                {showMenu('Maternidad') && (
                  <Link href="/maternidad" className={`block rounded-md text-sm font-medium transition-colors ${isSidebarOpen ? 'px-3 py-2' : 'text-center text-[10px] py-2'} ${pathname === "/maternidad" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`} title="Maternidad">
                    {isSidebarOpen ? 'Maternidad' : 'MAT'}
                  </Link>
                )}
                {showMenu('Paternidad') && (
                  <Link href="/paternidad" className={`block rounded-md text-sm font-medium transition-colors ${isSidebarOpen ? 'px-3 py-2' : 'text-center text-[10px] py-2'} ${pathname === "/paternidad" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`} title="Paternidad">
                    {isSidebarOpen ? 'Paternidad' : 'PAT'}
                  </Link>
                )}
              </div>
            </nav>
          </>
        )}

        {tienePermiso(permisos, rol, 'ADMINISTRAR_USUARIOS') && (showMenu('Usuarios') || showMenu('Auditoría')) && (
          <>
            {isSidebarOpen ? (
              <div className="px-6 pt-4 pb-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2 border-t border-slate-200 dark:border-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">
                Administración
              </div>
            ) : (
              <div className="border-t border-slate-200 dark:border-slate-700 mx-3 mt-4 pt-4"></div>
            )}
            
            <nav className={`space-y-1 ${isSidebarOpen ? 'px-3' : 'px-2'}`}>
              <div className={`flex items-center rounded text-slate-900 dark:text-slate-100 font-medium ${isSidebarOpen ? 'gap-3 px-3 py-2' : 'justify-center p-3'}`} title="Configuración">
                <Settings className="w-5 h-5 text-slate-800 dark:text-slate-200 shrink-0" />
                {isSidebarOpen && <span>Configuración</span>}
              </div>
              <div className={`${isSidebarOpen ? 'pl-9 pr-3 py-1 space-y-1' : 'flex flex-col gap-2 mt-2'}`}>
                {showMenu('Usuarios') && (
                  <>
                    <Link href="/usuarios" className={`flex items-center rounded-md text-sm font-medium transition-colors ${isSidebarOpen ? 'gap-2 px-3 py-2' : 'justify-center p-2 text-[10px]'} ${pathname === "/usuarios" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`} title="Usuarios">
                      {!isSidebarOpen ? <Users className="w-4 h-4" /> : <><Users className="w-3.5 h-3.5 shrink-0" /> Usuarios</>}
                    </Link>
                    <Link href="/roles" className={`flex items-center rounded-md text-sm font-medium transition-colors ${isSidebarOpen ? 'gap-2 px-3 py-2' : 'justify-center p-2 text-[10px]'} ${pathname === "/roles" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`} title="Roles y Permisos">
                      {!isSidebarOpen ? <Shield className="w-4 h-4" /> : <><Shield className="w-3.5 h-3.5 shrink-0" /> Roles y Permisos</>}
                    </Link>
                  </>
                )}
                {(showMenu('Auditoría') || showMenu('Logs')) && (
                  <Link href="/auditoria" className={`flex items-center rounded-md text-sm font-medium transition-colors ${isSidebarOpen ? 'gap-2 px-3 py-2' : 'justify-center p-2 text-[10px]'} ${pathname === "/auditoria" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`} title="Logs y Auditoría">
                    {!isSidebarOpen ? <Activity className="w-4 h-4" /> : <><Activity className="w-3.5 h-3.5 shrink-0" /> Logs y Auditoría</>}
                  </Link>
                )}
              </div>
            </nav>
          </>
        )}

        {/* Sección Estadísticas e Inteligencia Predictiva */}
        {rol !== 'TRABAJADOR' && (
          <>
            {isSidebarOpen && (
              <div className="px-6 pt-4 pb-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2 border-t border-slate-200 dark:border-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">
                Inteligencia & Reportes
              </div>
            )}
            {!isSidebarOpen && <div className="border-t border-slate-200 dark:border-slate-700 mx-3 mt-4 pt-4"></div>}
            <nav className={`space-y-1 ${isSidebarOpen ? 'px-3' : 'px-2'}`}>
              {/* Enlace directo a Análisis Predictivo ML (accesible para Sede Admin y Super Admin) */}
              {showMenu('Análisis') && (
                <Link
                  href="/analisis"
                  className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
                    isSidebarOpen ? 'gap-3 px-3 py-2' : 'justify-center p-3'
                  } ${
                    pathname === "/analisis"
                      ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  title="Análisis Predictivo ML"
                >
                  <Brain className="w-5 h-5 text-blue-600 shrink-0" />
                  {isSidebarOpen && <span>Análisis Predictivo</span>}
                </Link>
              )}

              {/* Informes Oficiales en PDF/Excel (Estrictamente si tiene VER_REPORTES) */}
              {tienePermiso(permisos, rol, 'VER_REPORTES') && showMenu('Reportes') && (
                <Link
                  href="/reportes"
                  className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
                    isSidebarOpen ? 'gap-3 px-3 py-2' : 'justify-center p-3'
                  } ${
                    pathname === "/reportes"
                      ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  title="Informes Oficiales"
                >
                  <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0" />
                  {isSidebarOpen && <span>Informes Oficiales</span>}
                </Link>
              )}
            </nav>
          </>
        )}

        {tienePermiso(permisos, rol, 'VER_ARCHIVO_HISTORICO') && showMenu('Archivo') && (
        <>
          {isSidebarOpen && (
            <div className="px-6 pt-4 pb-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2 whitespace-nowrap overflow-hidden text-ellipsis">
              Documentación
            </div>
          )}
          <nav className={`space-y-1 ${isSidebarOpen ? 'px-3' : 'px-2 mt-4'}`}>
            <div className={`flex items-center rounded text-slate-900 dark:text-slate-100 font-medium ${isSidebarOpen ? 'gap-3 px-3 py-2' : 'justify-center p-3'}`} title="Archivo">
              <FolderOpen className="w-5 h-5 text-slate-800 dark:text-slate-200 shrink-0" />
              {isSidebarOpen && <span>Archivo</span>}
            </div>
            <div className={`${isSidebarOpen ? 'pl-9 pr-3 py-1 space-y-1' : 'flex flex-col gap-2 mt-2'}`}>
              <Link href="/archivo" className={`block rounded-md text-sm font-medium transition-colors ${isSidebarOpen ? 'px-3 py-2' : 'text-center text-[10px] py-2'} ${pathname === "/archivo" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`} title="Histórico">
                {isSidebarOpen ? 'Histórico' : 'ARC'}
              </Link>
            </div>
          </nav>
        </>
        )}

        {tienePermiso(permisos, rol, 'VER_LOGS') && (
        <>
          {isSidebarOpen ? (
            <div className="px-6 pt-4 pb-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2 border-t border-slate-200 dark:border-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">
              Sistema (Developer)
            </div>
          ) : (
            <div className="border-t border-slate-200 dark:border-slate-700 mx-3 mt-4 pt-4"></div>
          )}
          <nav className={`space-y-1 ${isSidebarOpen ? 'px-3' : 'px-2'}`}>
            <Link href="/logs" className={`flex items-center rounded-md text-sm font-medium transition-colors ${isSidebarOpen ? 'gap-3 px-3 py-2' : 'justify-center p-3'} ${pathname === "/logs" ? "bg-purple-50 text-purple-700 font-bold dark:bg-purple-900/30 dark:text-purple-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`} title="Terminal / Logs">
              <Terminal className={`shrink-0 ${isSidebarOpen ? 'w-5 h-5' : 'w-5 h-5'}`} />
              {isSidebarOpen && <span>Terminal / Logs</span>}
            </Link>
          </nav>
        </>
        )}

        {/* Enlace directo al Manual de Usuario según el Rol */}
        {rol !== 'TRABAJADOR' && (
          <div className={`mt-auto ${isSidebarOpen ? 'px-3 mb-1' : 'px-2 mb-1'}`}>
            <a 
              href={isSuperAdmin ? '/manuales/Manual_Usuario_Super_Admin_RedSaludHco.pdf' : '/manuales/Manual_Usuario_Admin_Microred_RedSaludHco.pdf'}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 font-medium transition-colors ${isSidebarOpen ? 'gap-3 w-full px-3 py-2 text-xs' : 'justify-center w-full p-2.5'}`}
              title={isSuperAdmin ? 'Manual Oficial Super Admin (PDF)' : 'Manual Oficial Microred (PDF)'}
            >
              <BookOpen className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              {isSidebarOpen && <span className="truncate">{isSuperAdmin ? 'Manual Super Admin' : 'Manual Microred'}</span>}
            </a>
          </div>
        )}

        <div className={`mb-2 ${isSidebarOpen ? 'p-4 pt-1' : 'p-2 pt-1'}`}>
          <button 
            onClick={handleCerrarSesion}
            className={`flex items-center rounded-lg text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 font-medium transition-colors ${isSidebarOpen ? 'gap-3 w-full px-3 py-2.5' : 'justify-center w-full p-3'}`}
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Backdrop del Menú Móvil */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Drawer Móvil Deslizable (App Style) */}
      <aside className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#f4f7fb] dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 shadow-2xl flex flex-col md:hidden transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Cabecera del Drawer */}
        <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/logo-red-huanuco.png" alt="Logo" className="w-10 h-10 object-contain" />
            <div>
              <div className="font-bold text-sm text-slate-800 dark:text-white leading-tight">Red de Salud Huánuco</div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Bienestar Social</div>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador de menú móvil */}
        <div className="px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar sección..." 
              value={busquedaMenu}
              onChange={(e) => setBusquedaMenu(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-2 py-2 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Links de navegación móvil */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Inicio */}
          {showMenu('Inicio') && (
            <Link 
              href="/inicio" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${pathname === "/inicio" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            >
              <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Inicio</span>
            </Link>
          )}

          {/* Directorio de Personal */}
          {showMenu('Personal') && tienePermiso(permisos, rol, 'VER_TRABAJADORES') && (
            <div className="space-y-1">
              <div className="px-3 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Recursos Humanos</div>
              <Link 
                href="/personal" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${pathname === "/personal" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
              >
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Personal Activo</span>
              </Link>
            </div>
          )}

          {/* Trámites Essalud */}
          {(showMenu('Salud') || showMenu('Maternidad') || showMenu('Paternidad')) && (tienePermiso(permisos, rol, 'VER_LICENCIAS') || tienePermiso(permisos, rol, 'GESTIONAR_LICENCIAS')) && (
            <div className="space-y-1">
              <div className="px-3 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trámites Essalud</div>
              {showMenu('Salud') && (
                <Link 
                  href="/salud" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${pathname === "/salud" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}
                >
                  <Heart className="w-4 h-4 text-rose-500" /> Salud
                </Link>
              )}
              {showMenu('Maternidad') && (
                <Link 
                  href="/maternidad" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${pathname === "/maternidad" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}
                >
                  <Heart className="w-4 h-4 text-pink-500" /> Maternidad
                </Link>
              )}
              {showMenu('Paternidad') && (
                <Link 
                  href="/paternidad" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${pathname === "/paternidad" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}
                >
                  <Heart className="w-4 h-4 text-sky-500" /> Paternidad
                </Link>
              )}
            </div>
          )}

          {/* Administración */}
          {tienePermiso(permisos, rol, 'ADMINISTRAR_USUARIOS') && (showMenu('Usuarios') || showMenu('Auditoría')) && (
            <div className="space-y-1">
              <div className="px-3 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Administración</div>
              {showMenu('Usuarios') && (
                <>
                  <Link 
                    href="/usuarios" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${pathname === "/usuarios" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}
                  >
                    <Users className="w-4 h-4 text-slate-500" /> Usuarios
                  </Link>
                  <Link 
                    href="/roles" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${pathname === "/roles" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}
                  >
                    <Shield className="w-4 h-4 text-slate-500" /> Roles y Permisos
                  </Link>
                </>
              )}
              {(showMenu('Auditoría') || showMenu('Logs')) && (
                <Link 
                  href="/auditoria" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${pathname === "/auditoria" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}
                >
                  <Activity className="w-4 h-4 text-slate-500" /> Logs y Auditoría
                </Link>
              )}
            </div>
          )}

          {/* Inteligencia & Estadísticas */}
          {rol !== 'TRABAJADOR' && (
            <div className="space-y-1">
              <div className="px-3 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Inteligencia & Reportes</div>
              <Link 
                href="/analisis" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname === "/analisis" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}
              >
                <Brain className="w-4 h-4 text-blue-600" /> Análisis Predictivo ML
              </Link>
              {tienePermiso(permisos, rol, 'VER_REPORTES') && showMenu('Reportes') && (
                <Link 
                  href="/reportes" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname === "/reportes" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}
                >
                  <FileText className="w-4 h-4 text-slate-500" /> Informes Oficiales
                </Link>
              )}
            </div>
          )}

          {/* Archivo Histórico */}
          {tienePermiso(permisos, rol, 'VER_ARCHIVO_HISTORICO') && showMenu('Archivo') && (
            <div className="space-y-1">
              <div className="px-3 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Documentación</div>
              <Link 
                href="/archivo" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname === "/archivo" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}
              >
                <FolderOpen className="w-4 h-4 text-amber-600" /> Archivo Histórico
              </Link>
            </div>
          )}

          {/* Terminal / Logs */}
          {tienePermiso(permisos, rol, 'VER_LOGS') && (
            <div className="space-y-1">
              <div className="px-3 pt-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sistema</div>
              <Link 
                href="/logs" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname === "/logs" ? "bg-purple-50 text-purple-700 font-bold dark:bg-purple-900/30 dark:text-purple-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}
              >
                <Terminal className="w-4 h-4 text-purple-600" /> Terminal / Logs
              </Link>
            </div>
          )}
        </div>

        {/* Enlace al Manual de Usuario en Móvil */}
        {rol !== 'TRABAJADOR' && (
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
            <a 
              href={isSuperAdmin ? '/manuales/Manual_Usuario_Super_Admin_RedSaludHco.pdf' : '/manuales/Manual_Usuario_Admin_Microred_RedSaludHco.pdf'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 text-xs font-semibold transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" /> {isSuperAdmin ? 'Manual Super Admin (PDF)' : 'Manual Microred (PDF)'}
            </a>
          </div>
        )}

        {/* Footer del Drawer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
          <button 
            onClick={handleCerrarSesion}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 text-sm font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenedor Principal (100% de ancho en móvil) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-slate-900 print:overflow-visible print:h-auto print:block transition-colors duration-300">
        {/* Barra Superior */}
        <header className="h-14 bg-white dark:bg-slate-900 px-4 md:px-6 flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-slate-800 shadow-xs z-10 print:hidden transition-colors duration-300">
          {/* Mobile: Hamburger + Título */}
          <div className="flex items-center gap-2.5 md:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 -ml-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Abrir Menú"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/images/logo-red-huanuco.png" alt="Logo" className="w-7 h-7 object-contain" />
              <span className="font-bold text-xs text-slate-800 dark:text-white leading-tight">
                Red Huánuco
              </span>
            </div>
          </div>

          {/* Desktop Spacer */}
          <div className="hidden md:block"></div>

          {/* Role Badge, Alertas, Dark Mode */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Role Badge */}
            <div className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider border ${isSuperAdmin ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' : rol === 'TRABAJADOR' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'}`}>
              {rol === 'TRABAJADOR' ? <Users className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
              <span className="truncate max-w-[80px] sm:max-w-none">{rol ? rol.replace(/_/g, ' ') : 'VISUALIZADOR'}</span>
            </div>

            <span className="text-[12px] sm:text-[13px] font-medium text-slate-600 dark:text-slate-300 hidden sm:inline">
              {rol === 'TRABAJADOR' ? 'PANEL PERSONAL' : isSuperAdmin ? 'SEDE RED SALUD' : 'GESTIÓN DE MICRORED'}
            </span>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>
            
            {/* Campana de Alertas */}
            {rol !== 'TRABAJADOR' && (
              <Link href="/inicio" className="relative p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <Bell className="w-5 h-5" />
                {alertCount > 0 && (
                  <span className="absolute top-1 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                )}
              </Link>
            )}
            
            {/* Toggle Tema Claro/Oscuro */}
            <button 
              onClick={toggleDarkMode}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 transition-colors"
              title="Cambiar tema Día / Noche"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600 fill-blue-600/20" />
              )}
            </button>
          </div>
        </header>

        {/* Contenido de la página (scrollable, con espacio inferior en móvil para la barra de navegación) */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-24 md:pb-6 print:overflow-visible print:p-0 print:m-0 print:block">
          {children}
        </main>

        {/* Barra de Navegación Inferior Móvil (Estilo App Nativa) */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around z-30 md:hidden shadow-lg print:hidden">
          <Link 
            href="/inicio" 
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${pathname === '/inicio' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">Inicio</span>
          </Link>
          {tienePermiso(permisos, rol, 'VER_TRABAJADORES') && (
            <Link 
              href="/personal" 
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${pathname === '/personal' ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 font-medium">Personal</span>
            </Link>
          )}
          {(tienePermiso(permisos, rol, 'VER_LICENCIAS') || tienePermiso(permisos, rol, 'GESTIONAR_LICENCIAS')) && (
            <Link 
              href="/salud" 
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${pathname.startsWith('/salud') ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <Heart className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 font-medium">Salud</span>
            </Link>
          )}
          {tienePermiso(permisos, rol, 'VER_REPORTES') && (
            <Link 
              href="/reportes" 
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 ${pathname.startsWith('/reportes') ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-[10px] mt-0.5 font-medium">Reportes</span>
            </Link>
          )}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-slate-500 dark:text-slate-400 hover:text-slate-800"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">Menú</span>
          </button>
        </nav>
      </div>
    </div>
  );
}



