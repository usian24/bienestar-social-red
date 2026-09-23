'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Heart, Search, Home, Moon, Sun, Shield, Settings, Users, LogOut, ChevronLeft, Bell, Activity } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [busquedaMenu, setBusquedaMenu] = useState('');
  
  const showMenu = (name: string) => {
    if (!busquedaMenu) return true;
    return name.toLowerCase().includes(busquedaMenu.toLowerCase());
  };
  const [logoError, setLogoError] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.rol === 'SUPER_ADMIN';
  const pathname = usePathname();

  useEffect(() => {
    // Al cargar la app, comprobar si ya está en dark mode
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
    
    // Fetch alertas
    fetch('/api/alertas').then(res => res.json()).then(data => {
      if(Array.isArray(data)) setAlertCount(data.length);
    }).catch(e => console.error(e));
  }, []);

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
      {/* Sidebar Lateral */}
      <aside className={`${isSidebarOpen ? 'w-56' : 'w-16'} bg-[#f4f7fb] dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 h-full print:hidden transition-all duration-300 overflow-x-hidden`}>
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
          {showMenu('Personal') && (
            <Link href="/personal" className={`flex items-center rounded font-medium transition-colors ${isSidebarOpen ? 'gap-3 px-3 py-2' : 'justify-center p-3'} ${pathname === "/personal" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"}`} title="Personal">
              <Users className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
              {isSidebarOpen && <span>Personal</span>}
            </Link>
          )}
        </nav>

        {(showMenu('Salud') || showMenu('Maternidad') || showMenu('Paternidad')) && (
          <>
            {isSidebarOpen && (
              <div className="px-6 pt-4 pb-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-2 whitespace-nowrap overflow-hidden text-ellipsis">
                Reportes
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

        {isSuperAdmin && (showMenu('Usuarios') || showMenu('Auditoría')) && (
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
                  <Link href="/usuarios" className={`flex items-center rounded-md text-sm font-medium transition-colors ${isSidebarOpen ? 'gap-2 px-3 py-2' : 'justify-center p-2 text-[10px]'} ${pathname === "/usuarios" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`} title="Usuarios">
                    {!isSidebarOpen ? <Users className="w-4 h-4" /> : <><Users className="w-3.5 h-3.5 shrink-0" /> Usuarios</>}
                  </Link>
                )}
                {isSuperAdmin && showMenu('Auditoría') && (
                  <Link href="/auditoria" className={`flex items-center rounded-md text-sm font-medium transition-colors ${isSidebarOpen ? 'gap-2 px-3 py-2' : 'justify-center p-2 text-[10px]'} ${pathname === "/auditoria" ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`} title="Auditoría">
                    {!isSidebarOpen ? <Activity className="w-4 h-4" /> : <><Activity className="w-3.5 h-3.5 shrink-0" /> Auditoría</>}
                  </Link>
                )}
              </div>
            </nav>
          </>
        )}

        <div className={`mt-auto mb-2 ${isSidebarOpen ? 'p-4' : 'p-2'}`}>
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={`flex items-center rounded-lg text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 font-medium transition-colors ${isSidebarOpen ? 'gap-3 w-full px-3 py-2.5' : 'justify-center w-full p-3'}`}
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-slate-900 print:overflow-visible print:h-auto print:block transition-colors duration-300">
        {/* Barra Superior */}
        <header className="h-14 bg-white dark:bg-slate-900 px-6 flex items-center justify-end shrink-0 border-b border-transparent dark:border-slate-800 shadow-sm z-10 print:hidden transition-colors duration-300">
          <div className="flex items-center gap-4">
            
            {/* Super Admin Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded uppercase tracking-wider border border-amber-200 dark:border-amber-800">
              <Shield className="w-3 h-3" />
              <span>{isSuperAdmin ? 'Super Admin' : 'Administrador'}</span>
            </div>

            <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
              {isSuperAdmin ? 'SEDE RED SALUD' : 'GESTIÓN DE MICRORED'}
            </span>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
            
            {/* Campana de Alertas */}
            <Link href="/inicio" className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <Bell className="w-5 h-5" />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
              )}
            </Link>
            
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

        {/* Contenido de la página (scrollable) */}
        <main className="flex-1 overflow-y-auto p-6 pt-4 print:overflow-visible print:p-0 print:m-0 print:block">
          {children}
        </main>
      </div>
    </div>
  );
}



