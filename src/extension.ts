import * as vscode from 'vscode';
import { CatScratchEditorProvider } from './catScratchEditor';
import { PawDrawEditorProvider } from './pawDrawEditor';
import { VisualXmlSchemaEditorProvider } from './visualXmlSchemaEditor';

export function activate(context: vscode.ExtensionContext) {
	// Register our custom editor providers
	context.subscriptions.push(CatScratchEditorProvider.register(context));
	context.subscriptions.push(PawDrawEditorProvider.register(context));
	context.subscriptions.push(VisualXmlSchemaEditorProvider.register(context));
}
