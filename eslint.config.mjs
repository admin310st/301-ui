import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // Only catch real bugs — no style enforcement
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'warn',
      'no-constant-condition': 'warn',
      'no-debugger': 'warn',
      'no-duplicate-case': 'error',
      'no-empty': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    ignores: ['public/', 'build/', 'dist/', 'static/', 'scripts/', 'docs/'],
  },
);
