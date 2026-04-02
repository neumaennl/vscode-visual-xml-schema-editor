import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import vitest from '@vitest/eslint-plugin'
import globals from 'globals';

export default [
  // Global ignores
  {
    ignores: [
      'out/',
      'dist/',
      'webview/',
      'node_modules/',
      '**/*.d.ts',
      '**/generated/**',
    ],
  },
  // Disallow .js and .cjs files (project uses ESM with .mjs and TypeScript)
  {
    files: ['**/*.js', '**/*.cjs'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message: 'JavaScript (.js) and CommonJS (.cjs) files are not allowed. Use TypeScript (.ts) or ES modules (.mjs) instead.',
        },
      ],
    },
  },
  // JavaScript configuration files (vitest.config.mjs, etc.)
  {
    files: ['*.mjs'],
    ...eslint.configs.recommended,
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  // TypeScript files configuration
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: [
          './tsconfig.json',
          './tsconfig.webview.json',
          './tsconfig.extension-test.json',
          './tsconfig.webview-test.json',
          './tsconfig.shared-test.json',
        ],
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs['recommended-requiring-type-checking'].rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'error',
      // Disabled to allow type inference at module boundaries
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Disallow `unknown` in type assertions (`x as unknown`) and in variable-type
      // annotations (`const x: unknown`). Both are escape hatches that bypass type
      // safety. Function-parameter and interface-field annotations are not targeted
      // by these selectors. If genuinely unavoidable, add eslint-disable-next-line
      // with a justification.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression[typeAnnotation.type="TSUnknownKeyword"], VariableDeclarator[id.typeAnnotation.typeAnnotation.type="TSUnknownKeyword"]',
          message: 'Avoid `unknown` in type assertions and variable-type annotations. If unavoidable, add eslint-disable-next-line with a justification.',
        },
      ],
      // Disabled to allow console logging in VS Code extension
      'no-console': 'off',
    },
  },
  // Test files configuration (must come before webview config to avoid conflicts)
  {
    files: ['**/*.test.ts', '**/__mocks__/**/*.ts'],
    plugins: {
      vitest,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...vitest.configs.recommended.rules,
      // Recognise custom assertion helpers as assertion-containing functions
      'vitest/expect-expect': [ 
        'error',
        {
          assertFunctionNames: [
            'expect',
            'expectFailure',
            'expectValidationFailure',
            'expectRuntimeFailure',
            'expectInvalid',
            'runCommandExpectValidationFailure',
            'runCommandExpectSuccessSchema',
          ],
        },
      ],
      // Disabled in tests where we have more control over the test environment
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Disabled to allow dynamic require() in tests for module initialization testing
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // Webview TypeScript files configuration (browser environment)
  {
    files: ['webview-src/**/*.ts'],
    ignores: ['**/*.test.ts', '**/__mocks__/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];
