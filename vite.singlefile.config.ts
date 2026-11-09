import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Kebijakan keamanan konten untuk build mandiri/EXE: tidak ada jaringan, frame, objek, atau form. Skrip & gaya inline dibutuhkan
// karena seluruh aplikasi disisipkan ke satu berkas HTML (tidak ada 'unsafe-eval').
export const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');
const cspPlugin = () => ({
  name: 'dekri-csp',
  transformIndexHtml: (html: string) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

// Satu file HTML mandiri (JS, CSS, data) yang bisa diklik dua kali tanpa Node.js atau server.
export default defineConfig({
  base: './',
  publicDir: false, // service worker tidak dipakai pada file lokal
  plugins: [react(), tailwindcss(), cspPlugin(), viteSingleFile()],
  build: { outDir: 'dist-single', emptyOutDir: true },
});
