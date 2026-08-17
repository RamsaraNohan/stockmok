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
    files: ['packages/shared/src/server/**', 'scripts/**', 'tests/**'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
);
