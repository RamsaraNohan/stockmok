import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The emulator-backed B1 suites run through `vitest.security.config.ts`,
    // under `firebase emulators:exec`.
    exclude: ['**/node_modules/**', 'tests/rules/**', 'tests/backend/**', 'tests/integration/**'],
    coverage: {
      include: ['packages/shared/src/**/*.ts'],
    },
  },
});
