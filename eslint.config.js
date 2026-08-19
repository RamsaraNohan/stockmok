import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
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
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
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
    files: ['src/**/*.{ts,tsx}', 'tests/e2e/**/*.ts'],
    plugins: {
      import: importPlugin,
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      'import/no-cycle': 'error',
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/features/**/*.{ts,tsx}', 'src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'firebase',
              message:
                'UI and feature code must access Firebase through services and data adapters.',
            },
          ],
          patterns: [
            {
              group: ['firebase/*', '@/data', '@/data/*', '@stockmok/shared/server/*'],
              message: 'UI and feature code must depend on services, never data or Zone-4 modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/services/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'firebase',
              message: 'Service code must access Firebase through the data boundary.',
            },
          ],
          patterns: [
            {
              group: ['firebase/*', '@/features', '@/features/*', '@stockmok/shared/server/*'],
              message: 'Services may depend on data adapters, never features or Zone-4 modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/data/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/app',
                '@/app/*',
                '@/features',
                '@/features/*',
                '@/services',
                '@/services/*',
                '@/ui',
                '@/ui/*',
                '@stockmok/shared/server/*',
              ],
              message: 'Data adapters must not depend on higher frontend layers or Zone-4 modules.',
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
