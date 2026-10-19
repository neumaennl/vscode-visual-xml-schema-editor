// Verifies that the packaged VSIX is self-contained: extracts it into a temp
// directory (outside the repo, so the dev node_modules can't mask missing files)
// and loads the extension entry point with the `vscode` module stubbed.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Node's internal module loader, which has no type declaration. */
type Load = (this: Module, request: string, ...rest: object[]) => object;

/**
 * Creates an object that accepts any property access and call, as a stand-in for
 * the `vscode` module, which only exists inside VS Code.
 *
 * @returns The stub
 */
function stub(): object {
  return new Proxy(function () {}, { get: (_, key) => (key === "prototype" ? {} : stub()) });
}

/**
 * Extracts a VSIX into a folder, with `unzip` or, on Windows, with its `tar.exe`.
 *
 * @param vsix - The VSIX file
 * @param dir - The folder to extract into
 * @throws {Error} If the file cannot be extracted
 */
function extract(vsix: string, dir: string): void {
  if (process.platform === "win32") {
    // Windows has no unzip; its bsdtar reads zip files. The full path avoids GNU tar from Git for Windows.
    const tar = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
    execFileSync(tar, ["-xf", resolve(vsix), "-C", dir]);
  } else {
    execFileSync("unzip", ["-q", resolve(vsix), "-d", dir]);
  }
}

/**
 * Extracts a VSIX into a temporary folder and loads its entry point with the
 * `vscode` module stubbed.
 *
 * @param vsix - The VSIX file
 * @returns The entry point of the extension (`main` in its `package.json`)
 * @throws {Error} If the VSIX cannot be extracted, the entry point fails to load, or it does not export `activate()`
 */
export function verifyVsix(vsix: string): string {
  const dir = mkdtempSync(join(tmpdir(), "vsix-verify-"));
  const loader = Module as typeof Module & { _load: Load };
  const originalLoad = loader._load;
  try {
    extract(vsix, dir);
    const extensionDir = join(dir, "extension");
    const require = createRequire(join(extensionDir, "package.json"));
    const { main } = require("./package.json") as { main: string };
    const vscode = stub();
    loader._load = function (request, ...rest): object {
      return request === "vscode" ? vscode : originalLoad.call(this, request, ...rest);
    };
    const extension = require(join(extensionDir, main)) as { activate?: object };
    if (typeof extension.activate !== "function") {
      throw new Error(`${main} does not export activate()`);
    }
    return main;
  } finally {
    loader._load = originalLoad;
    rmSync(dir, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const vsix = process.argv[2] ?? readdirSync(".").find((f) => f.endsWith(".vsix"));
  if (!vsix) {
    console.error("No .vsix found. Run `npm run package` first.");
    process.exit(1);
  }
  try {
    console.log(`✓ ${vsix}: ${verifyVsix(vsix)} loads and exports activate()`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${vsix}: ${message.split("\n")[0]}`);
    process.exitCode = 1;
  }
}
