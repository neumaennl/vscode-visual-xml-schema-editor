// Verifies that the packaged VSIX is self-contained: extracts it into a temp
// directory (outside the repo, so the dev node_modules can't mask missing files)
// and loads the extension entry point with the `vscode` module stubbed. The stub is
// a package in the temp directory's node_modules/, where Node's normal lookup finds
// it for `import` and `require()` alike; every other package must come from the VSIX.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Source of the stand-in for the `vscode` module, which only exists inside VS Code:
 * an object that accepts any property access and call. It has no `then`, so that it
 * is not taken for a promise when a module that exposes it is awaited. CommonJS, so
 * that both `require()` and `import` can load it.
 */
const VSCODE_STUB_SOURCE = `const stub = () =>
  new Proxy(function () {}, {
    get: (_, key) => (key === "then" ? undefined : key === "prototype" ? {} : stub()),
  });
module.exports = stub();
`;

/**
 * Writes the stand-in for the `vscode` module as a package into `node_modules/` of a folder.
 *
 * @param dir - The folder that contains the extracted extension
 */
function addVscodeStub(dir: string): void {
  const stubDir = join(dir, "node_modules", "vscode");
  mkdirSync(stubDir, { recursive: true });
  writeFileSync(join(stubDir, "package.json"), JSON.stringify({ name: "vscode", main: "index.cjs" }));
  writeFileSync(join(stubDir, "index.cjs"), VSCODE_STUB_SOURCE);
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
 * Extracts a VSIX into a temporary folder and loads its entry point (an ES module or
 * CommonJS) with the `vscode` module stubbed.
 *
 * @param vsix - The VSIX file
 * @returns The entry point of the extension (`main` in its `package.json`)
 * @throws {Error} If the VSIX cannot be extracted, the entry point fails to load, or it does not export `activate()`
 */
export async function verifyVsix(vsix: string): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "vsix-verify-"));
  try {
    extract(vsix, dir);
    addVscodeStub(dir);
    const extensionDir = join(dir, "extension");
    const { main } = JSON.parse(readFileSync(join(extensionDir, "package.json"), "utf8")) as { main: string };
    const extension = (await import(pathToFileURL(join(extensionDir, main)).href)) as { activate?: object };
    if (typeof extension.activate !== "function") {
      throw new Error(`${main} does not export activate()`);
    }
    return main;
  } finally {
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
    console.log(`✓ ${vsix}: ${await verifyVsix(vsix)} loads and exports activate()`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${vsix}: ${message.split("\n")[0]}`);
    process.exitCode = 1;
  }
}
