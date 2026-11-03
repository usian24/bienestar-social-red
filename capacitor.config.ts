import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'gob.pe.redsaludhuanuco.bienestar',
  appName: 'Red de Salud Huánuco',
  webDir: 'public',
  server: {
    // Conectado por Wi-Fi a la IP activa de la laptop para que el celular funcione al 100%
    url: 'http://192.168.137.233:3000',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;  
