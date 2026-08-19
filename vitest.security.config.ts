import { defineConfig } from 'vitest/config';

/**
 * The B1 security suites. Every file here talks to the Firestore emulator, so
 * they run one file at a time against one shared database: `tests/rules/**`
 * through `@firebase/rules-unit-testing` and `tests/backend/**` through the
 * Admin SDK, which bypasses the rules entirely and is exactly why the server
 * guards are tested separately.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts', 'tests/backend/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
