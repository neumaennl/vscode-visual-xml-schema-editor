/**
 * Unit tests for extension module.
 */

import { vi, MockedFunction, describe, it, expect, beforeEach } from 'vitest';
import * as vscode from "vscode";
import { activate, deactivate } from "./extension";

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
      const mockCalls = registerCommandMock.mock.calls;
      const commandHandler = mockCalls.find(
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

      const mockCalls = registerCommandMock.mock.calls;
      const commandHandler = mockCalls.find(
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

  describe("deactivate", () => {
    it("should complete without errors", () => {
      expect(() => deactivate()).not.toThrow();
    });
  });
});
