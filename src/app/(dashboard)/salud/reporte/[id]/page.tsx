import prisma from "@/core/db/prisma";
import { notFound } from "next/navigation";
import PrintButtons from "@/shared/components/PrintButtons";

export default async function ReporteBasicoPdfPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Obtener datos del servidor
  const trabajador = await prisma.trabajador.findUnique({
    where: { id },
    include: {
      establecimiento: { include: { microred: true } },
      licencias: {
        where: { tipoLicencia: 'ENFERMEDAD_COMUN' },
        orderBy: { fechaInicio: 'asc' }
      }
    }
  });

  if (!trabajador) {
    notFound();
  }

  // Cálculos de días
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
        <div className="text-center mb-10 border-b-2 border-slate-800 pb-6">
          <h1 className="text-2xl font-black uppercase mb-1">Red de Salud Huánuco</h1>
          <h2 className="text-lg font-bold text-slate-600">Unidad de Bienestar Social</h2>
          <h3 className="text-md font-semibold mt-4 bg-slate-100 py-2 border border-slate-200">
            CONSTANCIA GENERAL DE LIQUIDACIÓN DE SUBSIDIOS
          </h3>
        </div>

        <div className="mb-10 text-justify text-sm leading-relaxed">
          <p className="mb-4">
            Por medio del presente documento, la Unidad de Bienestar Social de la Red de Salud Huánuco deja constancia de la situación actual de los descansos médicos (Enfermedad Común) del siguiente servidor:
          </p>
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-5 mb-4 font-medium">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><span className="text-slate-500 block text-xs uppercase">Apellidos y Nombres:</span> {apellidosNombres}</div>
              <div><span className="text-slate-500 block text-xs uppercase">DNI:</span> {trabajador.dni}</div>
              <div><span className="text-slate-500 block text-xs uppercase">Establecimiento:</span> {trabajador.establecimiento?.nombre}</div>
              <div><span className="text-slate-500 block text-xs uppercase">Condición:</span> {trabajador.cargo}</div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h4 className="font-bold border-b border-slate-300 pb-2 mb-6 uppercase text-sm">Resumen de Liquidación</h4>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="border border-slate-200 p-4">
              <span className="block text-xs font-bold text-slate-500 uppercase">Días Totales Acumulados</span>
              <span className="block text-3xl font-black mt-2">{totalDias}</span>
            </div>
            <div className="border border-emerald-200 bg-emerald-50 p-4">
              <span className="block text-xs font-bold text-emerald-600 uppercase">Días a cargo del Empleador</span>
              <span className="block text-3xl font-black text-emerald-700 mt-2">{diasRed}</span>
            </div>
            <div className={`border p-4 ${diasSubsidioEsSalud > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
              <span className={`block text-xs font-bold uppercase ${diasSubsidioEsSalud > 0 ? 'text-red-600' : 'text-slate-500'}`}>Días de Subsidio EsSalud</span>
              <span className={`block text-3xl font-black mt-2 ${diasSubsidioEsSalud > 0 ? 'text-red-600' : 'text-slate-700'}`}>{diasSubsidioEsSalud}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-20 text-justify">
          Se expide la presente constancia para los fines administrativos que la entidad o el servidor estimen convenientes, con corte a la fecha de emisión del presente reporte.
        </p>

        <div className="mt-20 grid grid-cols-2 gap-10 text-center text-sm">
          <div>
            <div className="w-48 mx-auto border-t border-slate-800 pt-2 font-bold">Firma del Servidor</div>
          </div>
          <div>
            <div className="w-48 mx-auto border-t border-slate-800 pt-2 font-bold">V° B° Bienestar Social</div>
          </div>
        </div>

        <div className="mt-16 text-right text-xs text-slate-500 italic">
          Huánuco, {new Date().toLocaleDateString('es-PE')}
        </div>
      </div>
    </div>
  );
}

