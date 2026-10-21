import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@modules': path.resolve(__dirname, 'src/modules'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./tests/setup-env.ts'],
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 60_000,
    hookTimeout: 120_000,
    include: ['tests/**/*.test.ts'],
  },
});
