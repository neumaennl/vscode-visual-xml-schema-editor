---
type: Protocol
title: Messaging
description: The message protocol between the extension host and the webview - the messages in both directions and the order in which they arrive.
tags: [messaging, protocol, postMessage, commands, webview]
status: stable
generated: { by: human:neumaennl, at: 2026-10-02T09:19:39Z }
verified: { by: human:neumaennl, at: 2026-10-02T10:03:25Z }
sources:
  - id: messages
    resource: ../shared/messages.ts
    title: Message types
  - id: commands
    resource: ../shared/commands/index.ts
    title: Command types (SchemaCommand union)
  - id: webview-provider
    resource: ../src/webviewProvider.ts
    title: Custom editor provider (sends and receives messages)
  - id: webview-main
    resource: ../webview-src/main.ts
    title: Webview app (sends and receives messages)
  - id: command-validator
    resource: ../src/commandValidator.ts
    title: CommandValidator
---

# Purpose

The extension host and the webview run in separate processes and only talk through messages. This concept describes the messages, the order in which they arrive, and the envelope of the edit commands that the webview sends. What happens to a command inside the extension host is described in [Persistence](persistence.md); how the webview reacts to messages in [Editor](editor.md#schemaeditorapp); the node IDs in the command payloads in [Schema model](schema-model.md#node-ids).

# Channel

Both sides use the VS Code webview API: the provider calls `webview.postMessage()` and listens with `onDidReceiveMessage`, the webview calls `vscode.postMessage()` and listens for `message` events on `window`.[^webview-provider][^webview-main] Messages are copied between the processes, so only data arrives: the schema object that `unmarshal` creates on the extension side reaches the webview as plain objects without the classes' prototypes. The webview therefore uses the generated classes only as types (see [Schema model](schema-model.md)).

All messages have the same shape, defined in `shared/messages.ts`:[^messages]

```typescript
interface Message<TCommand extends string, TData> {
  command: TCommand; // discriminator
  data?: TData;
}
```

`WebviewMessage` is the union of the messages from the webview, `ExtensionMessage` the union of the messages to the webview. Neither side checks incoming messages at runtime; the provider casts them to `WebviewMessage`, and the contents of a command are checked later by the validator.

The provider sends through `safePostMessage()`, which catches and logs errors of `postMessage` instead of reporting them to the webview, to avoid an endless loop of error messages.[^webview-provider]

# Messages

**Webview to extension**

| Message | Data | Sent when |
|---|---|---|
| `executeCommand` | `SchemaCommand` (see [Commands](#commands)) | The user drops a palette item or edits or deletes something in the property panel. |

**Extension to webview**

| Message | Data | Sent when |
|---|---|---|
| `updateSchema` | `schema` - the whole parsed document | The editor opens, and after every change of the document, including changes made by commands, undo and redo, and edits outside the visual editor. |
| `updateDiagramOptions` | `DiagramOptions` - `showDocumentation`, `alwaysShowOccurrence`, `showType` | The editor opens, and a setting in `xmlSchemaVisualEditor.*` changes. |
| `commandResult` | `CommandResponse` - `success`, `error?`, `data?` | A command was applied to the document (`success: true`, no `data`), or its validation failed (`success: false` with `error`). |
| `error` | `ErrorData` - `message`, `code?`, `stack?` | The document cannot be parsed (only `message`), or a command fails at runtime or cannot be applied (`code: "COMMAND_EXECUTION_ERROR"`, mostly with `stack`). |
| `schemaModified` | `schema` | Never. The type exists, but the extension does not send it and the webview does not handle it (see [Known issues](known-issues.md#message-schemamodified-is-unused)). |

# Sequences

| Situation | Messages to the webview, in order |
|---|---|
| Opening the editor | `updateSchema` (or `error` if the document does not parse), then `updateDiagramOptions` |
| Successful command | `updateSchema`, then `commandResult` with `success: true` |
| Validation failure | `commandResult` with `success: false` |
| Runtime failure | `error` with code `COMMAND_EXECUTION_ERROR` |
| The edit is rejected by VS Code (`applyEdit` returns `false`) | `error` with code `COMMAND_EXECUTION_ERROR` |
| Edit outside the visual editor, undo, redo | `updateSchema` (or `error`) |
| Settings change | `updateDiagramOptions` |

After a successful command, `updateSchema` arrives before `commandResult`: applying the edit fires the document change event, whose handler sends the new schema, and the provider sends the result only after `applyEdit` has returned. The webview does not depend on the order. It re-renders on `updateSchema`, and on `commandResult` it only hides or shows the notification (see [Editor](editor.md#schemaeditorapp)).[^webview-main]

A command that fails does not change the document, so no `updateSchema` follows, and the webview keeps showing the last diagram. How the provider decides between `commandResult` and `error` is described in [Persistence](persistence.md#command-pipeline).

# Example

The user selects the top-level element `person` and types `customer` into the name field of the property panel. When the field loses focus, the webview sends:[^webview-main]

```json
{
  "command": "executeCommand",
  "data": {
    "type": "modifyElement",
    "payload": { "elementId": "/element:person", "elementName": "customer" }
  }
}
```

The extension validates and applies the command, and the webview receives two messages:

```json
{ "command": "updateSchema", "data": { "element": [{ "name": "customer", "...": "..." }], "...": "..." } }
```

```json
{ "command": "commandResult", "data": { "success": true } }
```

`updateSchema` carries the whole new schema; the webview rebuilds the diagram from it. `commandResult` only confirms the command and carries no data.

If the user types `first name` instead, the validator rejects the name, the document stays unchanged, and only one message arrives:[^command-validator]

```json
{ "command": "commandResult", "data": { "success": false, "error": "Element name must be a valid XML name" } }
```

The webview shows the error and restores the property panel from the last schema.

# Validation in the webview

The webview checks very little before it sends a command; the rules live in the validators of the extension (see [Persistence](persistence.md#command-pipeline)). What the webview does:[^webview-main]

- **Drops.** While a palette item is dragged over the diagram, the renderer asks a drop validator (`setNodeDropValidator()`), which uses `DropCommandFactory.canDropOnNode()`, whether the node accepts the construct. Nodes that don't accept it show no drop feedback, and a drop on them sends nothing.
- **Empty or unchanged input.** An empty name or one equal to the current name sends nothing. Occurrence fields send nothing if the value is not a number or `unbounded`; negative numbers or `minOccurs` > `maxOccurs` are left to the validator.
- **Draft copy.** The property panel edits a copy of the selected node. After `commandResult` with `success: false`, the webview selects the node again (`refreshSelection()`), which replaces the copy with the values from the last schema, so a rejected edit disappears from the panel.

Names, types, references and duplicates are only checked by the extension. A rejected command therefore costs one round trip, and the error appears as a notification instead of next to the input field.

# Commands

Every edit is a command object with a type and a payload:[^commands]

```typescript
interface BaseCommand<T> {
  type: string; // discriminator, for example "addElement"
  payload: T;
}
```

`SchemaCommand` in `shared/commands/index.ts` is the union of all 31 command types. Existing nodes are addressed by a path-based ID in the payload (see [Schema model](schema-model.md#node-ids)); new top-level constructs have no parent ID or an optional one. [Commands](commands.md) lists the commands with their payloads and rules, and where the webview sends them.

# Limitations

- **No correlation.** Messages carry no request ID, and `commandResult` does not say which command it belongs to. Together with the missing queue for commands, the webview cannot tell which of several pending commands failed (see [Known issues](known-issues.md#commands-can-overlap-while-an-edit-is-applied)).
- **Full updates.** Every change sends the whole schema, and the webview rebuilds the whole diagram. Incremental updates are not implemented.
- **No results for runtime failures.** A command that fails at runtime produces an `error` message instead of a `commandResult`, so the webview does not restore the selection as it does for validation failures.
- **Unused types.** `schemaModified` is never sent, and 12 of the 31 commands are not sent by any UI yet (see [Commands](commands.md#overview)).

[^messages]: [Message types](../shared/messages.ts)

[^commands]: [Command types](../shared/commands/index.ts)

[^webview-provider]: [Custom editor provider](../src/webviewProvider.ts)

[^webview-main]: [Webview app](../webview-src/main.ts)

[^command-validator]: [CommandValidator](../src/commandValidator.ts)
