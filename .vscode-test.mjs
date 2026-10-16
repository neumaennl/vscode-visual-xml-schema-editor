// Configuration of `vscode-test` (@vscode/test-cli) for the tests in the extension
// host. `npm run test:extension-host` compiles and assembles everything first; see
// scripts/stage-extension-host-test.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "@vscode/test-cli";

const root = import.meta.dirname;
const { engines } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

export default defineConfig({
  // The lowest supported version. `npm run vscode:check` ensures the form `^x.y.z`.
  version: engines.vscode.replace(/^\^/, ""),
  // Relative to this file; `vscode-test` takes absolute paths literally, not as patterns.
  files: ".vscode-test/out/**/*.test.js",
  extensionDevelopmentPath: join(root, ".vscode-test/extension"),
  workspaceFolder: join(root, ".vscode-test/workspace"),
  launchArgs: ["--disable-extensions"],
  mocha: { timeout: 20000 },
});
