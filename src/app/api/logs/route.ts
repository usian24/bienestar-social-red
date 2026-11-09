import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireStaffAccess } from '@/core/auth/rbac';

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAccess({
      permisos: ['VER_LOGS'],
      allowMissingMicrored: true,
    });
    if (auth.errorResponse) return auth.errorResponse;

    const logFile = path.join(process.cwd(), 'storage_vol', 'logs', 'system.log');
    
    if (!fs.existsSync(logFile)) {
      return NextResponse.json({ logs: "No hay logs registrados aún." });
    }

    // Leer el archivo de logs (últimos 1MB por si crece mucho)
    const stats = fs.statSync(logFile);
    const maxSize = 1024 * 1024; // 1MB max para no crashear la UI
    
    let logs = '';
    if (stats.size > maxSize) {
       const buffer = Buffer.alloc(maxSize);
       const fd = fs.openSync(logFile, 'r');
       fs.readSync(fd, buffer, 0, maxSize, stats.size - maxSize);
       fs.closeSync(fd);
       logs = buffer.toString('utf8');
       // Recortar la primera linea que podría estar rota
       logs = logs.substring(logs.indexOf('\n') + 1);
    } else {
       logs = fs.readFileSync(logFile, 'utf8');
    }

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error leyendo logs:', error);
    return NextResponse.json({ error: 'Error del servidor al leer los logs' }, { status: 500 });
  }
}
