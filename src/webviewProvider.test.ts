/**
 * Unit tests for SchemaEditorProvider.
 */

import * as vscode from "vscode";
import { SchemaEditorProvider } from "./webviewProvider";

// Mock helpers
const mockPostMessage = jest.fn();
const mockGetUri = jest.fn((path: vscode.Uri) => path);

describe("SchemaEditorProvider", () => {
  let provider: SchemaEditorProvider;
  let mockContext: vscode.ExtensionContext;
  let mockDocument: vscode.TextDocument;
  let mockWebviewPanel: vscode.WebviewPanel;
  let mockWebview: vscode.Webview;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      extensionUri: vscode.Uri.file("/extension/path"),
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    mockWebview = {
      options: {},
      html: "",
      asWebviewUri: mockGetUri,
      postMessage: mockPostMessage,
      onDidReceiveMessage: jest.fn(),
    } as unknown as vscode.Webview;

    mockWebviewPanel = {
      webview: mockWebview,
      onDidDispose: jest.fn(),
    } as unknown as vscode.WebviewPanel;

    mockDocument = {
      uri: { toString: () => "/test/schema.xsd" } as vscode.Uri,
      getText: jest.fn(() => "<xs:schema></xs:schema>"),
    } as unknown as vscode.TextDocument;

    provider = new SchemaEditorProvider(mockContext);
  });

  describe("constructor", () => {
    it("should create provider instance", () => {
      expect(provider).toBeInstanceOf(SchemaEditorProvider);
    });

    it("should store context", () => {
      expect(provider).toBeDefined();
    });
  });

  describe("resolveCustomTextEditor", () => {
    it("should enable scripts in webview", () => {
      provider.resolveCustomTextEditor(
        mockDocument,
        mockWebviewPanel,
        {} as vscode.CancellationToken
      );

      expect(mockWebview.options).toEqual({ enableScripts: true });
    });

    it("should set HTML content in webview", () => {
      provider.resolveCustomTextEditor(
        mockDocument,
        mockWebviewPanel,
        {} as vscode.CancellationToken
      );

      expect(mockWebview.html).toBeTruthy();
      expect(mockWebview.html.length).toBeGreaterThan(0);
    });

    it("should register document change listener", () => {
      provider.resolveCustomTextEditor(
        mockDocument,
        mockWebviewPanel,
        {} as vscode.CancellationToken
      );

      expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
    });

    it("should register message listener from webview", () => {
      provider.resolveCustomTextEditor(
        mockDocument,
        mockWebviewPanel,
        {} as vscode.CancellationToken
      );

      expect(mockWebview.onDidReceiveMessage).toHaveBeenCalled();
    });
  });
});
