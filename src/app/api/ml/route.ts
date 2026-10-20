import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const INSIGHTS_PATH = path.join(process.cwd(), 'ml_engine', 'output', 'ml_insights.json');
const PYTHON_PATH = path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
const TRAIN_SCRIPT = path.join(process.cwd(), 'ml_engine', 'train_all_models.py');
const EXTRACT_SCRIPT = path.join(process.cwd(), 'ml_engine', 'extract_from_db.js');

import prisma from '@/core/db/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!fs.existsSync(INSIGHTS_PATH)) {
      return NextResponse.json({
        error: 'Los modelos de Machine Learning no han sido entrenados todavía.',
        necesitaEntrenamiento: true
      }, { status: 404 });
    }

    const fileContent = fs.readFileSync(INSIGHTS_PATH, 'utf-8');
    const data = JSON.parse(fileContent);

    const user = session.user as any;
    const rol = user?.rol;
    const esSuperAdmin = rol === 'SUPER_ADMIN' || rol === 'ADMIN';
    const { searchParams } = new URL(request.url);
    const requestedMicrored = searchParams.get('microred');

    // Resolver microred oficial del usuario si no es SuperAdmin
    let userMicroredNombre = user?.microredNombre;
    if (!esSuperAdmin) {
      if (!userMicroredNombre && user?.id) {
        const dbUser = await prisma.usuario.findFirst({
          where: { OR: [{ id: user.id }, { dni: user.email }] },
          include: { microred: true }
        });
        if (dbUser?.microred?.nombre) {
          userMicroredNombre = dbUser.microred.nombre;
        }
      }
    }

    // Determinamos la microred objetivo:
    // Si no es SuperAdmin, forzamos obligatoriamente su microred asignada.
    // Si es SuperAdmin, permitimos filtrar por query param si se solicita.
    const microredFiltro = (!esSuperAdmin && userMicroredNombre) 
      ? userMicroredNombre 
      : (requestedMicrored && requestedMicrored !== 'TODAS' ? requestedMicrored : null);

    data.esSuperAdmin = esSuperAdmin;
    data.usuarioMicrored = userMicroredNombre || null;

    if (microredFiltro) {
      const normalize = (s: string) => s 
        ? s.toUpperCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/^MICRO\s*RED\s+/i, '')
            .replace(/^MR\s+/i, '')
            .replace(/SAN\s*FCO\.?/i, 'SAN FRANCISCO')
            .replace(/STA\.?/i, 'SANTA')
            .replace(/\./g, '')
            .replace(/\s+/g, ' ')
            .trim() 
        : '';

      const match = (a: string, b: string) => {
        const na = normalize(a), nb = normalize(b);
        return na === nb || na.includes(nb) || nb.includes(na);
      };

      // 1. Filtrar Casos Atípicos (Modelo 2) - Estrictamente de su microred
      if (data.modelo2_anomalias?.topCasosAtipicos) {
        data.modelo2_anomalias.topCasosAtipicos = data.modelo2_anomalias.topCasosAtipicos.filter((c: any) => match(c.microred, microredFiltro));
        data.modelo2_anomalias.totalAtipicos = data.modelo2_anomalias.topCasosAtipicos.length;
      }

      // 2. Filtrar Certificados en Riesgo (Modelo 3) - Estrictamente de su microred
      if (data.modelo3_riesgo_citt?.topCertificadosRiesgo) {
        data.modelo3_riesgo_citt.topCertificadosRiesgo = data.modelo3_riesgo_citt.topCertificadosRiesgo.filter((c: any) => match(c.microred, microredFiltro));
        data.modelo3_riesgo_citt.resumenAlertas = {
          criticos: data.modelo3_riesgo_citt.topCertificadosRiesgo.filter((c: any) => c.nivelRiesgo === 'CRÍTICO').length,
          moderados: data.modelo3_riesgo_citt.topCertificadosRiesgo.filter((c: any) => c.nivelRiesgo === 'MODERADO').length,
          bajo: data.modelo3_riesgo_citt.topCertificadosRiesgo.filter((c: any) => c.nivelRiesgo === 'BAJO').length
        };
      }

      // 3. Proyección (Modelo 1) escalada a la cuota de la microred
      if (data.modelo4_clustering?.microredesDetalle && data.modelo1_proyeccion?.proyeccionProximosMeses) {
        const totalProvincial = data.modelo4_clustering.microredesDetalle.reduce((sum: number, m: any) => sum + (m.diasSaludTotales || 0), 0) || 1;
        const mrItem = data.modelo4_clustering.microredesDetalle.find((m: any) => match(m.microred, microredFiltro));
        if (mrItem) {
          const ratio = (mrItem.diasSaludTotales || 0) / totalProvincial;
          data.modelo1_proyeccion.proyeccionProximosMeses = data.modelo1_proyeccion.proyeccionProximosMeses.map((p: any) => ({
            ...p,
            diasSubsidioEstimados: Math.max(1, Math.round(p.diasSubsidioEstimados * ratio)),
            rangoMin: Math.max(0, Math.round(p.rangoMin * ratio)),
            rangoMax: Math.max(1, Math.round(p.rangoMax * ratio)),
            montoEstimadoRecupero: Math.max(50, Math.round(p.montoEstimadoRecupero * ratio))
          }));
        }
      }

      // 4. Establecimientos (Modelo 5) - Solo establecimientos de su microred
      if (data.modelo5_origen_canjes?.establecimientos) {
        data.modelo5_origen_canjes.establecimientos = data.modelo5_origen_canjes.establecimientos.filter((e: any) => match(e.microred, microredFiltro));
      }

      data.microredFiltroAplicado = microredFiltro;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error al obtener insights de ML:', error);
    return NextResponse.json({ error: error?.message || 'Error al procesar insights de ML' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const rol = (session.user as any)?.rol;
    if (rol !== 'SUPER_ADMIN' && rol !== 'ADMIN') {
      return NextResponse.json({ error: 'Permisos insuficientes para re-entrenar modelos' }, { status: 403 });
    }

    console.log('[ML API] Extrayendo datos frescos de PostgreSQL...');
    await execPromise(`node "${EXTRACT_SCRIPT}"`);

    console.log('[ML API] Iniciando re-entrenamiento con Python...');
    const pythonExec = fs.existsSync(PYTHON_PATH) ? `"${PYTHON_PATH}"` : 'python';
    const { stdout, stderr } = await execPromise(`${pythonExec} "${TRAIN_SCRIPT}"`);

    if (!fs.existsSync(INSIGHTS_PATH)) {
      throw new Error('El script de entrenamiento no generó ml_insights.json');
    }

    const fileContent = fs.readFileSync(INSIGHTS_PATH, 'utf-8');
    const data = JSON.parse(fileContent);

    return NextResponse.json({
      success: true,
      mensaje: 'Modelos re-entrenados exitosamente con los datos más recientes del sistema.',
      stdout,
      data
    });
  } catch (error: any) {
    console.error('Error al re-entrenar modelos de ML:', error);
    return NextResponse.json({
      error: 'Error al re-entrenar modelos de Machine Learning',
      detalle: error?.message || String(error)
    }, { status: 500 });
  }
}
