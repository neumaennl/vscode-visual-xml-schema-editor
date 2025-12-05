/**
 * Unit tests for SchemaEditorProvider.
 * Note: Full VS Code custom editor testing requires @vscode/test-electron.
 * These tests verify class structure and exported functions.
 */

describe("SchemaEditorProvider", () => {
  describe("module structure", () => {
    it("should export SchemaEditorProvider class", async () => {
      const module = await import("../webviewProvider");
      expect(typeof module.SchemaEditorProvider).toBe("function");
    });

    it("should have required static properties", async () => {
      const module = await import("../webviewProvider");
      expect(module.SchemaEditorProvider.viewType).toBe("xmlSchemaVisualEditor.editor");
    });
  });
});
