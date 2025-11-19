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
      async (uri?: vscode.Uri) => {
        // If URI is provided (from context menu), use it
        // Otherwise, try to get URI from active editor
        let fileUri = uri;

        if (!fileUri) {
          const editor = vscode.window.activeTextEditor;
          if (editor && editor.document.fileName.endsWith(".xsd")) {
            fileUri = editor.document.uri;
          }
        }

        if (fileUri && fileUri.fsPath.endsWith(".xsd")) {
          await vscode.commands.executeCommand(
            "vscode.openWith",
            fileUri,
            "xmlSchemaVisualEditor.editor"
          );
        } else {
          vscode.window.showErrorMessage(
            "Please select an XSD file to open in the visual editor."
          );
        }
      }
    )
  );
}

export function deactivate() {}
