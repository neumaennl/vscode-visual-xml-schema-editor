module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/shared', '<rootDir>/src', '<rootDir>/webview-src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'shared/**/*.ts',
    'src/**/*.ts',
    'webview-src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/generated/**',
    '!**/__tests__/**'
  ],
  moduleNameMapper: {
    '^shared/(.*)$': '<rootDir>/shared/$1'
  },
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'jest-junit.xml'
    }]
  ]
};
