import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { verifyVsix } from "./verify-vsix.ts";

const resources = join(import.meta.dirname, "__tests__", "test-resources");

describe("verifyVsix", () => {
  it("should return the entry point of a VSIX that loads and exports activate()", async () => {
    await expect(verifyVsix(join(resources, "valid.vsix"))).resolves.toBe("./out/extension.js");
  });

  // Vitest loads ES modules itself and would not apply the stand-in for `vscode`, so this runs the script in Node
  it("should accept a VSIX that is an ES module", () => {
    const output = execFileSync(process.execPath, [join(import.meta.dirname, "verify-vsix.ts"), join(resources, "valid-esm.vsix")], {
      encoding: "utf8",
    });

    expect(output).toContain("./out/extension.js loads and exports activate()");
  });

  it("should throw if the entry point does not export activate()", async () => {
    await expect(verifyVsix(join(resources, "no-activate.vsix"))).rejects.toThrow("./out/extension.js does not export activate()");
  });

  it("should throw if the entry point needs a package that is not in the VSIX", async () => {
    await expect(verifyVsix(join(resources, "missing-dependency.vsix"))).rejects.toThrow(
      "Cannot find module 'package-that-is-not-in-the-vsix'",
    );
  });

  it("should throw if the file cannot be extracted", async () => {
    await expect(verifyVsix(join(resources, "does-not-exist.vsix"))).rejects.toThrow();
  });

  it("should remove the stand-in for the vscode module afterwards", async () => {
    await verifyVsix(join(resources, "valid.vsix"));

    expect(() => createRequire(import.meta.url).resolve("vscode")).toThrow("Cannot find module 'vscode'");
  });
});
