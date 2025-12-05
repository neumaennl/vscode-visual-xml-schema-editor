module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'shared/**/*.ts',
    'src/**/*.ts',
    'webview-src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/generated/**'
  ],
  moduleNameMapper: {
    '^shared/(.*)$': '<rootDir>/shared/$1',
    '^webview-src/(.*)$': '<rootDir>/webview-src/$1',
    '^src/(.*)$': '<rootDir>/src/$1'
  }
};
