import { NextResponse } from 'next/server';
import prisma from '@/core/db/prisma';
import { requireStaffAccess } from '@/core/auth/rbac';

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAccess();
    if (auth.errorResponse) return auth.errorResponse;
    const { ctx } = auth;

    const { searchParams } = new URL(request.url);
    const microredId = searchParams.get('microredId');

    // Construir where clause
    const whereClause: any = {
      origen: 'PARTICULAR'
    };

    if (ctx.isSuperAdmin) {
      if (microredId && microredId !== 'TODAS') {
        whereClause.trabajador = {
          establecimiento: {
            microredId: Number(microredId)
          }
        };
      }
    } else if (ctx.microredId) {
      // SEDE_ADMIN o cualquier rol no-superadmin: Restringir obligatoriamente a su microred asignada
      whereClause.trabajador = {
        establecimiento: {
          microredId: ctx.microredId
        }
      };
    }

    const licencias = await prisma.licencia.findMany({
      where: whereClause,
      include: {
        trabajador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            dni: true,
            cargo: true,
            condicionLaboral: true,
            establecimiento: {
              select: {
                id: true,
                nombre: true,
                microred: {
                  select: { id: true, nombre: true }
                }
              }
            }
          }
        }
      }
    });

    // Procesar semáforo
    const hoy = new Date();
    const alertas = licencias.map(lic => {
      const fechaEmision = new Date(lic.creadoEn);
      const diffTime = Math.abs(hoy.getTime() - fechaEmision.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let nivel = 'VERDE';
      if (diffDays >= 30) nivel = 'VENCIDO';
      else if (diffDays >= 25) nivel = 'ROJO';
      else if (diffDays >= 15) nivel = 'AMARILLO';

      return {
        ...lic,
        diasTranscurridos: diffDays,
        nivelAlerta: nivel
      };
    }).filter(lic => lic.nivelAlerta !== 'VERDE'); // Solo devolver amarillos, rojos y vencidos

    return NextResponse.json(alertas.sort((a, b) => b.diasTranscurridos - a.diasTranscurridos));
  } catch (error) {
    console.error('Error fetching alertas:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

