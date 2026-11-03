import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'gob.pe.redsaludhuanuco.bienestar',
  appName: 'Red de Salud Huánuco',
  webDir: 'public',
  server: {
    // En desarrollo local por USB usa localhost:3000. En producción usará el dominio oficial configurado
    url: process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000',
    cleartext: !(process.env.CAPACITOR_SERVER_URL?.startsWith('https://'))
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== 'production'
  }
};

export default config;  
