import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.menuqr.app',
  appName: 'Menu QR',
  webDir: 'dist',
  server: {
    androidScheme: 'http',   // avoids mixed-content block when API is plain HTTP
    cleartext: true,          // allow HTTP traffic to local backend
  },
};

export default config;
