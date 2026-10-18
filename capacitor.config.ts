import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'gob.pe.redsaludhuanuco.bienestar',
  appName: 'Red de Salud Huánuco',
  webDir: 'public',
  server: {
    // Con cable USB conectado, adb reverse permite que el celular entre directo por localhost:3000
    url: 'http://localhost:3000',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
