/**
 * Unit tests for SchemaEditorProvider.
 */

import * as vscode from "vscode";
import { SchemaEditorProvider } from "./webviewProvider.js";
import { CommandProcessor } from "./commandProcessor.js";
import { resolveAndGetHandler, stubEditor } from "./__tests__/providerTestHelpers.js";
import type { EditorStubs } from "./__tests__/providerTestHelpers.js";
import { expectLinesInOrder } from "./__tests__/textTestHelpers.js";
import type { Mock, MockedFunction } from "vitest";

describe("SchemaEditorProvider", () => {
  let editor: EditorStubs;

  beforeEach(() => {
    vi.clearAllMocks();
    editor = stubEditor("<xs:schema></xs:schema>");
  });

  describe("constructor", () => {
    test("should create provider instance", () => {
      expect(editor.provider).toBeInstanceOf(SchemaEditorProvider);
    });

    test("should store context", () => {
      expect(editor.provider).toBeDefined();
    });
  });

  describe("resolveCustomTextEditor", () => {
    test("should enable scripts in webview", () => {
      editor.provider.resolveCustomTextEditor(
        editor.document,
        editor.webviewPanel,
        {} as vscode.CancellationToken
      );

      expect(editor.webview.options).toMatchObject({
        enableScripts: true,
        localResourceRoots: expect.any(Array) as unknown[],
      });
    });

    test("should set HTML content in webview", () => {
      editor.provider.resolveCustomTextEditor(
        editor.document,
        editor.webviewPanel,
        {} as vscode.CancellationToken
      );

      expect(editor.webview.html).toBeTruthy();
      expect(editor.webview.html.length).toBeGreaterThan(0);
    });

    test("should register document change listener", () => {
      editor.provider.resolveCustomTextEditor(
        editor.document,
        editor.webviewPanel,
        {} as vscode.CancellationToken
      );

      expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
    });

    test("should register message listener from webview", () => {
      editor.provider.resolveCustomTextEditor(
        editor.document,
        editor.webviewPanel,
        {} as vscode.CancellationToken
      );

      expect(editor.webview.onDidReceiveMessage).toHaveBeenCalled();
    });

    test("should parse and send schema to webview", () => {
      editor.provider.resolveCustomTextEditor(
        editor.document,
        editor.webviewPanel,
        {} as vscode.CancellationToken
      );

      // Check that postMessage was called
      expect(editor.postMessage).toHaveBeenCalled();
    });

    test("should handle empty document", () => {
      // eslint-disable-next-line no-restricted-syntax -- partial stub; unused TextDocument fields omitted
      const emptyMockDocument = {
        uri: { toString: () => "/test/empty.xsd" } as vscode.Uri,
        getText: vi.fn(() => ""),
      } as unknown as vscode.TextDocument;

      expect(() => {
        editor.provider.resolveCustomTextEditor(
          emptyMockDocument,
          editor.webviewPanel,
          {} as vscode.CancellationToken
        );
      }).not.toThrow();
    });

    test("should create HTML that loads the webview bundle as an ES module", () => {
      editor.provider.resolveCustomTextEditor(
        editor.document,
        editor.webviewPanel,
        {} as vscode.CancellationToken
      );

      expect(editor.webview.html).toContain('<script type="module"');
      expect(editor.webview.html).toContain("</html>");
    });

    test("should include webview resources in HTML", () => {
      editor.provider.resolveCustomTextEditor(
        editor.document,
        editor.webviewPanel,
        {} as vscode.CancellationToken
      );

      expect(editor.asWebviewUri).toHaveBeenCalled();
    });
  });

  describe("HTML generation", () => {
    test("should generate valid HTML structure", () => {
      editor.provider.resolveCustomTextEditor(
        editor.document,
        editor.webviewPanel,
        {} as vscode.CancellationToken
      );

      expectLinesInOrder(editor.webview.html, ["<!DOCTYPE html>", "<html", "</html>"]);
    });

    test("should include meta tags for security", () => {
      editor.provider.resolveCustomTextEditor(
        editor.document,
        editor.webviewPanel,
        {} as vscode.CancellationToken
      );

      const html = editor.webview.html;
      expect(html).toContain('Content-Security-Policy');
    });
  });

  describe("diagram options", () => {
    test("should send diagram options to webview on initialization", () => {
      const mockConfig = {
        get: vi.fn((key: string, defaultValue: boolean) => {
          if (key === "showDocumentation") return true;
          if (key === "alwaysShowOccurrence") return false;
          if (key === "showType") return true;
          return defaultValue;
        }),
      };
      (vscode.workspace.getConfiguration as Mock).mockReturnValue(mockConfig);

      editor.provider.resolveCustomTextEditor(
        editor.document,
        editor.webviewPanel,
        {} as vscode.CancellationToken
      );

      // Should have called postMessage twice: once for updateSchema, once for updateDiagramOptions
      expect(editor.postMessage).toHaveBeenCalledWith(
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

    test("should use default values when configuration is not set", () => {
      const mockConfig = {
        get: vi.fn((_key: string, defaultValue: boolean) => defaultValue),
      };
      (vscode.workspace.getConfiguration as Mock).mockReturnValue(mockConfig);

      editor.provider.resolveCustomTextEditor(
        editor.document,
        editor.webviewPanel,
        {} as vscode.CancellationToken
      );

      expect(editor.postMessage).toHaveBeenCalledWith(
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
    // Use vi.spyOn on the CommandProcessor prototype so we can control the
    // return value without changing the provider's constructor.

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test("should send 'error' message with code and stack for runtime errors", async () => {
      vi.spyOn(CommandProcessor.prototype, "execute").mockReturnValue({
        success: false,
        errorKind: "runtime",
        error: "Command execution failed: Something exploded",
        stack: "Error: Something exploded\n  at executeAddElement (...)",
        schema: null,
        xmlContent: null,
      });

      const handler = resolveAndGetHandler(editor);
      handler({
        command: "executeCommand",
        data: { type: "addElement", payload: { parentId: "/schema", elementName: "x", elementType: "string" } },
      });

      // Wait for the async handleWebviewMessage microtask
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      // Verify correct message type was sent
      expect(editor.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: "error" })
      );
      // Must NOT have sent a commandResult for this runtime failure
      expect(editor.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: "commandResult" })
      );

      // Verify data fields via a typed extraction to avoid any-typed matchers
      type ErrorMsg = { command: string; data: { message: string; code: string; stack?: string } };
      type PostMsgFn = MockedFunction<(msg: ErrorMsg) => Promise<boolean>>;
      const sentMsg = (editor.postMessage as PostMsgFn).mock.calls[0][0];
      expect(sentMsg.data.message).toContain("Something exploded");
      expect(sentMsg.data.code).toBe("COMMAND_EXECUTION_ERROR");
      expect(sentMsg.data.stack).toContain("executeAddElement");
    });

    test("should send 'commandResult' with success:false for validation errors", async () => {
      vi.spyOn(CommandProcessor.prototype, "execute").mockReturnValue({
        success: false,
        errorKind: "validation",
        error: "Parent element not found: /element:missing",
        schema: null,
        xmlContent: null,
      });

      const handler = resolveAndGetHandler(editor);
      handler({
        command: "executeCommand",
        data: { type: "addElement", payload: { parentId: "/element:missing", elementName: "x", elementType: "string" } },
      });

      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      expect(editor.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "commandResult",
          data: {
            success: false,
            error: "Parent element not found: /element:missing",
          },
        })
      );
      // Must NOT have sent an error message for a validation failure
      expect(editor.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: "error" })
      );
    });

    test("should send 'error' message with code and stack when commandProcessor throws", async () => {
      vi.spyOn(CommandProcessor.prototype, "execute").mockImplementation(() => {
        throw new Error("Completely unexpected failure");
      });

      const handler = resolveAndGetHandler(editor);
      handler({
        command: "executeCommand",
        data: { type: "addElement", payload: { parentId: "/schema", elementName: "x", elementType: "string" } },
      });

      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      expect(editor.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: "error" })
      );

      // Verify data fields via a typed extraction to avoid any-typed matchers
      type ErrorMsg = { command: string; data: { message: string; code: string } };
      type PostMsgFn = MockedFunction<(msg: ErrorMsg) => Promise<boolean>>;
      const sentMsg = (editor.postMessage as PostMsgFn).mock.calls[0][0];
      expect(sentMsg.data.message).toContain("Completely unexpected failure");
      expect(sentMsg.data.code).toBe("COMMAND_EXECUTION_ERROR");
    });
    test("should send 'error' message with code when applyEdit returns false", async () => {
      vi.spyOn(CommandProcessor.prototype, "execute").mockReturnValue({
        success: true,
        // schema/xmlContent values are irrelevant — only the applyEdit branch is under test
        schema: {},
        xmlContent: "<xs:schema/>",
      });
      (vscode.workspace.applyEdit as Mock).mockResolvedValue(false);

      const handler = resolveAndGetHandler(editor);
      handler({
        command: "executeCommand",
        data: { type: "addElement", payload: { parentId: "/schema", elementName: "x", elementType: "string" } },
      });

      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      expect(editor.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: "error" })
      );
      // Must NOT send a commandResult for an edit-application failure
      expect(editor.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: "commandResult" })
      );

      // Verify data fields via a typed extraction to avoid any-typed matchers
      type ErrorMsg = { command: string; data: { message: string; code: string } };
      type PostMsgFn = MockedFunction<(msg: ErrorMsg) => Promise<boolean>>;
      const sentMsg = (editor.postMessage as PostMsgFn).mock.calls[0][0];
      expect(sentMsg.data.message).toBe("Failed to apply edit to the document.");
      expect(sentMsg.data.code).toBe("COMMAND_EXECUTION_ERROR");
    });

  });
});
