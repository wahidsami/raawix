import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/widget.ts',
      name: 'RaawiXAccessibility',
      fileName: 'widget',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
    minify: true,
    sourcemap: false, // Disable sourcemap for smaller bundle
  },
});

