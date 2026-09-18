import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: ['test/**/*.emulator.test.ts'],
    coverage: { include: ['src/**/*.ts'] },
  },
});
