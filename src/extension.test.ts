/**
 * Unit tests for extension module.
 */

import * as vscode from "vscode";
import { activate, deactivate } from "./extension.js";
import type { MockedFunction } from "vitest";

/**
 * Activates the extension and returns the handler of the command `xmlSchemaVisualEditor.openEditor`.
 *
 * @param context - The extension context to activate with
 * @returns The command handler
 * @throws {Error} If the command was not registered
 */
function activateAndGetOpenEditorHandler(context: vscode.ExtensionContext): (uri?: vscode.Uri) => Promise<void> {
  activate(context);
  const registerCommandMock = vscode.commands.registerCommand as MockedFunction<typeof vscode.commands.registerCommand>;
  const handler = registerCommandMock.mock.calls.find(([command]) => command === "xmlSchemaVisualEditor.openEditor")?.[1];
  if (!handler) {
    throw new Error("openEditor command handler not registered");
  }
  return handler as (uri?: vscode.Uri) => Promise<void>;
}

/**
 * Sets the active text editor of the VS Code mock to an editor showing the given file.
 *
 * @param fsPath - The path of the file, or undefined for no active editor
 */
function setActiveEditor(fsPath: string | undefined): void {
  const uri = fsPath === undefined ? undefined : vscode.Uri.file(fsPath);
  // eslint-disable-next-line no-restricted-syntax -- partial stub; the command only reads the document's file name and URI
  const editor = uri && ({ document: { fileName: fsPath, uri } } as unknown as vscode.TextEditor);
  Object.assign(vscode.window, { activeTextEditor: editor });
}

describe("Extension", () => {
  let mockContext: vscode.ExtensionContext;
  const registerCommandMock =
    vscode.commands.registerCommand as MockedFunction<
      typeof vscode.commands.registerCommand
    >;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Create mock context
    // eslint-disable-next-line no-restricted-syntax -- partial stub; unused VS Code context fields omitted
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;
  });

  describe("activate", () => {
    it("should register custom editor provider", () => {
      activate(mockContext);

      expect(vscode.window.registerCustomEditorProvider).toHaveBeenCalledWith(
        "xmlSchemaVisualEditor.editor",
        expect.any(Object),
        expect.objectContaining({
          webviewOptions: {
            retainContextWhenHidden: true,
          },
          supportsMultipleEditorsPerDocument: false,
        })
      );
    });

    it("should register openEditor command", () => {
      activate(mockContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        "xmlSchemaVisualEditor.openEditor",
        expect.any(Function)
      );
    });

    it("should add registrations to context subscriptions", () => {
      activate(mockContext);

      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });
  });

  describe("openEditor command", () => {
    it("should open file with custom editor when URI is provided", async () => {
      activate(mockContext);

      // Get the registered command handler
      const commandHandler = registerCommandMock.mock.calls.find(
        ([command]) => command === "xmlSchemaVisualEditor.openEditor"
      )?.[1];

      if (!commandHandler) {
        throw new Error("openEditor command handler not registered");
      }

      // Call command with XSD URI
      const testUri = vscode.Uri.file("/test/file.xsd");
      await commandHandler(testUri);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "vscode.openWith",
        testUri,
        "xmlSchemaVisualEditor.editor"
      );
    });

    it("should show error when non-XSD file is provided", async () => {
      activate(mockContext);

      const commandHandler = registerCommandMock.mock.calls.find(
        ([command]) => command === "xmlSchemaVisualEditor.openEditor"
      )?.[1];

      if (!commandHandler) {
        throw new Error("openEditor command handler not registered");
      }

      const testUri = vscode.Uri.file("/test/file.txt");
      await commandHandler(testUri);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Please select an XSD file to open in the visual editor."
      );
    });
  });

  describe("openEditor command without a file", () => {
    afterEach(() => {
      setActiveEditor(undefined);
    });

    it("should open the XSD file of the active editor", async () => {
      setActiveEditor("/test/schema.xsd");
      const handler = activateAndGetOpenEditorHandler(mockContext);

      await handler();

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "vscode.openWith",
        vscode.window.activeTextEditor!.document.uri,
        "xmlSchemaVisualEditor.editor"
      );
    });

    it("should show an error when the active editor shows a file that is not an XSD file", async () => {
      setActiveEditor("/test/notes.txt");
      const handler = activateAndGetOpenEditorHandler(mockContext);

      await handler();

      expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Please select an XSD file to open in the visual editor."
      );
    });

    it("should show an error when no editor is active", async () => {
      setActiveEditor(undefined);
      const handler = activateAndGetOpenEditorHandler(mockContext);

      await handler();

      expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Please select an XSD file to open in the visual editor."
      );
    });
  });

  describe("deactivate", () => {
    it("should complete without errors", () => {
      expect(() => deactivate()).not.toThrow();
    });
  });
});
