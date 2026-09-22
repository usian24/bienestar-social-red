export default function ConsultaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fbfbfd] font-sans relative overflow-x-hidden">
      <main className="max-w-5xl mx-auto px-4 py-12 relative z-10">
        {children}
      </main>
    </div>
  );
}
