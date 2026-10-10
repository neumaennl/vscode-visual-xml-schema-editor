// Verifies that the packaged VSIX is self-contained: extracts it into a temp
// directory (outside the repo, so the dev node_modules can't mask missing files)
// and loads the extension entry point with the `vscode` module stubbed.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/** Node's internal module loader, which has no type declaration. */
type Load = (this: Module, request: string, ...rest: object[]) => object;

const vsix = process.argv[2] ?? readdirSync(".").find((f) => f.endsWith(".vsix"));
if (!vsix) {
  console.error("No .vsix found. Run `npm run package` first.");
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "vsix-verify-"));
try {
  if (process.platform === "win32") {
    // Windows has no unzip; its bsdtar reads zip files. The full path avoids GNU tar from Git for Windows.
    const tar = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
    execFileSync(tar, ["-xf", resolve(vsix), "-C", dir]);
  } else {
    execFileSync("unzip", ["-q", resolve(vsix), "-d", dir]);
  }
  const extensionDir = join(dir, "extension");
  const require = createRequire(join(extensionDir, "package.json"));
  const { main } = require("./package.json") as { main: string };

  const stub = (): object =>
    new Proxy(function () {}, { get: (_, key) => (key === "prototype" ? {} : stub()) });
  const vscode = stub();
  const loader = Module as typeof Module & { _load: Load };
  const originalLoad = loader._load;
  loader._load = function (request, ...rest): object {
    return request === "vscode" ? vscode : originalLoad.call(this, request, ...rest);
  };

  const extension = require(join(extensionDir, main)) as { activate?: object };
  if (typeof extension.activate !== "function") {
    throw new Error(`${main} does not export activate()`);
  }
  console.log(`✓ ${vsix}: ${main} loads and exports activate()`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`✗ ${vsix}: ${message.split("\n")[0]}`);
  process.exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
