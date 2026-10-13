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

export async function GET() {
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
