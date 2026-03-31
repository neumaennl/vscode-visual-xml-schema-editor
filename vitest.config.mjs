/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { JestCompatJUnitReporter } from './vitest-junit-reporter.ts';

export default defineConfig({
  test: {
    reporters: [
      'verbose',
      new JestCompatJUnitReporter({
        outputFile: 'test-results/vitest-junit.xml',
        suiteName: 'vitest tests',
      }),
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'extension',
          globals: false,
          environment: 'node',
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'shared',
          globals: false,
          environment: 'node',
          setupFiles: ['./vitest.setup.ts'],
          include: ['shared/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'webview',
          globals: false,
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['webview-src/**/*.test.ts'],
        },
      },
    ],
  }
});