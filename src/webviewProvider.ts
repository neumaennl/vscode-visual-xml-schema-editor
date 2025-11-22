import * as vscode from "vscode";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../shared/types";

export class SchemaEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Send initial schema to webview
    this.updateWebview(document, webviewPanel.webview);

    // Listen for document changes
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          this.updateWebview(document, webviewPanel.webview);
        }
      }
    );

    // Listen for messages from webview
    webviewPanel.webview.onDidReceiveMessage(
      (message) => this.handleWebviewMessage(message, document),
      undefined,
      this.context.subscriptions
    );

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });
  }

  private updateWebview(
    document: vscode.TextDocument,
    webview: vscode.Webview
  ) {
    try {
      console.log("Parsing XSD document...");
      const xmlContent = document.getText();
      console.log("XML content length:", xmlContent.length);
      console.log("XML content preview:", xmlContent.substring(0, 200));

      // Parse XSD directly using xmlbind-ts unmarshal
      const schemaObj = unmarshal(schema, xmlContent);

      console.log("Schema parsed successfully");
      console.log("Schema object:", schemaObj);
      console.log("Schema type:", typeof schemaObj);
      console.log("Schema keys:", Object.keys(schemaObj || {}));

      // Send the schema object to the webview for visualization
      webview.postMessage({
        command: "updateSchema",
        data: schemaObj,
      });
    } catch (error) {
      console.error("Error parsing schema:", error);
      webview.postMessage({
        command: "error",
        data: { message: (error as Error).message },
      });
    }
  }

  private async handleWebviewMessage(
    message: any,
    document: vscode.TextDocument
  ) {
    switch (message.command) {
      case "schemaModified":
        await this.applySchemaChanges(document, message.data);
        break;
      case "nodeClicked":
        console.log("Node clicked:", message.data);
        break;
    }
  }

  private async applySchemaChanges(
    document: vscode.TextDocument,
    schemaObj: schema
  ) {
    // TODO: Marshal the schema object back to XML
    // const xmlContent = marshal(schemaObj);
    // Then apply the edit to the document

    const edit = new vscode.WorkspaceEdit();
    // Implementation needed
    await vscode.workspace.applyEdit(edit);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "webview", "main.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "webview", "styles.css")
    );

    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>XML Schema Visual Editor</title>
</head>
<body>
    <div id="toolbar">
        <button id="zoomIn">Zoom In</button>
        <button id="zoomOut">Zoom Out</button>
        <button id="fitView">Fit View</button>
    </div>
    <div id="canvas-container">
        <svg id="schema-canvas" width="100%" height="100%"></svg>
    </div>
    <div id="properties-panel">
        <h3>Properties</h3>
        <div id="properties-content"></div>
    </div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
