'use client';
import React from 'react';
import { FolderOpen } from 'lucide-react';

export default function ArchivoPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-blue-600" /> Archivo Histórico
        </h1>
        <p className="text-slate-500">Gestiona y consulta los expedientes archivados.</p>
      </div>
      
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
        <p className="text-slate-400">Módulo en construcción...</p>
      </div>
    </div>
  );
}
