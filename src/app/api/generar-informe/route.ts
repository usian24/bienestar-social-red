import { NextResponse } from 'next/server';
import { ensamblarExpedienteSubsidio } from '@/features/reportes/services/ensambladorPdf';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trabajadorId, datosTrabajador, rutasEvidencias } = body;

    const pdfBytes = await ensamblarExpedienteSubsidio(datosTrabajador, rutasEvidencias || []);
    
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="informe_subsidio.pdf"'
      }
    });
  } catch (error) {
    console.error('Error generando informe:', error);
    return NextResponse.json({ error: 'Error generando informe' }, { status: 500 });
  }
}
