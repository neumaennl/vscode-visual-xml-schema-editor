import * as vscode from "vscode";
import * as path from "path";
import { XsdParser } from "./parser/xsdParser";
import { XsdSchema } from "./model/xsd";
import { getNonce } from "./util";

export function activate(context: vscode.ExtensionContext) {
  // register custom editor for *.xsd files
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      "visual.xmlSchema",
      new XmlSchemaEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true, // keep state of the webview
        },
      }
    )
  );
}

class XmlSchemaEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    webviewPanel.webview.html = this.getWebviewContent(webviewPanel.webview);

    const schemaModel = this.parseXMLSchema(document.fileName, document.getText());

    webviewPanel.webview.postMessage({ command: "init", model: schemaModel });

    webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "update":
            {
              const updatedXmlString = this.serializeXMLSchema(message.model);
              const edit = new vscode.WorkspaceEdit();
              edit.replace(
                document.uri,
                new vscode.Range(0, 0, document.lineCount, 0),
                updatedXmlString
              );
              await vscode.workspace.applyEdit(edit);
            }
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  private parseXMLSchema(fileName: string, xmlString: string): XsdSchema {
    return XsdParser.parse(fileName, xmlString);
  }

  private serializeXMLSchema(model: XsdSchema): string {
    return model.toXsd();
  }

  private getWebviewContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, "out", "webview", "index.js")
      )
    );

    const d3Uri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(
          this.context.extensionPath,
          "node_modules",
          "d3",
          "dist",
          "d3.min.js"
        )
      )
    );

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <!--
            Use a content security policy to only allow loading images from https or from our extension directory,
            and only allow scripts that have a specific nonce.
            -->
    				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Visual XML Schema Editor</title>
            <style>
                .node circle { fill: #fff; stroke: steelblue; stroke-width: 1.5px; }
                .node text { font: 10px sans-serif; }
                .link { fill: none; stroke: #ccc; stroke-width: 1.5px; }
            </style>
        </head>
        <body>
            <h1>Visual XML Schema Editor</h1>
            <div id="tree"></div>
            <script nonce="${nonce}" src="${d3Uri}"></script>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
  }
}
