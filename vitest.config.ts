import { defineConfig } from 'vitest/config';

// Standalone Vitest config (not merged into vite.config.ts, which is owned
// by another workstream). Tests here only exercise plain TS logic in
// src/utils, so no React plugin / jsdom environment is required.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
});
