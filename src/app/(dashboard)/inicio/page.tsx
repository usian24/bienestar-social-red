'use client';

import React, { useState } from 'react';
import { Search, UserPlus, Users, Activity, FileCheck } from 'lucide-react';

export default function InicioPage() {
  const [busqueda, setBusqueda] = useState('');

  return (
    <div className="space-y-6">
      {/* Encabezado y Buscador Principal */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Directorio de Servidores y Búsqueda Global</h1>
        <p className="text-slate-500 mb-6 text-sm">
          Busca a cualquier trabajador por DNI o Nombres para ver su historial completo de licencias (Salud, Maternidad, Paternidad) o registra un nuevo ingreso.
        </p>
        
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Ingresa DNI o Apellidos..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md pl-10 pr-4 py-2 text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium shadow-sm transition-colors flex items-center gap-2">
            <Search className="w-4 h-4" />
            Buscar
          </button>
          <button className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-2 rounded-md font-medium shadow-sm transition-colors flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Nuevo Ingreso
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Rápido (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Total Trabajadores Registrados</p>
            <h3 className="text-2xl font-bold text-slate-800">1,245</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-full">
            <Activity className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Licencias Activas (Este Mes)</p>
            <h3 className="text-2xl font-bold text-slate-800">48</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-full">
            <FileCheck className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Subsidios Pendientes EsSalud</p>
            <h3 className="text-2xl font-bold text-slate-800">12</h3>
          </div>
        </div>
      </div>

      {/* Resultados de Búsqueda Vacíos (Placeholder) */}
      {busqueda && (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">Buscando "{busqueda}"...</h3>
          <p className="text-slate-500 text-sm">
            Conectando a la base de datos para recuperar el historial completo del servidor.
          </p>
        </div>
      )}
    </div>
  );
}

