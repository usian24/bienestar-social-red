import { NextResponse } from 'next/server';
import { parsearMatrizAsistencias } from '@/features/licencias/services/lectorExcel';
import prisma from '@/core/db/prisma';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parseo por lotes usando ExcelJS
    const registros = await parsearMatrizAsistencias(buffer);
    
    // Inserción masiva en Prisma (esto debe ajustarse según cómo resuelvas trabajadorId en tu BD)
    /*
    await prisma.$transaction(async (tx) => {
       // Lógica de upsert Trabajador y createMany Licencias
    });
    */

    return NextResponse.json({ message: 'Excel importado correctamente', total: registros.length });
  } catch (error) {
    console.error('Error importando excel:', error);
    return NextResponse.json({ error: 'Ocurrió un error al procesar el archivo' }, { status: 500 });
  }
}
