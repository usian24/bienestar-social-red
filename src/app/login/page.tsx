'use client';

import React from 'react';
import { Lock, User } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-6">
             <div className="w-16 h-16 rounded-full border-2 border-blue-400 flex flex-col items-center justify-center bg-[#f4f7fb] text-[8px] text-blue-700 font-bold leading-tight">
               <span className="text-blue-600 mb-0.5 text-xl">🏥</span>
               RED DE
            </div>
          </div>
          
          <h2 className="text-center text-xl font-bold text-slate-800 mb-2">Bienvenido al Sistema</h2>
          <p className="text-center text-sm text-slate-500 mb-8">
            Ingresa tus credenciales para continuar
          </p>

          <form className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuario (DNI)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Ej. 40917914" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="password" 
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">Recordarme</label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">¿Olvidaste tu contraseña?</a>
              </div>
            </div>

            <button type="submit" className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Iniciar Sesión
            </button>
          </form>
        </div>
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          Gobierno Regional de Huánuco — Red de Salud
        </div>
      </div>
    </div>
  );
}

