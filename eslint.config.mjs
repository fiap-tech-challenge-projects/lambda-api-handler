// @ts-nocheck
import eslint from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import eslintPluginImport from 'eslint-plugin-import'
import eslintPluginJsdoc from 'eslint-plugin-jsdoc'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Define base rules
const baseRules = {
  // Import rules
  'import/order': [
    'error',
    {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    },
  ],
  'import/no-unresolved': 'error',
  'import/no-internal-modules': 'off', // Disabled for Lambda project
  'no-duplicate-imports': 'error',
  // JSDoc rules (relaxed for Lambda)
  'jsdoc/require-jsdoc': 'off',
  'jsdoc/require-returns': 'off',
  'jsdoc/require-param': 'off',
  'jsdoc/require-param-description': 'off',
  'jsdoc/require-returns-description': 'off',
  // TypeScript rules
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/prefer-nullish-coalescing': 'off',
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
  // Member ordering
  '@typescript-eslint/member-ordering': [
    'error',
    {
      default: {
        memberTypes: ['signature', 'field', 'constructor', 'method'],
        order: 'as-written',
      },
    },
  ],
  // Naming conventions (relaxed for Lambda/AWS SDK)
  '@typescript-eslint/naming-convention': [
    'error',
    { selector: 'interface', format: ['PascalCase'] },
    { selector: 'class', format: ['PascalCase'] },
    { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
    { selector: 'function', format: ['camelCase'] },
    { selector: 'objectLiteralProperty', format: null }, // Allow any format for object properties (AWS SDK uses PascalCase)
  ],
}

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'scripts/**',
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.js',
      '*.d.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: eslintPluginImport,
      jsdoc: eslintPluginJsdoc,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      ...baseRules,
    },
  },
  {
    files: ['src/__tests__/**/*.ts'],
    rules: {
      ...baseRules,
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/member-ordering': 'off',
      '@typescript-eslint/naming-convention': 'off',
    },
  },
)
