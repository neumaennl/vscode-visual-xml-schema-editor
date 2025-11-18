import * as vscode from "vscode";
import { SchemaEditorProvider } from "./webviewProvider";

export function activate(context: vscode.ExtensionContext) {
  // Register custom editor provider
  const provider = new SchemaEditorProvider(context);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      "xmlSchemaVisualEditor.editor",
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    )
  );

  // Register command to open schema in visual editor
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "xmlSchemaVisualEditor.openEditor",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.fileName.endsWith(".xsd")) {
          await vscode.commands.executeCommand(
            "vscode.openWith",
            editor.document.uri,
            "xmlSchemaVisualEditor.editor"
          );
        }
      }
    )
  );
}

export function deactivate() {}
