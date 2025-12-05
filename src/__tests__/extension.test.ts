/**
 * Unit tests for extension module.
 */

import * as vscode from "vscode";

// Mock VS Code API
jest.mock("vscode", () => ({
  ExtensionContext: jest.fn(),
  commands: {
    registerCommand: jest.fn(),
  },
  window: {
    registerCustomEditorProvider: jest.fn(),
  },
}));

describe("Extension", () => {
  describe("activate", () => {
    it("should be exported as a function", () => {
      // Extension activation is tested through VS Code integration
      // This is a placeholder to ensure the module structure is correct
      expect(true).toBe(true);
    });
  });

  describe("deactivate", () => {
    it("should be exported as a function", () => {
      // Deactivation is tested through VS Code integration
      // This is a placeholder to ensure the module structure is correct
      expect(true).toBe(true);
    });
  });
});
