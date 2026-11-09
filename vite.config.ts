import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: { include: ['tests/**/*.test.{ts,tsx}'], environment: 'node', testTimeout: 30000, setupFiles: ['tests/setup.ts'] },
});
