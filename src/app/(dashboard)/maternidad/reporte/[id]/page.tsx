import prisma from "@/core/db/prisma";
import { notFound } from "next/navigation";
import PrintButtons from "@/shared/components/PrintButtons";

export default async function ReporteMaternidadPdfPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const trabajador = await prisma.trabajador.findUnique({
    where: { id },
    include: {
      establecimiento: { include: { microred: true } },
      licencias: {
        where: { tipoLicencia: 'MATERNIDAD' },
        orderBy: { fechaInicio: 'asc' }
      }
    }
  });

  if (!trabajador) notFound();

  let diasEssalud = 0;
  let diasParticulares = 0;

  trabajador.licencias.forEach(lic => {
    if (lic.origen === 'ESSALUD_CITT') diasEssalud += lic.diasOtorgados;
    else if (lic.origen === 'PARTICULAR') diasParticulares += lic.diasOtorgados;
  });

  const totalDias = diasEssalud + diasParticulares;
  const diasRed = Math.min(totalDias, 20);
  const diasSubsidioEsSalud = Math.max(0, totalDias - 20);
  const apellidosNombres = trabajador.apellidos ? `${trabajador.apellidos}, ${trabajador.nombres}` : trabajador.nombres;

  return (
    <div className="bg-slate-200 min-h-screen py-10 print:py-0 print:bg-white">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; }
          .no-print { display: none !important; }
          @page { margin: 2cm; size: A4 portrait; }
        }
      `}} />

      <PrintButtons />

      <div className="bg-white max-w-[800px] mx-auto p-12 shadow-2xl print:shadow-none font-sans text-slate-800">
        
        <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
          <h1 className="text-2xl font-black uppercase mb-1">Red de Salud Huánuco</h1>
          <h2 className="text-lg font-bold text-slate-600">Unidad de Bienestar Social</h2>
          <h3 className="text-md font-semibold mt-4 bg-slate-100 py-2">
            EXPEDIENTE OFICIAL DE DESCANSOS MÉDICOS (MATERNIDAD)
          </h3>
        </div>

        <div className="mb-8 border border-slate-300 rounded-lg p-5">
          <h4 className="font-bold border-b border-slate-200 pb-2 mb-4 uppercase tracking-wider text-sm">I. Datos del Servidor</h4>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div><span className="font-semibold text-slate-500">Apellidos y Nombres:</span><p className="font-bold text-base">{apellidosNombres}</p></div>
            <div><span className="font-semibold text-slate-500">DNI:</span><p className="font-bold">{trabajador.dni}</p></div>
            <div><span className="font-semibold text-slate-500">Cargo / Condición:</span><p>{trabajador.cargo} / {trabajador.condicionLaboral}</p></div>
            <div><span className="font-semibold text-slate-500">Establecimiento:</span><p>{trabajador.establecimiento?.nombre} ({trabajador.establecimiento?.microred?.nombre})</p></div>
          </div>
        </div>

        <div className="mb-8 border border-slate-300 rounded-lg p-5">
          <h4 className="font-bold border-b border-slate-200 pb-2 mb-4 uppercase tracking-wider text-sm">II. Liquidación de Días</h4>
          
          <div className="grid grid-cols-1 gap-4 text-center mt-2">
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <span className="block text-xs font-bold text-blue-600 uppercase">Total Días por Maternidad (Subsidio EsSalud)</span>
              <span className="block text-3xl font-black text-blue-700 mt-1">{totalDias}</span>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h4 className="font-bold border-b-2 border-slate-800 pb-2 mb-4 uppercase tracking-wider text-sm">III. Historial Detallado de Descansos Médicos</h4>
          <table className="w-full text-sm border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">N°</th>
                <th className="border border-slate-300 p-2 text-left">Origen</th>
                <th className="border border-slate-300 p-2 text-left">N° CITT / Certificado</th>
                <th className="border border-slate-300 p-2 text-center">Inicio</th>
                <th className="border border-slate-300 p-2 text-center">Fin</th>
                <th className="border border-slate-300 p-2 text-center font-bold">Días</th>
              </tr>
            </thead>
            <tbody>
              {trabajador.licencias.length === 0 ? (
                <tr><td colSpan={6} className="border border-slate-300 p-4 text-center italic text-slate-500">Sin registros médicos.</td></tr>
              ) : (
                trabajador.licencias.map((lic, idx) => (
                  <tr key={lic.id}>
                    <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                    <td className="border border-slate-300 p-2">{lic.origen === 'ESSALUD_CITT' ? 'CITT EsSalud' : 'Particular'}</td>
                    <td className="border border-slate-300 p-2">{lic.numeroCertificado}</td>
                    <td className="border border-slate-300 p-2 text-center">{new Date(lic.fechaInicio).toLocaleDateString('es-PE')}</td>
                    <td className="border border-slate-300 p-2 text-center">{new Date(lic.fechaFin).toLocaleDateString('es-PE')}</td>
                    <td className="border border-slate-300 p-2 text-center font-bold">{lic.diasOtorgados}</td>
                  </tr>
                ))
              )}
            </tbody>
            {trabajador.licencias.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50">
                  <td colSpan={5} className="border border-slate-300 p-2 text-right font-bold">TOTAL DÍAS:</td>
                  <td className="border border-slate-300 p-2 text-center font-black">{totalDias}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="mt-24 grid grid-cols-2 gap-8 text-center text-sm pt-8">
          <div>
            <div className="w-48 mx-auto border-t border-slate-800 pt-2 font-bold">Firma del Servidor</div>
            <div className="mt-1 text-slate-600">DNI: {trabajador.dni}</div>
          </div>
          <div>
            <div className="w-48 mx-auto border-t border-slate-800 pt-2 font-bold">V° B° Bienestar Social</div>
            <div className="mt-1 text-slate-600">Red de Salud Huánuco</div>
          </div>
        </div>

        <div className="mt-16 text-right text-xs text-slate-500 italic">
          Expediente generado el {new Date().toLocaleDateString('es-PE')} a las {new Date().toLocaleTimeString('es-PE')}
        </div>
      </div>

      {/* IV. Anexos / Evidencias (Fuera del primer page para forzar salto de página al imprimir si es necesario, o adentro con pageBreakBefore) */}
      {trabajador.licencias.some(lic => lic.archivoRuta) && (
        <div className="bg-white max-w-[800px] mx-auto p-12 shadow-2xl print:shadow-none font-sans text-slate-800 mt-12" style={{ pageBreakBefore: 'always' }}>
          <h4 className="font-bold border-b-2 border-slate-800 pb-2 mb-6 uppercase tracking-wider text-sm">IV. Anexos: Evidencias de Descansos Médicos</h4>
          
          <div className="flex flex-col gap-10">
            {trabajador.licencias.filter(lic => lic.archivoRuta).map(lic => (
              <div key={lic.id} className="border border-slate-300 p-4 rounded-lg break-inside-avoid">
                <h5 className="font-bold text-slate-700 mb-3 bg-slate-100 p-2 rounded">
                  Evidencia - Certificado N° {lic.numeroCertificado}
                </h5>
                <div className="flex justify-center bg-slate-50 p-4 border border-dashed border-slate-300">
                  {lic.archivoRuta!.endsWith('.pdf') ? (
                    <div className="p-4 text-center">
                      <p className="text-slate-500 mb-2">Este archivo es un Documento PDF adjunto.</p>
                      <a href={lic.archivoRuta!} target="_blank" className="text-blue-600 font-bold underline inline-block">
                        Hacer Clic para Imprimir PDF por separado
                      </a>
                    </div>
                  ) : (
                    <img 
                      src={lic.archivoRuta!} 
                      alt={`Evidencia ${lic.numeroCertificado}`} 
                      className="max-w-full h-auto border border-slate-200 shadow-sm"
                      style={{ maxHeight: '600px' }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

