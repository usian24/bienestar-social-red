export default function ConsultaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">RED</span>
            </div>
            <div>
              <h1 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">Red de Salud Huánuco</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Portal del Trabajador - Bienestar Social</p>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

