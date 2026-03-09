import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4175,
    host: true,
    strictPort: true,
  },
  // Widget should be copied to public/widget.iife.js
  publicDir: 'public',
  // Disable eval in dev mode to avoid CSP issues
  build: {
    target: 'esnext',
    minify: 'esbuild',
  },
  // Suppress eval warnings in dev (Vite uses eval for HMR)
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});

