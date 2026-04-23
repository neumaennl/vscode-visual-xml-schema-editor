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

    // eslint-disable-next-line no-restricted-syntax -- partial stub; unused VS Code context fields omitted
    mockContext = {
      extensionUri: vscode.Uri.file("/extension/path"),
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    // eslint-disable-next-line no-restricted-syntax -- partial stub; unused Webview fields omitted
    mockWebview = {
      options: {},
      html: "",
      asWebviewUri: mockGetUri,
      postMessage: mockPostMessage,
      onDidReceiveMessage: jest.fn(),
    } as unknown as vscode.Webview;

    // eslint-disable-next-line no-restricted-syntax -- partial stub; unused WebviewPanel fields omitted
    mockWebviewPanel = {
      webview: mockWebview,
      onDidDispose: jest.fn(),
    } as unknown as vscode.WebviewPanel;

    // eslint-disable-next-line no-restricted-syntax -- partial stub; unused TextDocument fields omitted
    mockDocument = {
      uri: { toString: () => "/test/schema.xsd" } as vscode.Uri,
      getText: jest.fn(() => "<xs:schema></xs:schema>"),
      lineCount: 1,
      lineAt: jest.fn(() => ({ text: "<xs:schema></xs:schema>" })),
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
      // eslint-disable-next-line no-restricted-syntax -- partial stub; unused TextDocument fields omitted
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

  describe("executeCommand error routing", () => {
    // Use jest.spyOn on the CommandProcessor prototype so we can control the
    // return value without changing the provider's constructor.

    afterEach(() => {
      jest.restoreAllMocks();
    });

    /**
     * Resolves the editor and returns the registered message-handler function.
     * Uses a typed mock to avoid unsafe `any` member access on `mock.calls`.
     */
    function resolveAndGetHandler(): (msg: unknown) => void {
      provider.resolveCustomTextEditor(
        mockDocument,
        mockWebviewPanel,
        {} as vscode.CancellationToken
      );
      // Type onDidReceiveMessage precisely so mock.calls is not any[][]
      type ListenerFn = (msg: unknown) => void;
      type OnReceiveMock = jest.MockedFunction<
        (listener: ListenerFn) => vscode.Disposable
      >;
      const onReceiveMock =
        mockWebview.onDidReceiveMessage as OnReceiveMock;
      // Capture the handler before clearing mock state
      const handler = onReceiveMock.mock.calls[0][0];
      jest.clearAllMocks(); // clear calls from resolveCustomTextEditor
      return handler;
    }

    it("should send 'error' message with code and stack for runtime errors", async () => {
      const { CommandProcessor } = await import("./commandProcessor");
      jest.spyOn(CommandProcessor.prototype, "execute").mockReturnValue({
        success: false,
        errorKind: "runtime",
        error: "Command execution failed: Something exploded",
        stack: "Error: Something exploded\n  at executeAddElement (...)",
        schema: null,
        xmlContent: null,
      });

      const handler = resolveAndGetHandler();
      handler({
        command: "executeCommand",
        data: { type: "addElement", payload: { parentId: "schema", elementName: "x", elementType: "string" } },
      });

      // Wait for the async handleWebviewMessage microtask
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      // Verify correct message type was sent
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: "error" })
      );
      // Must NOT have sent a commandResult for this runtime failure
      expect(mockPostMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: "commandResult" })
      );

      // Verify data fields via a typed extraction to avoid any-typed matchers
      type ErrorMsg = { command: string; data: { message: string; code: string; stack?: string } };
      type PostMsgFn = jest.MockedFunction<(msg: ErrorMsg) => Promise<boolean>>;
      const sentMsg = (mockPostMessage as PostMsgFn).mock.calls[0][0];
      expect(sentMsg.data.message).toContain("Something exploded");
      expect(sentMsg.data.code).toBe("COMMAND_EXECUTION_ERROR");
      expect(sentMsg.data.stack).toContain("executeAddElement");
    });

    it("should send 'commandResult' with success:false for validation errors", async () => {
      const { CommandProcessor } = await import("./commandProcessor");
      jest.spyOn(CommandProcessor.prototype, "execute").mockReturnValue({
        success: false,
        errorKind: "validation",
        error: "Parent element not found: /element:missing",
        schema: null,
        xmlContent: null,
      });

      const handler = resolveAndGetHandler();
      handler({
        command: "executeCommand",
        data: { type: "addElement", payload: { parentId: "/element:missing", elementName: "x", elementType: "string" } },
      });

      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "commandResult",
          data: {
            success: false,
            error: "Parent element not found: /element:missing",
          },
        })
      );
      // Must NOT have sent an error message for a validation failure
      expect(mockPostMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: "error" })
      );
    });

    it("should send 'error' message with code and stack when commandProcessor throws", async () => {
      const { CommandProcessor } = await import("./commandProcessor");
      jest.spyOn(CommandProcessor.prototype, "execute").mockImplementation(() => {
        throw new Error("Completely unexpected failure");
      });

      const handler = resolveAndGetHandler();
      handler({
        command: "executeCommand",
        data: { type: "addElement", payload: { parentId: "schema", elementName: "x", elementType: "string" } },
      });

      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: "error" })
      );

      // Verify data fields via a typed extraction to avoid any-typed matchers
      type ErrorMsg = { command: string; data: { message: string; code: string } };
      type PostMsgFn = jest.MockedFunction<(msg: ErrorMsg) => Promise<boolean>>;
      const sentMsg = (mockPostMessage as PostMsgFn).mock.calls[0][0];
      expect(sentMsg.data.message).toContain("Completely unexpected failure");
      expect(sentMsg.data.code).toBe("COMMAND_EXECUTION_ERROR");
    });
    it("should send 'error' message with code when applyEdit returns false", async () => {
      const { CommandProcessor } = await import("./commandProcessor");
      jest.spyOn(CommandProcessor.prototype, "execute").mockReturnValue({
        success: true,
        // schema/xmlContent values are irrelevant — only the applyEdit branch is under test
        schema: {},
        xmlContent: "<xs:schema/>",
      });
      (vscode.workspace.applyEdit as jest.Mock).mockResolvedValue(false);

      const handler = resolveAndGetHandler();
      handler({
        command: "executeCommand",
        data: { type: "addElement", payload: { parentId: "schema", elementName: "x", elementType: "string" } },
      });

      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: "error" })
      );
      // Must NOT send a commandResult for an edit-application failure
      expect(mockPostMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: "commandResult" })
      );

      // Verify data fields via a typed extraction to avoid any-typed matchers
      type ErrorMsg = { command: string; data: { message: string; code: string } };
      type PostMsgFn = jest.MockedFunction<(msg: ErrorMsg) => Promise<boolean>>;
      const sentMsg = (mockPostMessage as PostMsgFn).mock.calls[0][0];
      expect(sentMsg.data.message).toBe("Failed to apply edit to the document.");
      expect(sentMsg.data.code).toBe("COMMAND_EXECUTION_ERROR");
    });

  });
});
