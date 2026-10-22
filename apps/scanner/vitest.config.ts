import { defineConfig } from 'vitest/config';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  plugins: [
    {
      name: 'resolve-ts-sources',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source.startsWith('.') && source.endsWith('.js') && importer && importer.includes('src')) {
          const tsPath = path.resolve(path.dirname(importer), source.replace(/\.js$/, '.ts'));
          if (fs.existsSync(tsPath)) {
            return tsPath;
          }
        }
        return null;
      },
    },
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});


