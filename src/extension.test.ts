/**
 * Unit tests for extension module.
 */

import * as vscode from "vscode";
import { activate, deactivate } from "./extension";

describe("Extension", () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mock context
    mockContext = {
      subscriptions: [],
    } as any;
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
      const registerCommandCall = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
        call => call[0] === "xmlSchemaVisualEditor.openEditor"
      );
      const commandHandler = registerCommandCall[1];

      // Call command with XSD URI
      const testUri = { fsPath: "/test/file.xsd" } as vscode.Uri;
      await commandHandler(testUri);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "vscode.openWith",
        testUri,
        "xmlSchemaVisualEditor.editor"
      );
    });

    it("should show error when non-XSD file is provided", async () => {
      activate(mockContext);

      const registerCommandCall = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(
        call => call[0] === "xmlSchemaVisualEditor.openEditor"
      );
      const commandHandler = registerCommandCall[1];

      const testUri = { fsPath: "/test/file.txt" } as vscode.Uri;
      await commandHandler(testUri);

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
