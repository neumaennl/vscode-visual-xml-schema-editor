/**
 * Stubs of the VS Code objects that SchemaEditorProvider needs, for the tests of the provider.
 */

import * as vscode from "vscode";
import type { Mock, MockedFunction } from "vitest";
import { SchemaEditorProvider } from "../webviewProvider.js";

/** The provider and the stubbed VS Code objects that {@link stubEditor} creates. */
export interface EditorStubs {
  provider: SchemaEditorProvider;
  document: vscode.TextDocument;
  webview: vscode.Webview;
  webviewPanel: vscode.WebviewPanel;
  /** The mock behind `webview.postMessage`. */
  postMessage: Mock<(message: unknown) => Promise<boolean>>;
  /** The mock behind `webview.asWebviewUri`, which returns the URI unchanged. */
  asWebviewUri: Mock<(uri: vscode.Uri) => vscode.Uri>;
}

/**
 * Creates a provider and stubs of a document with the given text and of a webview panel.
 *
 * @param xml - The text of the document
 * @returns The provider and the stubs
 */
export function stubEditor(xml: string): EditorStubs {
  // eslint-disable-next-line no-restricted-syntax -- partial stub; unused VS Code context fields omitted
  const context = {
    extensionUri: vscode.Uri.file("/ext"),
    subscriptions: [],
  } as unknown as vscode.ExtensionContext;

  const postMessage = vi.fn<(message: unknown) => Promise<boolean>>();
  const asWebviewUri = vi.fn((uri: vscode.Uri) => uri);
  // eslint-disable-next-line no-restricted-syntax -- partial stub; unused Webview fields omitted
  const webview = {
    options: {},
    html: "",
    asWebviewUri,
    postMessage,
    onDidReceiveMessage: vi.fn(),
  } as unknown as vscode.Webview;

  // eslint-disable-next-line no-restricted-syntax -- partial stub; unused WebviewPanel fields omitted
  const webviewPanel = {
    webview,
    onDidDispose: vi.fn(),
  } as unknown as vscode.WebviewPanel;

  const lines = xml.split("\n");
  const lastLineText = lines[lines.length - 1] ?? "";
  // eslint-disable-next-line no-restricted-syntax -- partial stub; unused TextDocument fields omitted
  const document = {
    uri: vscode.Uri.file("/test/schema.xsd"),
    getText: vi.fn(() => xml),
    lineCount: lines.length,
    lineAt: vi.fn(() => ({ text: lastLineText })),
  } as unknown as vscode.TextDocument;

  const provider = new SchemaEditorProvider(context);
  return { provider, document, webview, webviewPanel, postMessage, asWebviewUri };
}

/**
 * Resolves the editor and returns the message handler that the provider registered
 * with `webview.onDidReceiveMessage`. Clears all mocks afterwards, so that the tests
 * only see the calls that the handler causes.
 *
 * @param editor - The provider and the stubs from {@link stubEditor}
 * @returns The message handler
 */
export function resolveAndGetHandler(editor: EditorStubs): (msg: unknown) => void {
  const { provider, document, webviewPanel } = editor;
  provider.resolveCustomTextEditor(document, webviewPanel, {} as vscode.CancellationToken);

  type ListenerFn = (msg: unknown) => void;
  type OnReceiveMock = MockedFunction<(listener: ListenerFn) => vscode.Disposable>;
  const onReceiveMock = webviewPanel.webview.onDidReceiveMessage as OnReceiveMock;
  const handler = onReceiveMock.mock.calls[0][0];
  vi.clearAllMocks();
  return handler;
}
