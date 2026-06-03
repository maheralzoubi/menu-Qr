import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.menuqr.app',
  appName: 'Menu QR',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
