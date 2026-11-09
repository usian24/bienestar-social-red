'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Printer, Loader2, ArrowLeft, MapPin, Globe } from 'lucide-react';
import { useImprimir } from '@/shared/hooks/useImprimir';
import Link from 'next/link';
import EditorToolbar from '@/shared/components/EditorToolbar';
import VisorDocumentoA4 from '@/shared/components/VisorDocumentoA4';

export default function ReporteMaternidadPdfPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useImprimir({
    contentRef: componentRef,
    documentTitle: `Reporte_Historial_Maternidad_${data?.trabajador?.dni || 'Trabajador'}`
  });

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const res = await fetch(`/api/maternidad/personal-pdf/${id}`);
        if (!res.ok) throw new Error('Error al obtener datos');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchHistorial();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!data) {
    return <div className="text-center p-10 text-red-500">Error al cargar la información del trabajador.</div>;
  }

  const { trabajador, licenciasInfo, totalSubsidioGlobal } = data;
  const mesActualStr = new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-[#f4f7fb] dark:bg-slate-900 min-h-screen py-10 print:py-0 print:bg-white pb-20">
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden px-4">
        <Link href="/maternidad" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center gap-2 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Volver a Maternidad
        </Link>
        <button 
          onClick={() => handlePrint()}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-md uppercase"
        >
          <Printer className="w-5 h-5" />
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="flex flex-col items-center w-full p-1 sm:p-2 rounded-xl border border-transparent print:p-0 print:border-none print:shadow-none">
        <EditorToolbar />
        <VisorDocumentoA4>
          <div 
            className="bg-white shadow-2xl rounded-sm text-black text-[15px] w-[210mm] min-h-[297mm] relative print:shadow-none print:m-0 print:w-[210mm] print:min-h-[297mm] box-border flex flex-col overflow-hidden outline-none transition-all hover:shadow-blue-900/20" 
            style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, Helvetica, sans-serif' }}
            ref={componentRef}
            contentEditable
            suppressContentEditableWarning
          >
            <style type="text/css" media="print">
              {`
                @page { size: A4; margin: 0; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
                .page-break { page-break-before: always; }
              `}
            </style>

            {/* CABECERA INSTITUCIONAL ARRIBA (Idéntica a Reportes Generales) */}
            <div className="w-full flex flex-col items-center pt-[2mm] pb-3 select-none px-[20mm]" contentEditable={false}>
              <div className="flex items-center justify-center w-full px-2 text-slate-500 font-bold text-[9px] uppercase leading-tight h-16">
                <img src="/informe/header.jpeg" alt="Gobierno Regional Huanuco" className="h-14 object-contain mr-4" />
                <div className="h-full w-[1px] bg-slate-300 mx-4"></div>
                <div className="flex items-center gap-2">
                  <img src="/informe/header2.png" alt="Red de Salud Huanuco" className="h-12 object-contain" />
                  <div className="text-center">RED DE SALUD<br/>HUANUCO</div>
                </div>
                <div className="h-full w-[1px] bg-slate-300 mx-4"></div>
                <div className="text-center px-2">DIRECCION<br/>ADMINISTRATIVA</div>
                <div className="h-full w-[1px] bg-slate-300 mx-4"></div>
                <div className="text-center px-2">UNIDAD DE<br/>RECURSOS<br/>HUMANOS</div>
              </div>
              <div className="text-center mt-2 font-bold text-[10px] text-slate-500">
                &quot;Año de la esperanza y fortalecimiento de la democracia&quot;
              </div>
            </div>

            {/* CUERPO DEL INFORME (Flex-1 para que el pie de página siempre esté al final) */}
            <div className="w-full flex-1 px-[20mm] pb-[32mm] pt-2 outline-none">
              <h2 className="text-center font-black text-lg mb-6 uppercase border-b-2 border-slate-800 pb-2">
                Reporte Historial de Licencias por Maternidad
              </h2>
              
              <div className="bg-slate-50 border border-slate-300 p-4 mb-8">
                <div className="grid grid-cols-2 gap-4 text-sm font-bold">
                  <div>APELLIDOS Y NOMBRES: <span className="font-normal">{trabajador.apellidos} {trabajador.nombres}</span></div>
                  <div>DNI: <span className="font-normal">{trabajador.dni}</span></div>
                  <div>CONDICIÓN LABORAL: <span className="font-normal">{trabajador.cargo}</span></div>
                  <div>ESTABLECIMIENTO: <span className="font-normal">{trabajador.establecimiento?.nombre}</span></div>
                </div>
              </div>

              <p className="mb-6">
                A continuación se detalla el historial completo de descansos médicos (CITT/CMP) registrados en el sistema por motivo de maternidad:
              </p>

              {licenciasInfo && licenciasInfo.length > 0 ? (
                <div className="mb-8 break-inside-avoid">
                  <div className="font-bold bg-[#F4B084] text-white p-2 text-center uppercase mb-2 border border-[#F4B084]">
                    HISTORIAL COMPLETO DE LICENCIAS - {trabajador.establecimiento?.nombre || 'N/A'}
                  </div>
                  <table className="w-full table-fixed border-collapse text-center text-[9px] sm:text-[10px]">
                    <thead>
                      <tr className="bg-[#F8CBAD] text-black">
                        <th className="border border-slate-400 p-1 font-bold w-[5%]">N°</th>
                        <th className="border border-slate-400 p-1 font-bold w-[21%]">CITT O CMP</th>
                        <th className="border border-slate-400 p-1 font-bold w-[16%]">FECHA INICIO</th>
                        <th className="border border-slate-400 p-1 font-bold w-[16%]">FECHA FIN</th>
                        <th className="border border-slate-400 p-1 font-bold w-[22%]" colSpan={2}>FECHA SUBSIDIO</th>
                        <th className="border border-slate-400 p-1 font-bold w-[10%] leading-tight">TOTAL<br/>DÍAS</th>
                        <th className="border border-slate-400 p-1 font-bold w-[10%] leading-tight">DÍAS<br/>SUBSIDIO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licenciasInfo.map((lic: any, lIdx: number) => (
                        <tr key={lIdx}>
                          <td className="border border-slate-300 p-1 overflow-hidden">{lIdx + 1}</td>
                          <td className="border border-slate-300 p-1 break-words">{lic.origen}</td>
                          <td className="border border-slate-300 p-1 whitespace-nowrap">{lic.fechaInicio}</td>
                          <td className="border border-slate-300 p-1 whitespace-nowrap">{lic.fechaFin}</td>
                          <td className="border border-slate-300 p-1 text-rose-600 font-medium">{lic.subsidioStart || ''}</td>
                          <td className="border border-slate-300 p-1 text-rose-600 font-medium">{lic.subsidioEnd || ''}</td>
                          <td className="border border-slate-300 p-1 font-bold">
                            {lic.diasOtorgados}
                          </td>
                          {lIdx === 0 && (
                            <td rowSpan={licenciasInfo.length} className="border border-slate-300 p-1 font-bold align-middle text-center text-sm">
                              {totalSubsidioGlobal || ''}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-slate-500 italic p-6">No hay licencias registradas.</div>
              )}

              <div className="mt-16">
                <p className="text-right italic">Emitido el {mesActualStr}.</p>
              </div>
            </div>

            {/* PIE DE PÁGINA INSTITUCIONAL ABAJO (Fijo al final de la hoja A4) */}
            <div className="absolute bottom-0 left-0 w-full h-[25mm] select-none pointer-events-none" contentEditable={false}>
              <img src="/informe/footer.png" alt="Fondo" className="absolute left-0 bottom-0 h-full object-contain object-left-bottom z-0" />
              <div className="absolute bottom-[10mm] left-0 w-full flex items-center justify-center gap-6 pl-24 text-[9px] text-slate-600 font-medium z-10">
                <span className="whitespace-nowrap">Área de Bienestar Social</span>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <MapPin className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                  <span>Av. Carretera Central N° 314 – Llicua Baja Amarilis -Huánuco</span>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Globe className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                  <span className="text-blue-500 underline">https://redsaludhuanuco.gob.pe/oficial/index.html</span>
                </div>
              </div>
            </div>
          </div>
        </VisorDocumentoA4>
      </div>
    </div>
  );
}
