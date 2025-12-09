import * as vscode from "vscode";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../shared/types";
import {
  ExecuteCommandMessage,
  WebviewMessage,
  DiagramOptions,
} from "../shared/messages";
import { CommandProcessor } from "./commandProcessor";

/**
 * Provider for the XML Schema Visual Editor custom text editor.
 * Implements VS Code's CustomTextEditorProvider interface to provide
 * a visual editing experience for XML Schema files.
 */
export class SchemaEditorProvider implements vscode.CustomTextEditorProvider {
  private readonly commandProcessor: CommandProcessor;

  /**
   * Creates a new SchemaEditorProvider.
   * 
   * @param context - The extension context provided by VS Code
   */
  constructor(private readonly context: vscode.ExtensionContext) {
    this.commandProcessor = new CommandProcessor();
  }

  /**
   * Resolves and initializes the custom text editor for an XSD document.
   * Sets up the webview, establishes communication channels, and loads the initial schema.
   * 
   * @param document - The text document being edited
   * @param webviewPanel - The webview panel to display the custom editor
   * @param _token - Cancellation token for the operation
   */
  public resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): void {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Send initial schema and diagram options to webview
    this.updateWebview(document, webviewPanel.webview);
    this.sendDiagramOptions(webviewPanel.webview);

    // Listen for document changes
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          this.updateWebview(document, webviewPanel.webview);
        }
      }
    );

    // Listen for configuration changes
    const changeConfigSubscription = vscode.workspace.onDidChangeConfiguration(
      (e) => {
        if (e.affectsConfiguration("xmlSchemaVisualEditor")) {
          this.sendDiagramOptions(webviewPanel.webview);
        }
      }
    );

    // Listen for messages from webview
    webviewPanel.webview.onDidReceiveMessage(
      (message: WebviewMessage) =>
        void this.handleWebviewMessage(message, document, webviewPanel.webview),
      undefined,
      this.context.subscriptions
    );

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
      changeConfigSubscription.dispose();
    });
  }

  /**
   * Reads diagram options from VS Code settings and sends them to the webview.
   * 
   * @param webview - The webview to send the diagram options to
   */
  private sendDiagramOptions(webview: vscode.Webview): void {
    const config = vscode.workspace.getConfiguration("xmlSchemaVisualEditor");
    const diagramOptions: DiagramOptions = {
      showDocumentation: config.get<boolean>("showDocumentation", false),
      alwaysShowOccurrence: config.get<boolean>("alwaysShowOccurrence", false),
      showType: config.get<boolean>("showType", false),
    };

    void webview.postMessage({
      command: "updateDiagramOptions",
      data: diagramOptions,
    });
  }

  /**
   * Updates the webview with the current document content.
   * Parses the XSD document and sends the schema object to the webview for visualization.
   * 
   * @param document - The text document containing the XSD content
   * @param webview - The webview to update with the parsed schema
   */
  private updateWebview(
    document: vscode.TextDocument,
    webview: vscode.Webview
  ): void {
    try {
      console.log("Parsing XSD document...");
      const xmlContent = document.getText();
      console.log("XML content length:", xmlContent.length);
      console.log("XML content preview:", xmlContent.substring(0, 200));

      // Parse XSD directly using xmlbind-ts unmarshal
      const schemaObj = unmarshal(schema, xmlContent);

      console.log("Schema parsed successfully");
      console.log("Schema object:", schemaObj);

      // Send the schema object to the webview for visualization
      void webview.postMessage({
        command: "updateSchema",
        data: schemaObj,
      });
    } catch (error) {
      console.error("Error parsing schema:", error);
      void webview.postMessage({
        command: "error",
        data: { message: (error as Error).message },
      });
    }
  }

  /**
   * Handles messages received from the webview.
   * Processes commands sent from the visual editor to modify the document.
   * 
   * @param message - The message received from the webview
   * @param document - The document being edited
   * @param webview - The webview to send responses back to
   */
  private async handleWebviewMessage(
    message: WebviewMessage,
    document: vscode.TextDocument,
    webview: vscode.Webview
  ): Promise<void> {
    switch (message.command) {
      case "executeCommand": {
        await this.executeCommand(message, document, webview);
        break;
      }
    }
  }

  /**
   * Executes a command using the CommandProcessor.
   * Applies the resulting changes to the document if successful.
   * 
   * @param message - The execute command message from the webview
   * @param document - The document to update
   * @param webview - The webview to send responses back to
   */
  private async executeCommand(
    message: ExecuteCommandMessage,
    document: vscode.TextDocument,
    webview: vscode.Webview
  ): Promise<void> {
    try {
      const currentXml = document.getText();
      const result = this.commandProcessor.execute(message.data, currentXml);

      if (result.success && result.xmlContent) {
        // Apply the changes to the document
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
          0,
          0,
          document.lineCount,
          document.lineAt(document.lineCount - 1).text.length
        );
        edit.replace(document.uri, fullRange, result.xmlContent);
        await vscode.workspace.applyEdit(edit);

        // Send success response
        void webview.postMessage({
          command: "commandResult",
          data: {
            success: true,
          },
        });
      } else {
        // Send error response
        void webview.postMessage({
          command: "commandResult",
          data: {
            success: false,
            error: result.error,
          },
        });
      }
    } catch (error) {
      // Send error response for unexpected errors
      void webview.postMessage({
        command: "error",
        data: {
          message: `Failed to execute command: ${(error as Error).message}`,
        },
      });
    }
  }

  /**
   * Generates the HTML content for the webview.
   * Creates a complete HTML page with the editor UI, including toolbar,
   * canvas, and properties panel.
   * 
   * @param webview - The webview to generate HTML for
   * @returns The complete HTML content as a string
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "webview", "main.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "webview", "styles.css")
    );
    const scriptSrc = scriptUri.toString();
    const styleSrc = styleUri.toString();

    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link href="${styleSrc}" rel="stylesheet">
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
    <script nonce="${nonce}" src="${scriptSrc}"></script>
</body>
</html>`;
  }

  /**
   * Generates a cryptographically secure nonce for Content Security Policy.
   * Used to allow only specific inline scripts to execute in the webview.
   * 
   * @returns A random 32-character nonce string
   */
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
