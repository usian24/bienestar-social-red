'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Printer, Loader2, ArrowLeft, MapPin } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import Link from 'next/link';
import EditorToolbar from '@/shared/components/EditorToolbar';
import VisorDocumentoA4 from '@/shared/components/VisorDocumentoA4';

export default function ReporteIndividualPage() {
  const params = useParams();
  const { id } = params;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Reporte_Historial_${data?.trabajador?.dni || 'Trabajador'}`
  });

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const res = await fetch(`/api/salud/excel/${id}`);
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

  const { trabajador, mesesInfo } = data;
  const mesActualStr = new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-[#f4f7fb] dark:bg-slate-900 min-h-screen py-10 print:py-0 print:bg-white pb-20">
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link href="/salud" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center gap-2 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Volver a Salud
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
            className="bg-white shadow-2xl rounded-sm text-black text-[12px] print:shadow-none print:w-[210mm] outline-none pl-[30mm] pr-[27.5mm] box-border transition-all hover:shadow-blue-900/20" 
            style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, Helvetica, sans-serif' }}
            ref={componentRef}
            contentEditable
            suppressContentEditableWarning
          >
          <style type="text/css" media="print">
            {`
              @page { size: A4; margin: 0; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
            `}
          </style>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                <td>
                  <div className="w-full flex flex-col items-center mb-6 pt-[25mm] border-b-2 border-transparent">
                    <div className="flex items-center justify-center w-full px-2 text-slate-500 font-bold text-[9px] uppercase leading-tight h-16">
                      <img src="/informe/header.jpeg" alt="Gobierno Regional Huanuco" className="h-14 object-contain mr-4" />
                      
                      <div className="h-full w-[1px] bg-slate-300 mx-4"></div>
                      
                      <div className="flex items-center gap-2">
                        <img src="/informe/header2.png" alt="Red de Salud Huanuco" className="h-12 object-contain" />
                        <div className="text-center">
                          RED DE SALUD<br/>HUANUCO
                        </div>
                      </div>

                      <div className="h-full w-[1px] bg-slate-300 mx-4"></div>

                      <div className="text-center px-2">
                        DIRECCION<br/>ADMINISTRATIVA
                      </div>

                      <div className="h-full w-[1px] bg-slate-300 mx-4"></div>

                      <div className="text-center px-2">
                        UNIDAD DE<br/>RECURSOS<br/>HUMANOS
                      </div>
                    </div>
                    <div className="text-center mt-3 font-bold text-[10px] text-slate-500">
                      "Año de la esperanza y fortalecimiento de la democracia"
                    </div>
                  </div>
                </td>
              </tr>
            </thead>
            
            <tbody>
              <tr>
                <td className="px-10 pb-8">
                  <div className="rounded-sm text-justify">
                    <h2 className="text-center font-black text-lg mb-6 uppercase border-b-2 border-slate-800 pb-2">
                      Reporte Historial de Licencias por Enfermedad
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
                      A continuación se detalla el historial de descansos médicos (CITT/CMP) registrados en el sistema, organizados cronológicamente por mes:
                    </p>

                    {mesesInfo.map((mesInfo: any, idx: number) => {
                       return (
                         <div key={idx} className="mb-8 break-inside-avoid">
                           <div className="font-bold bg-[#4F81BD] text-white p-2 text-center uppercase mb-2 border border-[#4F81BD]">
                             {mesInfo.mesStr} - MICRORED {trabajador.establecimiento?.microred?.nombre}
                           </div>
                           <table className="w-full border-collapse text-center text-[10px]">
                              <thead>
                                <tr className="bg-[#D9E1F2] text-black">
                                  <th className="border border-slate-400 p-1 font-bold">N°</th>
                                  <th className="border border-slate-400 p-1 font-bold">CITT O CMP</th>
                                  <th className="border border-slate-400 p-1 font-bold">FECHA INICIO</th>
                                  <th className="border border-slate-400 p-1 font-bold">FECHA FIN</th>
                                  <th className="border border-slate-400 p-1 font-bold">FIN 20 DÍAS (RED)</th>
                                  <th className="border border-slate-400 p-1 font-bold" colSpan={2}>FECHA SUBSIDIO</th>
                                  <th className="border border-slate-400 p-1 font-bold">TOTAL DÍAS</th>
                                  <th className="border border-slate-400 p-1 font-bold">DÍAS SUBSIDIOS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mesInfo.licencias.map((lic: any, lIdx: number) => {
                                   return (
                                     <tr key={lIdx}>
                                        <td className="border border-slate-300 p-1">{lIdx + 1}</td>
                                        <td className="border border-slate-300 p-1">{lic.origen}</td>
                                        <td className="border border-slate-300 p-1">{lic.fechaInicio}</td>
                                        <td className="border border-slate-300 p-1">{lic.fechaFin}</td>
                                        <td className="border border-slate-300 p-1">{lic.fin20Dias || ''}</td>
                                        <td className="border border-slate-300 p-1 text-rose-600">{lic.subsidioStart || ''}</td>
                                        <td className="border border-slate-300 p-1 text-rose-600">{lic.subsidioEnd || ''}</td>
                                        <td className={`border border-slate-300 p-1 font-bold ${lic.isRed ? 'bg-[#D9E1F2] !text-black' : ''}`}>
                                          {lic.diasOtorgados}
                                        </td>
                                        {lIdx === 0 && (
                                           <td rowSpan={mesInfo.licencias.length} className="border border-slate-300 p-1 font-bold align-middle text-center">
                                             {mesInfo.totalSubsidioMes || ''}
                                           </td>
                                        )}
                                     </tr>
                                   );
                                })}
                              </tbody>
                           </table>
                         </div>
                       );
                    })}

                    <div className="mt-20">
                      <p className="text-right italic">Emitido el {mesActualStr}.</p>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>

            <tfoot>
              <tr>
                <td>
                  <div className="relative w-full mt-8 flex items-center overflow-visible text-[10px] text-slate-600 font-medium pb-[25mm]">
                    <img src="/informe/footer.png" alt="Fondo" className="absolute -left-4 bottom-0 h-16 object-contain z-0" />
                    
                    <div className="relative z-10 flex items-center justify-center w-full gap-4 pl-24">
                      <span className="whitespace-nowrap">Área de Bienestar Social</span>
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <MapPin className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                        <span>Av. Carretera Central N° 314 – Llicua Baja Amarilis -Huánuco</span>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        </VisorDocumentoA4>
      </div>
    </div>
  );
}
