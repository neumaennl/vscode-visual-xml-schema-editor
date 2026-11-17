/**
 * Integration tests: `WorkspaceEdit` creation via `SchemaEditorProvider`.
 *
 * Verifies the full `webviewProvider` pipeline:
 *   `executeCommand` message → `CommandProcessor` → `WorkspaceEdit` → `applyEdit` → `commandResult`
 *
 * Tests that:
 * - Successful commands create a `WorkspaceEdit`, call `applyEdit`, and reply with
 *   `commandResult { success: true }`. The XML written into the edit is verified by
 *   unmarshalling it and inspecting schema object properties.
 * - Validation failures of the real validator are routed to `commandResult { success: false, error }`.
 *
 * How the provider routes runtime errors and failed edits is tested with a controlled
 * `CommandProcessor` result in `webviewProvider.test.ts`.
 *
 * Undo/redo semantics: every successful schema edit is applied via
 * `WorkspaceEdit`, which is VS Code's standard mechanism for undoable edits.
 * The test environment mocks `applyEdit`; real undo/redo therefore runs inside
 * VS Code, not in the tests.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import * as vscode from "vscode";
import { schema } from "../../shared/types.js";
import { resolveAndGetHandler, stubEditor } from "./providerTestHelpers.js";
import type { Mock } from "vitest";
import { schemaXmlWith } from "../../shared/__tests__/schemaTestHelpers.js";

// ─── Test infrastructure ──────────────────────────────────────────────────────

const SIMPLE_SCHEMA_XML = schemaXmlWith(`<xs:element name="person" type="xs:string"/>`);

/** Waits for all pending microtasks to flush. */
const flushMicrotasks = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Sends an `executeCommand` message that adds the top-level element with the given name, and waits for it.
 *
 * @param handler - The message handler of the provider
 * @param elementName - The name of the new element
 */
async function sendAddElement(handler: (msg: unknown) => void, elementName: string): Promise<void> {
  handler({
    command: "executeCommand",
    data: { type: "addElement", payload: { parentId: "/schema", elementName, elementType: "xs:string" } },
  });
  await flushMicrotasks();
}

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
    test("should create a WorkspaceEdit and replies with commandResult { success: true }", async () => {
      const editor = stubEditor(SIMPLE_SCHEMA_XML);
      const handler = resolveAndGetHandler(editor);

      await sendAddElement(handler, "order");

      // WorkspaceEdit must have been created and applied
      expect(vscode.WorkspaceEdit).toHaveBeenCalled();
      const editInstance = (vscode.WorkspaceEdit as Mock).mock.results[0]!.value as {
        replace: Mock<(uri: vscode.Uri, range: vscode.Range, text: string) => void>;
      };
      expect(editInstance.replace).toHaveBeenCalledWith(
        editor.document.uri,
        expect.any(vscode.Range),
        expect.any(String)
      );
      // Verify the written XML parses correctly and contains the new element
      const writtenXml = editInstance.replace.mock.calls[0]![2];
      const parsedSchema = unmarshal(schema, writtenXml);
      expect((parsedSchema.element ?? []).some((e) => e.name === "order")).toBe(true);
      expect(vscode.workspace.applyEdit).toHaveBeenCalled();

      // Webview must receive commandResult { success: true }
      expect(editor.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "commandResult",
          data: { success: true },
        })
      );
      expect(editor.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ command: "error" }));
    });
  });

  describe("validation failure path", () => {
    test("should route validation errors to commandResult { success: false }", async () => {
      const editor = stubEditor(SIMPLE_SCHEMA_XML);
      const handler = resolveAndGetHandler(editor);

      await sendAddElement(handler, "person");

      // WorkspaceEdit must NOT be applied for a validation failure
      expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();

      // Webview must receive commandResult { success: false, error: ... }
      expect(editor.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "commandResult",
          data: { success: false, error: "Cannot add element: duplicate element name 'person' in schema" },
        })
      );
      expect(editor.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ command: "error" }));
    });
  });

  describe("undo/redo semantics", () => {
    test("should apply edits via WorkspaceEdit (VS Code owns undo/redo stack)", async () => {
      const editor = stubEditor(SIMPLE_SCHEMA_XML);
      const handler = resolveAndGetHandler(editor);

      // Apply two sequential commands
      await sendAddElement(handler, "order");

      await sendAddElement(handler, "invoice");

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
