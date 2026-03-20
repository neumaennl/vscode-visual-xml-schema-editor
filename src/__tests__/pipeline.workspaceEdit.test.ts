/**
 * Integration tests: WorkspaceEdit creation via SchemaEditorProvider.
 *
 * Verifies the full webviewProvider pipeline:
 *   executeCommand message → CommandProcessor → WorkspaceEdit → applyEdit → commandResult
 *
 * Tests that:
 * - Successful commands create a WorkspaceEdit, call applyEdit, and reply with
 *   commandResult { success: true }. The XML written into the edit is verified by
 *   unmarshalling it and inspecting schema object properties.
 * - Validation failures are routed to commandResult { success: false, error }.
 * - Runtime errors (thrown by CommandProcessor) are routed to an error message
 *   with code COMMAND_EXECUTION_ERROR.
 * - applyEdit returning false produces an error message with COMMAND_EXECUTION_ERROR.
 *
 * Undo/redo semantics: every successful schema edit is applied via
 * WorkspaceEdit, which is VS Code's standard mechanism for undoable edits.
 * The test environment mocks applyEdit; real undo/redo therefore runs inside
 * VS Code, not Jest.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import * as vscode from "vscode";
import { SchemaEditorProvider } from "../webviewProvider";
import { CommandProcessor } from "../commandProcessor";
import { schema } from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";

// ─── Test infrastructure ──────────────────────────────────────────────────────

const SIMPLE_SCHEMA_XML = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;

const mockPostMessage = jest.fn<Promise<boolean>, [unknown]>();

/** Builds the mocked VS Code objects required by SchemaEditorProvider. */
function buildMocks(): {
  provider: SchemaEditorProvider;
  document: vscode.TextDocument;
  webview: vscode.Webview;
  webviewPanel: vscode.WebviewPanel;
} {
  // eslint-disable-next-line no-restricted-syntax -- partial stub; unused VS Code context fields omitted
  const context = {
    extensionUri: vscode.Uri.file("/ext"),
    subscriptions: [],
  } as unknown as vscode.ExtensionContext;

  // eslint-disable-next-line no-restricted-syntax -- partial stub; unused Webview fields omitted
  const webview = {
    options: {},
    html: "",
    asWebviewUri: jest.fn((u: vscode.Uri) => u),
    postMessage: mockPostMessage,
    onDidReceiveMessage: jest.fn(),
  } as unknown as vscode.Webview;

  // eslint-disable-next-line no-restricted-syntax -- partial stub; unused WebviewPanel fields omitted
  const webviewPanel = {
    webview,
    onDidDispose: jest.fn(),
  } as unknown as vscode.WebviewPanel;

  const lines = SIMPLE_SCHEMA_XML.split("\n");
  const lastLineText = lines[lines.length - 1] ?? "";
  // eslint-disable-next-line no-restricted-syntax -- partial stub; unused TextDocument fields omitted
  const document = {
    uri: vscode.Uri.file("/test/schema.xsd"),
    getText: jest.fn(() => SIMPLE_SCHEMA_XML),
    lineCount: SIMPLE_SCHEMA_XML.split("\n").length,
    lineAt: jest.fn(() => ({ text: lastLineText })),
  } as unknown as vscode.TextDocument;

  const provider = new SchemaEditorProvider(context);
  return { provider, document, webview, webviewPanel };
}

/**
 * Resolves the editor and extracts the message-handler registered via
 * webview.onDidReceiveMessage.
 */
function resolveAndGetHandler(
  provider: SchemaEditorProvider,
  document: vscode.TextDocument,
  webviewPanel: vscode.WebviewPanel
): (msg: unknown) => void {
  provider.resolveCustomTextEditor(document, webviewPanel, {} as vscode.CancellationToken);

  type ListenerFn = (msg: unknown) => void;
  type OnReceiveMock = jest.MockedFunction<(listener: ListenerFn) => vscode.Disposable>;
  const onReceiveMock = webviewPanel.webview.onDidReceiveMessage as OnReceiveMock;
  const handler = onReceiveMock.mock.calls[0][0];
  jest.clearAllMocks();
  return handler;
}

/** Waits for all pending microtasks to flush. */
const flushMicrotasks = (): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Integration: WorkspaceEdit via SchemaEditorProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (vscode.workspace.applyEdit as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("success path", () => {
    it("creates a WorkspaceEdit and replies with commandResult { success: true }", async () => {
      const { provider, document, webview, webviewPanel } = buildMocks();
      const handler = resolveAndGetHandler(provider, document, webviewPanel);

      handler({
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: { parentId: "schema", elementName: "order", elementType: "xs:string" },
        },
      });
      await flushMicrotasks();

      // WorkspaceEdit must have been created and applied
      expect(vscode.WorkspaceEdit).toHaveBeenCalled();
      const editInstance = (vscode.WorkspaceEdit as jest.Mock).mock.results[0].value as {
        replace: jest.Mock<void, [vscode.Uri, vscode.Range, string]>;
      };
      expect(editInstance.replace).toHaveBeenCalledWith(
        document.uri,
        expect.any(vscode.Range),
        expect.any(String)
      );
      // Verify the written XML parses correctly and contains the new element
      const writtenXml = editInstance.replace.mock.calls[0][2];
      const parsedSchema = unmarshal(schema, writtenXml);
      expect(toArray(parsedSchema.element).some((e) => e.name === "order")).toBe(true);
      expect(vscode.workspace.applyEdit).toHaveBeenCalled();

      // Webview must receive commandResult { success: true }
      expect(webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "commandResult",
          data: { success: true },
        })
      );
      expect(webview.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: "error" })
      );
    });
  });

  describe("validation failure path", () => {
    it("routes validation errors to commandResult { success: false }", async () => {
      const { provider, document, webview, webviewPanel } = buildMocks();
      const handler = resolveAndGetHandler(provider, document, webviewPanel);

      handler({
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: { parentId: "schema", elementName: "person", elementType: "xs:string" },
        },
      });
      await flushMicrotasks();

      // WorkspaceEdit must NOT be applied for a validation failure
      expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();

      // Webview must receive commandResult { success: false, error: ... }
      expect(webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "commandResult",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() is typed as `any` in @types/jest; nested use is idiomatic Jest
          data: expect.objectContaining({ success: false }),
        })
      );
      expect(webview.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: "error" })
      );
    });
  });

  describe("runtime error path", () => {
    it("routes CommandProcessor runtime throws to error { code: COMMAND_EXECUTION_ERROR }", async () => {
      const { provider, document, webview, webviewPanel } = buildMocks();
      jest.spyOn(CommandProcessor.prototype, "execute").mockImplementation(() => {
        throw new Error("Unexpected failure in executor");
      });
      const handler = resolveAndGetHandler(provider, document, webviewPanel);

      handler({
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: { parentId: "schema", elementName: "x", elementType: "xs:string" },
        },
      });
      await flushMicrotasks();

      expect(webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: "error" })
      );
      expect(webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "error",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() is typed as `any` in @types/jest; nested use is idiomatic Jest
          data: expect.objectContaining({ code: "COMMAND_EXECUTION_ERROR" }),
        })
      );
      expect(webview.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: "commandResult" })
      );
    });

    it("routes CommandProcessor errorKind 'runtime' to error message", async () => {
      const { provider, document, webview, webviewPanel } = buildMocks();
      jest.spyOn(CommandProcessor.prototype, "execute").mockReturnValue({
        success: false,
        errorKind: "runtime",
        error: "Something went wrong internally",
        stack: "Error: Something went wrong internally\n  at ...",
        schema: null,
        xmlContent: null,
      });
      const handler = resolveAndGetHandler(provider, document, webviewPanel);

      handler({
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: { parentId: "schema", elementName: "y", elementType: "xs:string" },
        },
      });
      await flushMicrotasks();

      expect(webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "error",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() is typed as `any` in @types/jest; nested use is idiomatic Jest
          data: expect.objectContaining({
            code: "COMMAND_EXECUTION_ERROR",
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.stringContaining() is typed as `any` in @types/jest; nested use is idiomatic Jest
            stack: expect.stringContaining("Something went wrong internally"),
          }),
        })
      );
    });
  });

  describe("applyEdit failure path", () => {
    it("sends error message when vscode.workspace.applyEdit returns false", async () => {
      (vscode.workspace.applyEdit as jest.Mock).mockResolvedValue(false);

      const { provider, document, webview, webviewPanel } = buildMocks();
      const handler = resolveAndGetHandler(provider, document, webviewPanel);

      handler({
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: { parentId: "schema", elementName: "order", elementType: "xs:string" },
        },
      });
      await flushMicrotasks();

      expect(webview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "error",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() is typed as `any` in @types/jest; nested use is idiomatic Jest
          data: expect.objectContaining({ code: "COMMAND_EXECUTION_ERROR" }),
        })
      );
      expect(webview.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: "commandResult" })
      );
    });
  });

  describe("undo/redo semantics", () => {
    it("applies edits via WorkspaceEdit (VS Code owns undo/redo stack)", async () => {
      const { provider, document, webview, webviewPanel } = buildMocks();
      const handler = resolveAndGetHandler(provider, document, webviewPanel);

      // Apply two sequential commands
      handler({
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: { parentId: "schema", elementName: "order", elementType: "xs:string" },
        },
      });
      await flushMicrotasks();

      handler({
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: { parentId: "schema", elementName: "invoice", elementType: "xs:string" },
        },
      });
      await flushMicrotasks();

      // Each command must have produced a separate WorkspaceEdit call
      expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(2);
      // Both edits must have been reported as successful
      expect(webview.postMessage).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          command: "commandResult",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() is typed as `any` in @types/jest; nested use is idiomatic Jest
          data: expect.objectContaining({ success: true }),
        })
      );
      expect(webview.postMessage).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          command: "commandResult",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() is typed as `any` in @types/jest; nested use is idiomatic Jest
          data: expect.objectContaining({ success: true }),
        })
      );
    });
  });
});
