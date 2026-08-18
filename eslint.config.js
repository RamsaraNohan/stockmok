import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/lib/**',
      '.emulator-data/**',
      'visual-designs/**',
      'eslint.config.js',
      'prettier.config.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@stockmok/shared/server/*'],
              message: 'Zone-4 paths are server-only and cannot be imported by client code.',
            },
          ],
        },
      ],
    },
  },
  {
    // Zone-4 paths are server-only, not client-only: the trusted backend under
    // `functions/src/**` is exactly the "server" the restriction means to allow
    // (DB-01 §4, FIREBASE_PATH_CONTRACT §4) — B1's original allowlist covered
    // the package's own server module plus tooling but omitted the backend
    // itself, which B2's `org.create` (handleReservations) is the first real
    // consumer of.
    files: ['packages/shared/src/server/**', 'functions/src/**', 'scripts/**', 'tests/**'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
);
