---
type: Protocol
title: Messaging
description: The message protocol between the extension host and the webview - the messages in both directions and the order in which they arrive.
tags: [messaging, protocol, postMessage, commands, webview]
status: stable
generated: { by: human:neumaennl, at: 2026-11-24T15:38:45Z }
verified: { by: human:neumaennl, at: 2026-11-24T17:27:00Z }
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

| Message          | Data                                        | Sent when                                                                            |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| `executeCommand` | `SchemaCommand` (see [Commands](#commands)) | The user drops a palette item or edits or deletes something in the properties panel. |

**Extension to webview**

| Message                | Data                                                                       | Sent when                                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `updateSchema`         | `schema` - the whole parsed document                                       | The editor opens, and after every change of the document, including changes made by commands, undo and redo, and edits outside the visual editor.            |
| `updateDiagramOptions` | `DiagramOptions` - `showDocumentation`, `alwaysShowOccurrence`, `showType` | The editor opens, and a setting in `visualXmlSchemaEditor.*` changes.                                                                                        |
| `commandResult`        | `CommandResponse` - `success`, `error?`                                    | A command was applied to the document (`success: true`), or its validation failed (`success: false` with `error`).                                           |
| `error`                | `ErrorData` - `message`, `code?`, `stack?`                                 | The document cannot be parsed (only `message`), or a command fails at runtime or cannot be applied (`code: "COMMAND_EXECUTION_ERROR"`, mostly with `stack`). |

# Sequences

| Situation                                                     | Messages to the webview, in order                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Opening the editor                                            | `updateSchema` (or `error` if the document does not parse), then `updateDiagramOptions` |
| Successful command                                            | `updateSchema`, then `commandResult` with `success: true`                               |
| Validation failure                                            | `commandResult` with `success: false`                                                   |
| Runtime failure                                               | `error` with code `COMMAND_EXECUTION_ERROR`                                             |
| The edit is rejected by VS Code (`applyEdit` returns `false`) | `error` with code `COMMAND_EXECUTION_ERROR`                                             |
| Edit outside the visual editor, undo, redo                    | `updateSchema` (or `error`)                                                             |
| Settings change                                               | `updateDiagramOptions`                                                                  |

After a successful command, `updateSchema` arrives before `commandResult`: applying the edit fires the document change event, whose handler sends the new schema, and the provider sends the result only after `applyEdit` has returned. The webview does not depend on the order. It re-renders on `updateSchema`, and on `commandResult` it only hides or shows the notification (see [Editor](editor.md#schemaeditorapp)).[^webview-main]

A command that fails does not change the document, so no `updateSchema` follows, and the webview keeps showing the last diagram. How the provider decides between `commandResult` and `error` is described in [Persistence](persistence.md#command-pipeline).

# Example

The user selects the top-level element `person` and types `customer` into the name field of the properties panel. When the field loses focus, the webview sends:[^webview-main]

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

The webview shows the error and restores the properties panel from the last schema.

# Validation in the webview

The validators of the extension decide whether a command is applied (see [Persistence](persistence.md#command-pipeline)). The webview checks what it can decide from the diagram and from the value of one field, to give immediate feedback:[^webview-main]

- **Drops.** While a palette item is dragged over the diagram, the canvas asks the drop rules (`DropCommandFactory.canDropOnNode()`) whether the node accepts the schema construct. Nodes that don't accept it show no drop feedback, and a drop on them sends nothing.
- **Empty, invalid or unchanged input.** An unchanged value sends nothing. A field rejects what it can decide from its own value with a message below it and shows the current value again (see [UX concept](ux-concept.md#where-errors-appear)): an empty or invalid name, a type that the schema does not offer, an invalid facet value, an occurrence that is no non-negative integer (or `unbounded` for `maxOccurs`), an empty union, an invalid or already declared prefix, a namespace URI that is not absolute, a value that a list already contains, and a fixed value that is not one of its values. These rules are in `shared/`, and the validators check them again. `minOccurs` > `maxOccurs` and other checks that need more than one value are left to the validator.
- **Rejected edits.** The properties panel changes nothing in the webview; a field only keeps what the user typed. After `commandResult` with `success: false`, the webview shows the node again (`refreshSelection()`) with the values from the last schema, so a rejected edit disappears from the panel.

References, duplicate names in the schema and rules that need more than one value are only checked by the extension. A command that breaks one of them therefore costs one round trip, and the error appears in the notification banner instead of below the field.

# Commands

Every edit is a command object with a type and a payload:[^commands]

```typescript
interface BaseCommand<T> {
  type: string; // discriminator, for example "addElement"
  payload: T;
}
```

`SchemaCommand` in `shared/commands/index.ts` is the union of all 31 command types. Existing nodes are addressed by a path-based ID in the payload (see [Schema model](schema-model.md#node-ids)); new top-level schema constructs have no parent ID or an optional one. [Commands](commands.md) lists the commands with their payloads and rules, and where the webview sends them.

# Limitations

- **No correlation.** Messages carry no request ID, and `commandResult` does not say which command it belongs to. Together with the missing queue for commands, the webview cannot tell which of several pending commands failed (see [Known issues](known-issues.md#commands-can-overlap-while-an-edit-is-applied)).
- **Full updates.** Every change sends the whole schema, and the webview rebuilds the whole diagram. Incremental updates are not implemented.
- **No results for runtime failures.** A command that fails at runtime produces an `error` message instead of a `commandResult`, so the webview does not restore the selection as it does for validation failures.
- **One message from the webview.** The webview only sends schema commands so far. The message union is kept for requests that are not edits, such as opening a definition ([ADR 005](architecture/005-message-protocol.md)).
- **Unused commands.** 12 of the 31 commands are not sent by any UI yet (see [Commands](commands.md#overview)).

[^messages]: [Message types](../shared/messages.ts)

[^commands]: [Command types](../shared/commands/index.ts)

[^webview-provider]: [Custom editor provider](../src/webviewProvider.ts)

[^webview-main]: [Webview app](../webview-src/main.ts)

[^command-validator]: [CommandValidator](../src/commandValidator.ts)
