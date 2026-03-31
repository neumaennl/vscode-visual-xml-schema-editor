/**
 * Mock implementation of VS Code API for testing.
 * This provides a minimal mock of the vscode module for Vitest tests.
 */

import { vi } from 'vitest';

export const Uri = {
  file: vi.fn((path: string) => ({
    fsPath: path,
    scheme: 'file',
    path,
    toString: (): string => path
  })),
  parse: vi.fn((value: string) => ({
    fsPath: value,
    scheme: 'file',
    path: value,
    toString: (): string => value
  })),
  joinPath: vi.fn((_base: unknown, ...paths: string[]) => ({
    fsPath: paths.join("/"),
    scheme: 'file',
    path: paths.join("/"),
    toString: (): string => paths.join("/")
  }))
};

export const Disposable = {
  from: vi.fn(() => ({
    dispose: vi.fn()
  }))
};

export const EventEmitter = vi.fn(() => ({
  event: vi.fn(),
  fire: vi.fn(),
  dispose: vi.fn()
}));

export const CancellationTokenSource = vi.fn(() => ({
  token: {},
  cancel: vi.fn(),
  dispose: vi.fn()
}));

export const workspace = {
  openTextDocument: vi.fn(),
  onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
  onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  getConfiguration: vi.fn(() => ({
    get: vi.fn((key: string, defaultValue?: unknown) => defaultValue)
  })),
  getWorkspaceFolder: vi.fn(),
  workspaceFolders: [],
  fs: {
    readFile: vi.fn(),
    writeFile: vi.fn()
  },
  applyEdit: vi.fn()
};

export const window = {
  registerCustomEditorProvider: vi.fn(() => ({ dispose: vi.fn() })),
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  activeTextEditor: undefined,
  createWebviewPanel: vi.fn()
};

export const commands = {
  registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
  executeCommand: vi.fn()
};

export const languages = {
  registerDocumentFormattingEditProvider: vi.fn(() => ({ dispose: vi.fn() }))
};

export const ViewColumn = {
  One: 1,
  Two: 2,
  Three: 3
};

export const WebviewPanelSerializer = {};

export const CustomEditorProvider = {};

export const WorkspaceEdit = vi.fn(() => ({
  replace: vi.fn(),
}));

export const Range = vi.fn();
