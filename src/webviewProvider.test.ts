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

    it("should parse and send schema to webview", () => {
      provider.resolveCustomTextEditor(
        mockDocument,
        mockWebviewPanel,
        {} as vscode.CancellationToken
      );

      // Check that postMessage was called
      expect(mockPostMessage).toHaveBeenCalled();
    });

    it("should handle empty document", () => {
      const emptyMockDocument = {
        uri: { toString: () => "/test/empty.xsd" } as vscode.Uri,
        getText: jest.fn(() => ""),
      } as unknown as vscode.TextDocument;

      expect(() => {
        provider.resolveCustomTextEditor(
          emptyMockDocument,
          mockWebviewPanel,
          {} as vscode.CancellationToken
        );
      }).not.toThrow();
    });

    it("should create HTML with script tag", () => {
      provider.resolveCustomTextEditor(
        mockDocument,
        mockWebviewPanel,
        {} as vscode.CancellationToken
      );

      expect(mockWebview.html).toContain("<script");
      expect(mockWebview.html).toContain("</html>");
    });

    it("should include webview resources in HTML", () => {
      provider.resolveCustomTextEditor(
        mockDocument,
        mockWebviewPanel,
        {} as vscode.CancellationToken
      );

      expect(mockGetUri).toHaveBeenCalled();
    });
  });

  describe("HTML generation", () => {
    it("should generate valid HTML structure", () => {
      provider.resolveCustomTextEditor(
        mockDocument,
        mockWebviewPanel,
        {} as vscode.CancellationToken
      );

      const html = mockWebview.html;
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
    });

    it("should include meta tags for security", () => {
      provider.resolveCustomTextEditor(
        mockDocument,
        mockWebviewPanel,
        {} as vscode.CancellationToken
      );

      const html = mockWebview.html;
      expect(html).toContain('Content-Security-Policy');
    });
  });

  describe("diagram options", () => {
    it("should send diagram options to webview on initialization", () => {
      const mockConfig = {
        get: jest.fn((key: string, defaultValue: boolean) => {
          if (key === "showDocumentation") return true;
          if (key === "alwaysShowOccurrence") return false;
          if (key === "showType") return true;
          return defaultValue;
        }),
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      provider.resolveCustomTextEditor(
        mockDocument,
        mockWebviewPanel,
        {} as vscode.CancellationToken
      );

      // Should have called postMessage twice: once for updateSchema, once for updateDiagramOptions
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "updateDiagramOptions",
          data: {
            showDocumentation: true,
            alwaysShowOccurrence: false,
            showType: true,
          },
        })
      );
    });

    it("should use default values when configuration is not set", () => {
      const mockConfig = {
        get: jest.fn((_key: string, defaultValue: boolean) => defaultValue),
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      provider.resolveCustomTextEditor(
        mockDocument,
        mockWebviewPanel,
        {} as vscode.CancellationToken
      );

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "updateDiagramOptions",
          data: {
            showDocumentation: false,
            alwaysShowOccurrence: false,
            showType: false,
          },
        })
      );
    });
  });
});
