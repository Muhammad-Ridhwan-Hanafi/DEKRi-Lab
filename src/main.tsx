import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './ui/App';
import { initTheme } from './ui/theme';
import { applyScale } from './ui/prefs';

initTheme();
applyScale();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// service worker hanya untuk hosting http(s); file lokal (file://) dan EXE tidak bisa/perlu mendaftarkannya
if (import.meta.env.PROD && 'serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
