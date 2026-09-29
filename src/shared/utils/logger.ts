import fs from 'fs';
import path from 'path';

// Asegurarse de que el directorio logs exista
const logDir = path.join(process.cwd(), 'storage_vol', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'system.log');

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export const logger = {
  log: (level: LogLevel, context: string, message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    let logLine = `[${timestamp}] [${level}] [${context}] ${message}`;
    
    if (meta) {
      if (meta instanceof Error) {
        logLine += ` | Exception: ${meta.message} \nStack: ${meta.stack}`;
      } else {
        logLine += ` | Meta: ${JSON.stringify(meta)}`;
      }
    }
    
    // Escribir en archivo (append)
    fs.appendFileSync(logFile, logLine + '\n', 'utf8');
    
    // Imprimir en consola de desarrollo
    if (process.env.NODE_ENV !== 'production' || level === 'ERROR') {
      if (level === 'ERROR') console.error(logLine);
      else if (level === 'WARN') console.warn(logLine);
      else console.log(logLine);
    }
  },
  
  info: (context: string, message: string, meta?: any) => logger.log('INFO', context, message, meta),
  warn: (context: string, message: string, meta?: any) => logger.log('WARN', context, message, meta),
  error: (context: string, message: string, meta?: any) => logger.log('ERROR', context, message, meta),
  debug: (context: string, message: string, meta?: any) => logger.log('DEBUG', context, message, meta)
};
