import React, { forwardRef } from 'react';
import { MapPin, Globe } from 'lucide-react';

interface ReporteMensualTemplateProps {
  mes: string;
  anio: number;
  condicionLaboral?: string;
  data: any;
}

const Header = () => (
  <div className="w-full flex flex-col items-center pt-[2mm] pb-4 select-none px-[20mm]" contentEditable={false}>
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
    <div className="text-center mt-3 font-bold text-[10px] text-slate-500">
      "Año de la esperanza y fortalecimiento de la democracia"
    </div>
  </div>
);

const Footer = () => (
  <div className="absolute bottom-0 left-0 w-full h-[25mm] select-none" contentEditable={false}>
    <img src="/informe/footer.png" alt="Fondo" className="absolute left-0 bottom-0 h-full object-contain object-left-bottom z-0 pointer-events-none" />
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
);

const HojaA4 = ({ children, isEditable, noPadding }: { children: React.ReactNode, isEditable?: boolean, noPadding?: boolean }) => (
  <div className="bg-white shadow-2xl rounded-sm w-[210mm] h-[297mm] relative print:shadow-none print:m-0 print:break-after-page overflow-hidden mb-8 print:mb-0 box-border text-[15px] text-black shrink-0 flex flex-col">
    <Header />
    <div 
       className={`w-full flex-1 outline-none break-words whitespace-pre-wrap mt-[5mm] ${noPadding ? 'px-[10mm] overflow-visible' : 'px-[30mm] pr-[27.5mm] overflow-hidden'}`}
       contentEditable={isEditable} 
       suppressContentEditableWarning={isEditable}
       style={{ fontFamily: 'Arial, Helvetica, sans-serif', lineHeight: '1.5' }}
    >
      {children}
    </div>
    <Footer />
  </div>
);

const ReporteMensualTemplate = forwardRef<HTMLDivElement, ReporteMensualTemplateProps>(({ mes, anio, condicionLaboral, data }, ref) => {
  const isCas = condicionLaboral === 'CAS';
  const condicionAsunto = isCas ? 'PERSONAL CAS' : 'PERSONAL NOMBRADO 276';
  const condicionCuerpo = isCas ? 'bajo el régimen del Decreto Legislativo N.° 1057 CAS' : 'bajo el régimen del Decreto Legislativo N.° 276 Nombrados';

  return (
    <div ref={ref} className="w-full flex flex-col items-center">
      <style type="text/css" media="print">
        {`
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; background: white; }
          .print\\:break-after-page { page-break-after: always; }
        `}
      </style>
      
      {/* HOJA 1: CARTA DE PRESENTACIÓN */}
      <HojaA4 isEditable={true}>
        <div className="rounded-sm text-justify">
          <div className="text-center font-bold text-[16px] mb-8 underline underline-offset-4">
            INFORME Nº 035-{anio}- GRH-GRDS-DIRES-RS HCO/URH-CEPEREZ
          </div>
          
          <table className="w-full mb-8 font-bold text-[15px]">
            <tbody>
              <tr>
                <td className="w-28 align-top pb-4">A</td>
                <td className="w-6 align-top pb-4">:</td>
                <td className="pb-4">
                  GIANMARCO GAMARRA LANGUASCO<br/>
                  <span className="font-normal text-[13px]">JEFE DE LA UNIDAD DE RECURSOS HUMANOS</span>
                </td>
              </tr>
              <tr>
                <td className="w-28 align-top pb-4">DE</td>
                <td className="w-6 align-top pb-4">:</td>
                <td className="pb-4">
                  Lic. Com. EVA CEBRIAN PEREZ<br/>
                  <span className="font-normal text-[13px]">RESPONSABLE DEL AREA DE BIENESTAR SOCIAL</span>
                </td>
              </tr>
              <tr>
                <td className="w-28 align-top pb-4">ASUNTO</td>
                <td className="w-6 align-top pb-4">:</td>
                <td className="pb-4 uppercase">
                  SE REMITE LICENCIA POR ENFERMEDAD Y MATERNIDAD {condicionAsunto}<br/>
                  {mes} {anio}.
                </td>
              </tr>
              <tr>
                <td className="w-28 align-top">FECHA</td>
                <td className="w-6 align-top">:</td>
                <td className="uppercase">
                  <div className="border-b-2 border-black pb-1 w-full font-bold">
                    09 de {mes} del {anio}.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <p className="mb-4">
            Tengo el agrado de dirigirme a usted para saludarle cordialmente y, a la vez, remitir las licencias por maternidad y por enfermedad correspondientes a los trabajadores {condicionCuerpo}, así como del personal administrativo de la Sede y del establecimiento de la jurisdicción de la Red de Salud Huánuco, debidamente registradas y tramitadas conforme a la normativa vigente.
          </p>

          <p className="mb-4">
            Asimismo, solicito se disponga la socialización de la presente información con las áreas de Control de Asistencia, Programación, Remuneraciones y Horas Complementarias, a fin de que se realicen los trámites administrativos correspondientes, garantizando la correcta aplicación en los registros de asistencia, programación laboral y procesamiento de planillas, según corresponda.
          </p>

          <p className="mb-8">
            Las licencias remitidas corresponden al periodo <strong>{mes.toUpperCase()} {anio}</strong> y cuentan con la documentación sustentatoria respectiva.
          </p>

          <p className="mb-20">Es cuanto informo para los fines consiguientes.</p>
          
          <p className="mb-10">Atentamente,</p>

          <div className="flex justify-between items-end mt-20 text-[10px]">
            <div>
              <p>Ecp.</p>
              <p>C.C.</p>
              <p>09/09/{anio}</p>
            </div>
            
            <table className="border-collapse border border-black text-[10px] w-40 text-center">
              <tbody>
                <tr>
                  <td className="border border-black font-bold py-1 w-1/2">REG. DOC</td>
                  <td className="border border-black py-1 w-1/2"></td>
                </tr>
                <tr>
                  <td className="border border-black font-bold py-1">REG. EXP</td>
                  <td className="border border-black py-1"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </HojaA4>

      {/* HOJAS ANEXAS: TABLAS ROTADAS */}
      {(() => {
        const pages: any[][] = [];
        let currentPage: { items: any[], capacity: number } = { items: [], capacity: 0 };
        const MAX_CAPACITY = 24;

        const pushPage = () => {
          if (currentPage.items.length > 0) {
            pages.push(currentPage.items);
            currentPage = { items: [], capacity: 0 };
          }
        };

        data?.sheets?.forEach((sheet: any) => {
          if (!sheet.rows || sheet.rows.length <= 1) return;
          
          const headers = sheet.rows.filter((r: any) => r.type === 'header');
          const workers = sheet.rows.filter((r: any) => r.type === 'worker');

          if (workers.length === 0) return;

          let isFirstOfSheet = true;

          const insertHeaders = (isContinuation: boolean) => {
            currentPage.items.push({ type: 'title', name: sheet.name, isContinuation });
            currentPage.items.push({ type: 'header', headers });
            currentPage.capacity += 3;
          };

          workers.forEach((worker: any) => {
            const cost = worker.chunks?.length || 1;
            
            if (isFirstOfSheet) {
              if (currentPage.capacity + 3 + cost > MAX_CAPACITY && currentPage.items.length > 0) {
                pushPage();
              }
              insertHeaders(false);
              isFirstOfSheet = false;
            } else {
              if (currentPage.capacity + cost > MAX_CAPACITY) {
                pushPage();
                insertHeaders(true);
              }
            }
            
            currentPage.items.push({ type: 'worker', data: worker });
            currentPage.capacity += cost;
          });
        });
        
        pushPage();

        return pages.map((pageItems, pageIdx) => (
          <HojaA4 key={`page-${pageIdx}`} isEditable={false} noPadding={true}>
            {pageIdx === 0 && (
              <div className="text-center font-bold text-[14px] mb-2 uppercase">
                ANEXO: RELACIÓN DE PERSONAL CON LICENCIA POR ENFERMEDAD - {mes} {anio}
              </div>
            )}

            <div className={`relative w-full ${pageIdx === 0 ? 'h-[220mm]' : 'h-[235mm]'}`}>
              <div className="absolute top-0 left-0" style={{ transform: 'rotate(-90deg) translateX(-100%)', transformOrigin: 'top left', width: pageIdx === 0 ? '220mm' : '235mm', height: '190mm', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(() => {
                  const tables: any[] = [];
                  let currentTable: any = null;
                  
                  pageItems.forEach(item => {
                    if (item.type === 'title') {
                      if (currentTable) tables.push(currentTable);
                      currentTable = { title: item, headers: null, workers: [] };
                    } else if (item.type === 'header') {
                      currentTable.headers = item.headers;
                    } else if (item.type === 'worker') {
                      currentTable.workers.push(item.data);
                    }
                  });
                  if (currentTable) tables.push(currentTable);
                  
                  return tables.map((tbl, tIdx) => (
                    <div key={tIdx} className="w-full shrink-0">
                      <div className="font-bold bg-[#4F81BD] text-white p-1 text-center uppercase mb-1 border border-[#4F81BD] text-[10px]">
                        {tbl.title.name} - {mes} {anio} {tbl.title.isContinuation ? '(CONT.)' : ''}
                      </div>
                      <table className="w-full border-collapse text-center text-[9px] leading-tight">
                        <thead>
                          {tbl.headers?.map((hRow: any, hIdx: number) => (
                            <tr key={`h-${hIdx}`} className="bg-[#D9E1F2] text-black">
                              {hRow.values.map((v: string, i: number) => {
                                if (v === '') return null;
                                return (
                                  <th key={i} className="border border-slate-400 px-1 py-0.5 font-bold" colSpan={v === 'FECHA SUBSIDIO' ? 2 : 1}>
                                    {v}
                                  </th>
                                );
                              })}
                            </tr>
                          ))}
                        </thead>
                        <tbody>
                          {tbl.workers.map((row: any, rIdx: number) => (
                            <React.Fragment key={`r-${rIdx}`}>
                              {row.chunks.map((chunk: any, cIdx: number) => (
                                <tr key={`c-${cIdx}`}>
                                  {cIdx === 0 && (
                                    <>
                                      <td rowSpan={row.chunks.length} className="border border-slate-300 px-1 py-0.5">{chunk.nro}</td>
                                      <td rowSpan={row.chunks.length} className="border border-slate-300 px-1 py-0.5 text-left max-w-[140px] break-words">{chunk.apellidosNombres}</td>
                                      <td rowSpan={row.chunks.length} className="border border-slate-300 px-1 py-0.5 text-[8px] max-w-[80px] break-words">{chunk.cargo}</td>
                                      <td rowSpan={row.chunks.length} className="border border-slate-300 px-1 py-0.5 text-[8px]">{chunk.condicion}</td>
                                      <td rowSpan={row.chunks.length} className="border border-slate-300 px-1 py-0.5 text-[8px] max-w-[70px] truncate" title={chunk.establecimiento}>{chunk.establecimiento}</td>
                                      <td rowSpan={row.chunks.length} className="border border-slate-300 px-1 py-0.5">{chunk.dni}</td>
                                    </>
                                  )}
                                  <td className="border border-slate-300 px-1 py-0.5 max-w-[120px] break-words text-[8px]">{chunk.citt}</td>
                                  <td className="border border-slate-300 px-1 py-0.5">{chunk.inicio}</td>
                                  <td className="border border-slate-300 px-1 py-0.5">{chunk.fin}</td>
                                  <td className="border border-slate-300 px-1 py-0.5 bg-red-50 text-red-700 font-medium">{chunk.fin20Dias}</td>
                                  <td className="border border-slate-300 px-1 py-0.5">{chunk.subsidioStart || ''}</td>
                                  <td className="border border-slate-300 px-1 py-0.5">{chunk.subsidioEnd || ''}</td>
                                  <td className="border border-slate-300 px-1 py-0.5 font-bold text-[10px]">{chunk.totalDias}</td>
                                  {cIdx === 0 && (
                                    <td rowSpan={row.chunks.length} className="border border-slate-300 px-1 py-0.5 font-bold text-[10px]">{row.totalSubsidioMes}</td>
                                  )}
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </HojaA4>
        ));
      })()}
    </div>
  );
});

ReporteMensualTemplate.displayName = 'ReporteMensualTemplate';
export default ReporteMensualTemplate;
