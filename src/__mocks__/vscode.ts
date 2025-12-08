/**
 * Mock implementation of VS Code API for testing.
 * This provides a minimal mock of the vscode module for Jest tests.
 */

export const Uri = {
  file: jest.fn((path: string) => ({
    fsPath: path,
    scheme: 'file',
    path,
    toString: (): string => path
  })),
  parse: jest.fn((value: string) => ({
    fsPath: value,
    scheme: 'file',
    path: value,
    toString: (): string => value
  })),
  joinPath: jest.fn((_base: unknown, ...paths: string[]) => ({
    fsPath: paths.join("/"),
    scheme: 'file',
    path: paths.join("/"),
    toString: (): string => paths.join("/")
  }))
};

export const Disposable = {
  from: jest.fn(() => ({
    dispose: jest.fn()
  }))
};

export const EventEmitter = jest.fn(() => ({
  event: jest.fn(),
  fire: jest.fn(),
  dispose: jest.fn()
}));

export const CancellationTokenSource = jest.fn(() => ({
  token: {},
  cancel: jest.fn(),
  dispose: jest.fn()
}));

export const workspace = {
  openTextDocument: jest.fn(),
  onDidChangeTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
  onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  getConfiguration: jest.fn(() => ({
    get: jest.fn((key: string, defaultValue?: unknown) => defaultValue)
  })),
  getWorkspaceFolder: jest.fn(),
  workspaceFolders: [],
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn()
  },
  applyEdit: jest.fn()
};

export const window = {
  registerCustomEditorProvider: jest.fn(() => ({ dispose: jest.fn() })),
  showErrorMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  activeTextEditor: undefined,
  createWebviewPanel: jest.fn()
};

export const commands = {
  registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
  executeCommand: jest.fn()
};

export const languages = {
  registerDocumentFormattingEditProvider: jest.fn(() => ({ dispose: jest.fn() }))
};

export const ViewColumn = {
  One: 1,
  Two: 2,
  Three: 3
};

export const WebviewPanelSerializer = {};

export const CustomEditorProvider = {};

export const WorkspaceEdit = jest.fn();
