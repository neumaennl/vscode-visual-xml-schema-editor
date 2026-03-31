/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ["./vitest.setup.mjs"],
    reporters: [
      'verbose',
      [
        'junit',
        {
          outputFile: 'test-results/vitest-junit.xml',
          classNameTemplate: '{filename}',
          includeConsoleOutput: false,
          addFileAttribute: true
        },
      ],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
    },
    projects: [
      {
        name: 'extension',
        test: {
          globals: false,
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        name: 'shared',
        test: {
          globals: false,
          environment: 'node',
          include: ['shared/**/*.test.ts'],
        },
      },
      {
        name: 'webview',
        test: {
          globals: false,
          environment: 'jsdom',
          include: ['webview-src/**/*.test.ts'],
        },
      },
    ],
  }
});