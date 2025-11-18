// Shared types between extension and webview

// Re-export XML Schema generated classes
export * from "./generated";

// Re-export the main schema class for convenience
export { schema as Schema } from "./generated";

// Messages between extension and webview
export interface Message {
  command: string;
  data?: any;
}

export interface UpdateSchemaMessage extends Message {
  command: "updateSchema";
  data: any; // Will be the schema object serialized for webview
}

export interface NodeClickedMessage extends Message {
  command: "nodeClicked";
  data: { nodeId: string };
}

export interface SchemaModifiedMessage extends Message {
  command: "schemaModified";
  data: any; // Will be the schema object serialized for webview
}

export interface ErrorMessage extends Message {
  command: "error";
  data: { message: string };
}
