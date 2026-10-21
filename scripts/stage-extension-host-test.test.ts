import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { stage } from "./stage-extension-host-test.ts";

/**
 * Writes a file and creates its folders.
 *
 * @param path - The file
 * @param content - The content
 */
function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/**
 * Reads a file as text.
 *
 * @param path - The file
 * @returns The content
 */
function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("stage", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "stage-test-"));
    write(join(root, "package.json"), '{"name":"ext"}');
    write(join(root, "out", "src", "extension.js"), "// extension");
    write(join(root, ".vscode-test", "out", "mockWebview.js"), "// mock");
    write(join(root, "exampleFiles", "example.xsd"), "<xs:schema/>");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("assembles a copy of the extension with the mock as its webview", () => {
    stage(root);

    const extension = join(root, ".vscode-test", "extension");
    expect(read(join(extension, "package.json"))).toBe('{"name":"ext"}');
    expect(read(join(extension, "out", "src", "extension.js"))).toBe("// extension");
    expect(read(join(extension, "webview", "main.js"))).toBe("// mock");
    expect(read(join(extension, "webview", "styles.css"))).toBe("");
  });

  it("puts a copy of the example schema into the workspace", () => {
    stage(root);

    expect(read(join(root, ".vscode-test", "workspace", "example.xsd"))).toBe("<xs:schema/>");
  });

  it("keeps the secondary side bar with the chat view closed in the workspace", () => {
    stage(root);

    const settings = read(join(root, ".vscode-test", "workspace", ".vscode", "settings.json"));
    expect(JSON.parse(settings)).toEqual({ "workbench.secondarySideBar.defaultVisibility": "hidden" });
  });

  it("removes leftovers of an earlier run but keeps the downloaded VS Code", () => {
    stage(root);
    write(join(root, ".vscode-test", "extension", "old.js"), "");
    write(join(root, ".vscode-test", "workspace", "old.xsd"), "");
    write(join(root, ".vscode-test", "vscode-linux-x64-1.125.0", "is-complete"), "");

    stage(root);

    expect(existsSync(join(root, ".vscode-test", "extension", "old.js"))).toBe(false);
    expect(existsSync(join(root, ".vscode-test", "workspace", "old.xsd"))).toBe(false);
    expect(existsSync(join(root, ".vscode-test", "vscode-linux-x64-1.125.0", "is-complete"))).toBe(true);
  });

  it("fails if the extension was not compiled", () => {
    rmSync(join(root, "out"), { recursive: true });

    expect(() => stage(root)).toThrow(/ENOENT.*out/);
  });

  it("fails if the tests were not compiled", () => {
    rmSync(join(root, ".vscode-test", "out"), { recursive: true });

    expect(() => stage(root)).toThrow(/mockWebview\.js/);
  });
});
