/**
 * Jest setup file for global test configuration.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Mock vscode module for all tests
jest.mock('vscode', () => require('./src/__mocks__/vscode'), { virtual: true });
