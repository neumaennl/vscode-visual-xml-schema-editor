import * as vscode from "vscode";
import { XsdParser } from "./parser/xsdParser";
import { XsdSchema } from "./model/xsd";

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
  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    webviewPanel.webview.html = this.getWebviewContent(webviewPanel.webview);

    const schemaModel = this.parseXMLSchema(
      document.fileName.split(/[/|\\]/).slice(-1)[0],
      document.getText()
    );
    webviewPanel.webview.postMessage({
      command: "init",
      model: schemaModel.toJSON(), // Serialize using toJSON
    });

    webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "update": {
            const model = XsdSchema.fromJSON(message.model); // Deserialize using fromJSON
            const updatedXmlString = this.serializeXMLSchema(model);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(
              document.uri,
              new vscode.Range(0, 0, document.lineCount, 0),
              updatedXmlString
            );
            await vscode.workspace.applyEdit(edit);
            break;
          }
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
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "out",
        "webview",
        "webview.js"
      )
    );

    return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Visual XML Schema Editor</title>
        <style>
          body, html {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          #tree {
            width: 100%;
            height: 100%;
            position: absolute;
          }
          svg {
            background-color: white;
          }
        </style>
      </head>
      <body>
        <div id="tree"></div>
        <script src="${scriptUri}"></script>
      </body>
    </html>`;
  }
}
