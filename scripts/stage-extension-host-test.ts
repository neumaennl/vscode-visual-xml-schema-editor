// Assembles what the extension-host tests (test/extension-host/) run on, inside
// `.vscode-test/`:
//   extension/  a copy of the built extension whose webview bundle is replaced by
//               the mock from test/extension-host/mockWebview.ts
//   workspace/  the workspace that VS Code opens, with a copy of the example schema
//               and settings that keep the chat view closed: its input box would
//               otherwise take the focus at startup, and the `undo` command would
//               then go to it instead of to the custom editor
// `out/` is copied, not linked: with a link (tried with VS Code 1.125), the
// extension activates, but the edit from the mock never reaches the document. Runtime
// dependencies resolve from the repository's node_modules/, because Node looks for
// them in the parent folders. Run it after `npm run compile-extension` and after
// compiling the tests with tsconfig.extension-host-test.json.
import { copyFileSync, cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** Settings of the workspace that the tests open. */
const WORKSPACE_SETTINGS = { "workbench.secondarySideBar.defaultVisibility": "hidden" };

/**
 * Creates `.vscode-test/extension/` and `.vscode-test/workspace/` from scratch. The
 * other contents of `.vscode-test/`, such as the downloaded VS Code, are kept.
 *
 * @param root - The repository root
 * @throws {Error} If a source file is missing, for example because nothing was compiled yet
 */
export function stage(root = "."): void {
  const testDir = join(root, ".vscode-test");
  const extension = join(testDir, "extension");
  const workspace = join(testDir, "workspace");
  rmSync(extension, { recursive: true, force: true });
  rmSync(workspace, { recursive: true, force: true });

  mkdirSync(join(extension, "webview"), { recursive: true });
  copyFileSync(join(root, "package.json"), join(extension, "package.json"));
  cpSync(join(root, "out"), join(extension, "out"), { recursive: true });
  copyFileSync(join(testDir, "out", "mockWebview.js"), join(extension, "webview", "main.js"));
  writeFileSync(join(extension, "webview", "styles.css"), "");

  mkdirSync(join(workspace, ".vscode"), { recursive: true });
  copyFileSync(join(root, "exampleFiles", "example.xsd"), join(workspace, "example.xsd"));
  writeFileSync(join(workspace, ".vscode", "settings.json"), JSON.stringify(WORKSPACE_SETTINGS, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  stage();
}
