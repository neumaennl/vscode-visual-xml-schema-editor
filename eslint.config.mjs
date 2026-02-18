import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import jestPlugin from 'eslint-plugin-jest';

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
  // JavaScript configuration files (jest.config.mjs, etc.)
  {
    files: ['*.mjs'],
    ...eslint.configs.recommended,
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        // CommonJS/Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Jest globals for jest.setup.js
        jest: 'readonly',
      },
    },
  },
  // JavaScript configuration files (jest.setup.js, etc.) - CommonJS
  {
    files: ['*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        // CommonJS/Node.js globals
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Jest globals for jest.setup.js
        jest: 'readonly',
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
        // Node.js globals
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
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
      // Disabled to allow console logging in VS Code extension
      'no-console': 'off',
    },
  },
  // Test files configuration (must come before webview config to avoid conflicts)
  {
    files: ['**/*.test.ts', '**/__mocks__/**/*.ts'],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        // Jest globals
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        // Browser globals for webview tests
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        Element: 'readonly',
        HTMLElement: 'readonly',
        SVGElement: 'readonly',
        getComputedStyle: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
      },
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
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
        // Browser globals
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        Element: 'readonly',
        HTMLElement: 'readonly',
        SVGElement: 'readonly',
        getComputedStyle: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
      },
    },
  },
];
