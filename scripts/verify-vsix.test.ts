import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyVsix } from "./verify-vsix.ts";

const resources = join(import.meta.dirname, "__tests__", "test-resources");

/**
 * Lists the temporary folders that verifyVsix() creates.
 *
 * @returns The names of the folders
 */
function tempFolders(): string[] {
  return readdirSync(tmpdir()).filter((name) => name.startsWith("vsix-verify-"));
}

describe("verifyVsix", () => {
  it("should return the entry point of a VSIX that loads and exports activate()", async () => {
    await expect(verifyVsix(join(resources, "valid.vsix"))).resolves.toBe("./out/extension.js");
  });

  it("should throw if the entry point does not export activate()", async () => {
    await expect(verifyVsix(join(resources, "no-activate.vsix"))).rejects.toThrow(
      "./out/extension.js does not export activate()",
    );
  });

  it("should throw if the entry point needs a package that is not in the VSIX", async () => {
    await expect(verifyVsix(join(resources, "missing-dependency.vsix"))).rejects.toThrow(
      "Cannot find package 'package-that-is-not-in-the-vsix'",
    );
  });

  it("should throw if the file cannot be extracted", async () => {
    await expect(verifyVsix(join(resources, "does-not-exist.vsix"))).rejects.toThrow();
  });

  it("should remove its temporary folder, also after an error", async () => {
    const before = tempFolders();

    await verifyVsix(join(resources, "valid.vsix"));
    await expect(verifyVsix(join(resources, "no-activate.vsix"))).rejects.toThrow();

    expect(tempFolders()).toEqual(before);
  });
});
