/**
 * Unit tests for extension module.
 * Note: Full VS Code extension testing requires @vscode/test-electron.
 * These tests verify module structure and exported functions.
 */

describe("Extension module", () => {
  describe("module structure", () => {
    it("should have activate function exported", async () => {
      // Dynamic import to avoid VS Code API initialization issues
      const module = await import("../extension");
      expect(typeof module.activate).toBe("function");
    });

    it("should have deactivate function exported", async () => {
      const module = await import("../extension");
      expect(typeof module.deactivate).toBe("function");
    });
  });
});
