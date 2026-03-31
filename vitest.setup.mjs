/**
 * Vitest setup file for global test configuration.
 */

import { vi } from 'vitest';

// Mock vscode module for all tests
vi.mock('vscode', async () => {
  const mockModule = await import('./src/__mocks__/vscode.ts');
  return mockModule;
});
