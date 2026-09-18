import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    // The emulator-backed B1 suites run through `vitest.security.config.ts`,
    // under `firebase emulators:exec`.
    exclude: ['**/node_modules/**', 'tests/rules/**', 'tests/backend/**', 'tests/integration/**'],
    coverage: {
      include: ['packages/shared/src/**/*.ts'],
    },
  },
});
