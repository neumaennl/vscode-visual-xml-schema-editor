/**
 * Message protocol types for communication between extension and webview.
 * Defines the bidirectional message format for command execution and updates.
 */

import { CommandResponse } from "./commands/base";
import { SchemaCommand } from "./commands";

/**
 * Base interface for messages between extension and webview.
 * Uses generic type for type-safe message handling.
 */
export interface Message<TCommand extends string = string, TData = unknown> {
  command: TCommand;
  data?: TData;
}

/**
 * Error data structure for consistent error reporting.
 */
export interface ErrorData {
  /** Human-readable error message */
  message: string;
  /** Optional error code for programmatic handling */
  code?: string;
  /** Optional stack trace for debugging */
  stack?: string;
}

/**
 * Message to execute a schema command.
 */
export interface ExecuteCommandMessage
  extends Message<"executeCommand", SchemaCommand> {
  command: "executeCommand";
  data: SchemaCommand;
}

/**
 * Message to update the schema in the webview.
 */
export interface UpdateSchemaMessage extends Message<"updateSchema", unknown> {
  command: "updateSchema";
  data: unknown; // Schema object serialized for webview
}

/**
 * Data structure for node click events.
 */
export interface NodeClickedData {
  /** ID of the clicked node */
  nodeId: string;
}

/**
 * Message when a node is clicked in the diagram.
 */
export interface NodeClickedMessage
  extends Message<"nodeClicked", NodeClickedData> {
  command: "nodeClicked";
  data: NodeClickedData;
}

/**
 * Message when the schema has been modified.
 */
export interface SchemaModifiedMessage
  extends Message<"schemaModified", unknown> {
  command: "schemaModified";
  data: unknown; // Updated schema object
}

/**
 * Message to report an error.
 */
export interface ErrorMessage extends Message<"error", ErrorData> {
  command: "error";
  data: ErrorData;
}

/**
 * Message to report command execution result.
 */
export interface CommandResultMessage
  extends Message<"commandResult", CommandResponse> {
  command: "commandResult";
  data: CommandResponse;
}

/**
 * Union type of all messages from webview to extension.
 */
export type WebviewMessage = ExecuteCommandMessage | NodeClickedMessage;

/**
 * Union type of all messages from extension to webview.
 */
export type ExtensionMessage =
  | UpdateSchemaMessage
  | SchemaModifiedMessage
  | ErrorMessage
  | CommandResultMessage;
