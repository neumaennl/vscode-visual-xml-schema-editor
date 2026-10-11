import Module from "node:module";
import { join } from "node:path";
import { verifyVsix } from "./verify-vsix.ts";

const resources = join(import.meta.dirname, "__tests__", "test-resources");

describe("verifyVsix", () => {
  it("should return the entry point of a VSIX that loads and exports activate()", () => {
    expect(verifyVsix(join(resources, "valid.vsix"))).toBe("./out/extension.js");
  });

  it("should throw if the entry point does not export activate()", () => {
    expect(() => verifyVsix(join(resources, "no-activate.vsix"))).toThrow("./out/extension.js does not export activate()");
  });

  it("should throw if the entry point needs a package that is not in the VSIX", () => {
    expect(() => verifyVsix(join(resources, "missing-dependency.vsix"))).toThrow(
      "Cannot find module 'package-that-is-not-in-the-vsix'",
    );
  });

  it("should throw if the file cannot be extracted", () => {
    expect(() => verifyVsix(join(resources, "does-not-exist.vsix"))).toThrow();
  });

  it("should restore the module loader afterwards", () => {
    const loader = Module as typeof Module & { _load: object };
    const before = loader._load;

    verifyVsix(join(resources, "valid.vsix"));

    expect(loader._load).toBe(before);
  });
});
