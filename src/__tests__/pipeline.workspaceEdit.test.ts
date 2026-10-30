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
 * VS Code, not in the tests.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import * as vscode from "vscode";
import { CommandProcessor } from "../commandProcessor.js";
import { schema } from "../../shared/types.js";
import { toArray } from "../../shared/schemaUtils.js";
import { resolveAndGetHandler, stubEditor } from "./providerTestHelpers.js";
import type { Mock } from "vitest";
import { schemaXmlWith } from "./schemaTestHelpers.js";

// ─── Test infrastructure ──────────────────────────────────────────────────────

const SIMPLE_SCHEMA_XML = schemaXmlWith(`<xs:element name="person" type="xs:string"/>`);

/** Waits for all pending microtasks to flush. */
const flushMicrotasks = (): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Integration: WorkspaceEdit via SchemaEditorProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.workspace.applyEdit as Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("success path", () => {
    test("creates a WorkspaceEdit and replies with commandResult { success: true }", async () => {
      const editor = stubEditor(SIMPLE_SCHEMA_XML);
      const handler = resolveAndGetHandler(editor);

      handler({
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: { parentId: "/schema", elementName: "order", elementType: "xs:string" },
        },
      });
      await flushMicrotasks();

      // WorkspaceEdit must have been created and applied
      expect(vscode.WorkspaceEdit).toHaveBeenCalled();
      const editInstance = (vscode.WorkspaceEdit as Mock).mock.results[0].value as {
        replace: Mock<(uri: vscode.Uri, range: vscode.Range, text: string) => void>;
      };
      expect(editInstance.replace).toHaveBeenCalledWith(
        editor.document.uri,
        expect.any(vscode.Range),
        expect.any(String)
      );
      // Verify the written XML parses correctly and contains the new element
      const writtenXml = editInstance.replace.mock.calls[0][2];
      const parsedSchema = unmarshal(schema, writtenXml);
      expect(toArray(parsedSchema.element).some((e) => e.name === "order")).toBe(true);
      expect(vscode.workspace.applyEdit).toHaveBeenCalled();

      // Webview must receive commandResult { success: true }
      expect(editor.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "commandResult",
          data: { success: true },
        })
      );
      expect(editor.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: "error" })
      );
    });
  });

  describe("validation failure path", () => {
    test("routes validation errors to commandResult { success: false }", async () => {
      const editor = stubEditor(SIMPLE_SCHEMA_XML);
      const handler = resolveAndGetHandler(editor);

      handler({
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: { parentId: "/schema", elementName: "person", elementType: "xs:string" },
        },
      });
      await flushMicrotasks();

      // WorkspaceEdit must NOT be applied for a validation failure
      expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();

      // Webview must receive commandResult { success: false, error: ... }
      expect(editor.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "commandResult",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() returns `any`; nesting asymmetric matchers is the intended use
          data: expect.objectContaining({ success: false }),
        })
      );
      expect(editor.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: "error" })
      );
    });
  });

  describe("runtime error path", () => {
    test("routes CommandProcessor runtime throws to error { code: COMMAND_EXECUTION_ERROR }", async () => {
      const editor = stubEditor(SIMPLE_SCHEMA_XML);
      vi.spyOn(CommandProcessor.prototype, "execute").mockImplementation(() => {
        throw new Error("Unexpected failure in executor");
      });
      const handler = resolveAndGetHandler(editor);

      handler({
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: { parentId: "/schema", elementName: "x", elementType: "xs:string" },
        },
      });
      await flushMicrotasks();

      expect(editor.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: "error" })
      );
      expect(editor.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "error",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() returns `any`; nesting asymmetric matchers is the intended use
          data: expect.objectContaining({ code: "COMMAND_EXECUTION_ERROR" }),
        })
      );
      expect(editor.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: "commandResult" })
      );
    });

    test("routes CommandProcessor errorKind 'runtime' to error message", async () => {
      const editor = stubEditor(SIMPLE_SCHEMA_XML);
      vi.spyOn(CommandProcessor.prototype, "execute").mockReturnValue({
        success: false,
        errorKind: "runtime",
        error: "Something went wrong internally",
        stack: "Error: Something went wrong internally\n  at ...",
        schema: null,
        xmlContent: null,
      });
      const handler = resolveAndGetHandler(editor);

      handler({
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: { parentId: "/schema", elementName: "y", elementType: "xs:string" },
        },
      });
      await flushMicrotasks();

      expect(editor.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "error",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() returns `any`; nesting asymmetric matchers is the intended use
          data: expect.objectContaining({
            code: "COMMAND_EXECUTION_ERROR",
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.stringContaining() returns `any`; nesting asymmetric matchers is the intended use
            stack: expect.stringContaining("Something went wrong internally"),
          }),
        })
      );
    });
  });

  describe("applyEdit failure path", () => {
    test("sends error message when vscode.workspace.applyEdit returns false", async () => {
      (vscode.workspace.applyEdit as Mock).mockResolvedValue(false);

      const editor = stubEditor(SIMPLE_SCHEMA_XML);
      const handler = resolveAndGetHandler(editor);

      handler({
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: { parentId: "/schema", elementName: "order", elementType: "xs:string" },
        },
      });
      await flushMicrotasks();

      expect(editor.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "error",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() returns `any`; nesting asymmetric matchers is the intended use
          data: expect.objectContaining({ code: "COMMAND_EXECUTION_ERROR" }),
        })
      );
      expect(editor.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: "commandResult" })
      );
    });
  });

  describe("undo/redo semantics", () => {
    test("applies edits via WorkspaceEdit (VS Code owns undo/redo stack)", async () => {
      const editor = stubEditor(SIMPLE_SCHEMA_XML);
      const handler = resolveAndGetHandler(editor);

      // Apply two sequential commands
      handler({
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: { parentId: "/schema", elementName: "order", elementType: "xs:string" },
        },
      });
      await flushMicrotasks();

      handler({
        command: "executeCommand",
        data: {
          type: "addElement",
          payload: { parentId: "/schema", elementName: "invoice", elementType: "xs:string" },
        },
      });
      await flushMicrotasks();

      // Each command must have produced a separate WorkspaceEdit call
      expect(vscode.workspace.applyEdit).toHaveBeenCalledTimes(2);
      // Both edits must have been reported as successful
      expect(editor.postMessage).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          command: "commandResult",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() returns `any`; nesting asymmetric matchers is the intended use
          data: expect.objectContaining({ success: true }),
        })
      );
      expect(editor.postMessage).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          command: "commandResult",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() returns `any`; nesting asymmetric matchers is the intended use
          data: expect.objectContaining({ success: true }),
        })
      );
    });
  });
});
