/**
 * Unit tests for `SchemaEditorProvider`.
 */

import * as vscode from "vscode";
import { SchemaEditorProvider } from "./webviewProvider.js";
import { CommandProcessor } from "./commandProcessor.js";
import { resolveAndGetHandler, stubEditor } from "./__tests__/providerTestHelpers.js";
import type { EditorStubs } from "./__tests__/providerTestHelpers.js";
import { expectLinesInOrder } from "./__tests__/textTestHelpers.js";
import type { Mock, MockedFunction } from "vitest";

/** The error message that the provider sends to the webview. */
interface ErrorMessage {
  command: string;
  data: { message: string; code: string; stack?: string };
}

/**
 * Sends an `executeCommand` message that adds the element `x` to the given parent, and waits for the
 * provider to handle it.
 *
 * @param editor - The stubbed editor
 * @param parentId - The ID of the parent
 */
async function sendAddElement(editor: EditorStubs, parentId: string): Promise<void> {
  resolveAndGetHandler(editor)({
    command: "executeCommand",
    data: { type: "addElement", payload: { parentId, elementName: "x", elementType: "string" } },
  });
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/**
 * Asserts that the provider sent an error message and no `commandResult`, and returns the error message.
 *
 * @param editor - The stubbed editor
 * @returns The first message sent, the error message
 */
function sentError(editor: EditorStubs): ErrorMessage {
  expect(editor.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: "error" }));
  expect(editor.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ command: "commandResult" }));
  return (editor.postMessage as MockedFunction<(msg: ErrorMessage) => Promise<boolean>>).mock.calls[0]![0];
}

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
      editor.provider.resolveCustomTextEditor(editor.document, editor.webviewPanel, {} as vscode.CancellationToken);

      expect(editor.webview.options).toMatchObject({
        enableScripts: true,
        localResourceRoots: expect.any(Array) as unknown[],
      });
    });

    test("should set HTML content in webview", () => {
      editor.provider.resolveCustomTextEditor(editor.document, editor.webviewPanel, {} as vscode.CancellationToken);

      expect(editor.webview.html).toBeTruthy();
      expect(editor.webview.html.length).toBeGreaterThan(0);
    });

    test("should register document change listener", () => {
      editor.provider.resolveCustomTextEditor(editor.document, editor.webviewPanel, {} as vscode.CancellationToken);

      expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
    });

    test("should register message listener from webview", () => {
      editor.provider.resolveCustomTextEditor(editor.document, editor.webviewPanel, {} as vscode.CancellationToken);

      expect(editor.webview.onDidReceiveMessage).toHaveBeenCalled();
    });

    test("should parse and send schema to webview", () => {
      editor.provider.resolveCustomTextEditor(editor.document, editor.webviewPanel, {} as vscode.CancellationToken);

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
        editor.provider.resolveCustomTextEditor(emptyMockDocument, editor.webviewPanel, {} as vscode.CancellationToken);
      }).not.toThrow();
    });

    test("should create HTML that loads the webview bundle as an ES module", () => {
      editor.provider.resolveCustomTextEditor(editor.document, editor.webviewPanel, {} as vscode.CancellationToken);

      expect(editor.webview.html).toContain('<script type="module"');
      expect(editor.webview.html).toContain("</html>");
    });

    test("should include webview resources in HTML", () => {
      editor.provider.resolveCustomTextEditor(editor.document, editor.webviewPanel, {} as vscode.CancellationToken);

      expect(editor.asWebviewUri).toHaveBeenCalled();
    });
  });

  describe("HTML generation", () => {
    test("should generate valid HTML structure", () => {
      editor.provider.resolveCustomTextEditor(editor.document, editor.webviewPanel, {} as vscode.CancellationToken);

      expectLinesInOrder(editor.webview.html, ["<!DOCTYPE html>", "<html", "</html>"]);
    });

    test("should include meta tags for security", () => {
      editor.provider.resolveCustomTextEditor(editor.document, editor.webviewPanel, {} as vscode.CancellationToken);

      const html = editor.webview.html;
      expect(html).toContain("Content-Security-Policy");
    });
  });

  describe("diagram options", () => {
    test.each([
      [
        "the configured values",
        { showDocumentation: true, alwaysShowOccurrence: false, showType: true },
        { showDocumentation: true, alwaysShowOccurrence: false, showType: true },
      ],
      [
        "the default values when nothing is configured",
        {},
        { showDocumentation: false, alwaysShowOccurrence: false, showType: false },
      ],
    ])(
      "should send %s as diagram options on initialization",
      (_case, configured: Record<string, boolean>, expected) => {
        const mockConfig = {
          get: vi.fn((key: string, defaultValue: boolean) => configured[key] ?? defaultValue),
        };
        (vscode.workspace.getConfiguration as Mock).mockReturnValue(mockConfig);

        editor.provider.resolveCustomTextEditor(editor.document, editor.webviewPanel, {} as vscode.CancellationToken);

        expect(editor.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ command: "updateDiagramOptions", data: expected })
        );
      }
    );
  });

  // The routing of validation failures is tested with the real validator in pipeline.workspaceEdit.test.ts
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

      await sendAddElement(editor, "/schema");

      // Verify correct message type was sent
      const sentMsg = sentError(editor);
      expect(sentMsg.data.message).toContain("Something exploded");
      expect(sentMsg.data.code).toBe("COMMAND_EXECUTION_ERROR");
      expect(sentMsg.data.stack).toContain("executeAddElement");
    });

    test("should send 'error' message with code and stack when commandProcessor throws", async () => {
      vi.spyOn(CommandProcessor.prototype, "execute").mockImplementation(() => {
        throw new Error("Completely unexpected failure");
      });

      await sendAddElement(editor, "/schema");

      const sentMsg = sentError(editor);
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

      await sendAddElement(editor, "/schema");

      const sentMsg = sentError(editor);
      expect(sentMsg.data.message).toBe("Failed to apply edit to the document.");
      expect(sentMsg.data.code).toBe("COMMAND_EXECUTION_ERROR");
    });
  });
});
