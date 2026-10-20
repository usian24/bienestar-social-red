import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'gob.pe.redsaludhuanuco.bienestar',
  appName: 'Red de Salud Huánuco',
  webDir: 'public',
  server: {
    // Conectado por Wi-Fi o Hotspot para que el celular funcione al 100% de manera inalámbrica
    url: 'http://192.168.137.233:3000',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
