/**
 * Jest setup file for global test configuration.
 */

// Mock vscode module for all tests
jest.mock('vscode', () => require('./src/__mocks__/vscode'), { virtual: true });
