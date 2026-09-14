import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';

export async function GET() {
  try {
    const microredes = await prisma.microred.findMany({
      include: {
        establecimientos: {
          orderBy: { nombre: 'asc' }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    return NextResponse.json(microredes);
  } catch (error) {
    console.error('Error fetching filtros:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

