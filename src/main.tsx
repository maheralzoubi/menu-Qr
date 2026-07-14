import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Capacitor} from '@capacitor/core';
import {StatusBar} from '@capacitor/status-bar';
import App from './App.tsx';
import './index.css';
import './i18n';

// Android 15+ (targetSdk 35+) enforces edge-to-edge rendering, which draws the
// WebView behind the status bar and clips top content (e.g. the logo). Force
// the WebView to lay out below the status bar on native platforms.
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({overlay: false}).catch(() => {});
}

// Prefix all /api calls with the backend URL when running as a native app.
// VITE_API_URL is set in .env.production (e.g. http://192.168.1.30:3000).
const API_BASE = import.meta.env.VITE_API_URL ?? '';
if (API_BASE) {
  const _fetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      return _fetch(API_BASE + input, init);
    }
    return _fetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
