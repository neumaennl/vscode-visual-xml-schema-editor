// Smoke tests that run inside VS Code with the real `vscode` API. The webview is
// replaced by test/extension-host/mockWebview.mts, which sends one edit command as
// soon as it receives the schema. The tests run in order and share the opened editor.
import * as assert from "node:assert/strict";
import * as vscode from "vscode";

const EXTENSION_ID = "neumaennl.xml-schema-visual-editor";
const VIEW_TYPE = "xmlSchemaVisualEditor.editor";
const NEW_ELEMENT_NAME = 'name="smokeTestElement"';
const TIMEOUT_MS = 10_000;

/**
 * Waits for the next change of a document.
 *
 * @param uri - The document
 * @returns The document after the change
 * @throws {Error} If the document does not change within the timeout
 */
function nextChange(uri: vscode.Uri): Promise<vscode.TextDocument> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      subscription.dispose();
      reject(new Error(`${uri.fsPath} did not change within ${TIMEOUT_MS} ms`));
    }, TIMEOUT_MS);
    const subscription = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() === uri.toString() && event.contentChanges.length > 0) {
        clearTimeout(timer);
        subscription.dispose();
        resolve(event.document);
      }
    });
  });
}

suite("Extension in VS Code", () => {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, "The tests need a workspace folder");
  const uri = vscode.Uri.joinPath(folder.uri, "example.xsd");
  let original: string;
  let edited: Promise<vscode.TextDocument>;

  suiteSetup(async () => {
    original = (await vscode.workspace.openTextDocument(uri)).getText();
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand("workbench.action.files.revert");
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("activates", async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `${EXTENSION_ID} is not installed`);
    await extension.activate();
    assert.ok(extension.isActive);
  });

  test("opens example.xsd in the custom editor", async () => {
    // Listen before opening: the webview sends its edit as soon as it has loaded.
    edited = nextChange(uri);
    await vscode.commands.executeCommand("vscode.openWith", uri, VIEW_TYPE);
    const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
    assert.ok(input instanceof vscode.TabInputCustom, "The active tab is not a custom editor");
    assert.equal(input.viewType, VIEW_TYPE);
    assert.equal(input.uri.toString(), uri.toString());
  });

  test("applies the edit that the webview sends", async () => {
    const document = await edited;
    assert.ok(document.getText().includes(NEW_ELEMENT_NAME), "The new element is missing");
  });

  test("reverts the edit with undo", async () => {
    const undone = nextChange(uri);
    await vscode.commands.executeCommand("undo");
    const document = await undone;
    assert.equal(document.getText(), original);
  });
});
