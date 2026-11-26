---
type: Process
title: Persistence
description: How edits reach the XSD file - the command pipeline, the document edit, what serialization changes, undo and save, and how changes from outside reach the diagram.
tags: [persistence, command-pipeline, workspace-edit, serialization, undo, xmlbind-ts]
status: draft
generated: { by: human:neumaennl, at: 2026-11-26T13:48:20Z }
sources:
  - id: extension
    resource: ../src/extension.ts
    title: Extension entry point (editor registration)
  - id: webview-provider
    resource: ../src/webviewProvider.ts
    title: Custom editor provider
  - id: command-processor
    resource: ../src/commandProcessor.ts
    title: CommandProcessor
  - id: schema-xml
    resource: ../src/schemaXml.ts
    title: Conversion between XML and schema objects
  - id: webview-main
    resource: ../webview-src/main.ts
    title: Webview app (message handling)
  - id: workspace-edit-test
    resource: ../src/__tests__/pipeline.workspaceEdit.test.ts
    title: Integration tests for the WorkspaceEdit path
  - id: serialization-test
    resource: ../src/__tests__/pipeline.serialization.test.ts
    title: Integration tests for namespaces after serialization
  - id: xmlbind-ts
    resource: https://github.com/neumaennl/xmlbind-ts
    title: xmlbind-ts (marshal and unmarshal)
---

# Purpose

The visual editor has no storage of its own. Every change ends up as an edit of the XSD text document, and the diagram is always rebuilt from that document. This concept describes how a command from the webview becomes a document edit, what serialization does to the file, how undo and saving work, and how changes made outside the visual editor reach the diagram. The parts involved are described in [Architecture](architecture.md), the object model in [Schema model](schema-model.md), and the webview side in [Editor](editor.md).

# The document is the only state

`SchemaEditorProvider` is a `CustomTextEditorProvider`, so the visual editor works on the same `TextDocument` as the text editor, including unsaved changes.[^extension] The extension host keeps no schema between commands: for every command, `CommandProcessor` parses the current document text again.[^command-processor] The webview keeps the last schema it received only to render it; it is never sent back. Commands therefore always work on what is in the document right now, even if it was just changed in the text editor.

# Command pipeline

```mermaid
sequenceDiagram
  participant W as Webview
  participant P as SchemaEditorProvider
  participant C as CommandProcessor
  participant D as TextDocument
  W->>P: executeCommand
  P->>D: getText()
  P->>C: execute(command, xml)
  C-->>P: result (schema, XML or error)
  P->>D: applyEdit (replace full range)
  D-->>P: onDidChangeTextDocument
  P->>W: updateSchema
  P->>W: commandResult
```

1. **Receive.** The webview posts `executeCommand` with a `SchemaCommand`. It does not wait for an answer and has no "pending" state.[^webview-main]
2. **Parse.** `CommandProcessor.execute()` parses the document text with `parseSchema()`. Every command parses it again; the processor keeps no schema between commands.[^command-processor][^schema-xml]
3. **Validate.** `CommandValidator` checks the command against the parsed schema.
4. **Execute.** `CommandExecutor` changes the parsed schema object. It belongs to this command alone, so a failure leaves nothing behind.
5. **Check the result.** If the result violates a constraint of XML Schema that spans the schema and that the schema did not violate before, such as that elements with the same name in a content model have the same type, the command is rejected like by a validator (see [ADR 003](architecture/003-validators-check-executors-assume.md)).
6. **Serialize and check.** `serializeSchema()` marshals the schema object to XML, and the XML is parsed again. If it does not parse, the command fails.
7. **Write.** The provider replaces the full range of the document with the new XML in one `WorkspaceEdit` and calls `vscode.workspace.applyEdit()`.[^webview-provider]
8. **Refresh.** The edit fires `onDidChangeTextDocument`, and the provider parses the document and sends `updateSchema`, as for any other change (see [Changes from outside](#changes-from-outside)).

`execute()` is synchronous and returns a result object instead of throwing. The provider maps the outcome to messages:[^webview-provider][^workspace-edit-test]

| Outcome            | Cause                                                                                              | Message to the webview                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Success            | Edit applied                                                                                       | `commandResult` `{ success: true }`, plus `updateSchema` from the document change |
| Validation failure | The validator rejected the command, or its result violates a constraint that spans the schema      | `commandResult` `{ success: false, error }`                                       |
| Runtime failure    | An exception in parsing, executing or serializing, for example because the document does not parse | `error` with code `COMMAND_EXECUTION_ERROR`                                       |
| Edit rejected      | `applyEdit()` returned `false`                                                                     | `error` with code `COMMAND_EXECUTION_ERROR`                                       |

On `commandResult` with `success: false` and on `error`, the webview shows the message in its notification bar; the diagram stays as it is. A successful `commandResult` or the next `updateSchema` hides the notification.[^webview-main]

# Writing the document

The provider always replaces the whole document.[^webview-provider] There is no minimal edit and no check of the document version: the range is computed from the document as it was when the command arrived.

Because of this, each command changes the text of the entire file, even if it only adds one element. How much changes depends on serialization (next section), not on the command.

# What serialization changes

`marshal` from `xmlbind-ts` writes the XML.[^xmlbind-ts] Compared to a hand-written file, the first command after opening changes the following:

Kept:

- Comments, including comments before the root element. A comment is written after as many child elements as were before it, so it only moves when the elements before it are reordered or dropped (see below).
- Element text that looks like a number, such as `1.0` in `documentation`, stays as it is.
- The order of child elements, as long as each kind of child occurs in one unbroken run.
- The XML declaration, but only if the file had one.
- The namespace declarations of the root element, including a default namespace, and the prefixes of the element names: a file with `xs:element` keeps `xs:element`, and one that declares the XML Schema namespace as default keeps `element`. So QName values such as `type="xs:string"`, `type="t:myType"` or an unprefixed `type="myType"` keep their meaning.[^serialization-test]

Changed:

- Indentation becomes two spaces.
- Attributes are reordered, and single quotes become double quotes.
- Empty elements written as `<a></a>` become `<a/>`.
- The document ends with exactly one line break, and a document without an XML declaration starts with its first comment or the root element, without empty lines before it. The editor corrects these line breaks of `xmlbind-ts` itself (see [Known issues](known-issues.md#the-editor-corrects-the-line-breaks-of-the-output)).[^schema-xml]
- Character references such as `&#65;` or `&#x263A;` are written as the characters they stand for, except `&#13;`, which stays a reference because a literal carriage return would be read as a line break.
- Leading and trailing whitespace in text content such as `documentation` is trimmed. This is intended.
- Children of one kind that occur in more than one run are written together, which changes the meaning of a `sequence`, and comments between them move.
- Mixed content in `documentation` is scrambled.
- The XML declaration is always written as `<?xml version="1.0" encoding="UTF-8"?>`.

Lost:

- Content that the generated classes do not map, such as schema constructs of XSD 1.1 (`xs:assert`) and foreign elements at the top level. A comment after such content moves.
- Processing instructions, a document type declaration and comments after the root element.
- Namespace declarations below the root element, so QNames that use such a prefix no longer resolve.

The changes in "Changed" after the trimmed whitespace, and everything in "Lost", are not intended; [Known issues](known-issues.md#commands-can-change-or-lose-content-outside-the-edit) describes them with examples.

# Undo, redo and save

Because every command is a single `WorkspaceEdit` on the text document, VS Code handles undo, redo, the dirty marker and saving; the extension has no code for them.[^workspace-edit-test] Each successful command is one undo step, also when the visual editor has the focus. Undo and redo change the document, which triggers the normal refresh, so the diagram follows. Saving writes the document as it is; the extension does not write files itself.

# Changes from outside

The provider subscribes to `onDidChangeTextDocument` and reacts to every change of its document, regardless of where it comes from: the provider's own edits, typing in the text editor, undo and redo, other extensions, or VS Code reloading the file after it changed on disk.[^webview-provider]

For each change, the provider:

1. Parses the whole document. There is no debounce, so typing in the text editor parses the document on every keystroke, and each parse is logged to the console.
2. On success, sends `updateSchema` with the complete schema object. The webview re-renders the diagram, hides the notification, restores the selection by its ID and saves its state.[^webview-main]
3. On failure, sends `error` with the parser message. The webview shows the message and keeps the last diagram that could be parsed. While the document does not parse, every command fails with a runtime error, because the pipeline parses the same text.

# Other state

The XSD document is the only thing the extension writes to a file. Two other kinds of state exist, and neither is stored in the document:

- **Settings.** The diagram options (`visualXmlSchemaEditor.*`, see [Editor](editor.md#diagram)) are VS Code settings. The extension only reads them and never writes them. When they change, the provider sends `updateDiagramOptions`, and the webview re-renders with the new options; this is not a document change.[^webview-provider]
- **Webview state.** The webview saves the last schema, the zoom and pan, and the diagram options with `vscode.setState()` and reads them back when it is created again.[^webview-main] VS Code keeps this state per editor, also across restarts, so the diagram can be shown before the first `updateSchema` arrives. It is only a cache: the next `updateSchema` replaces the schema. Restoring it is incomplete: the expand state is not saved (see [Editor](editor.md#schemaeditorapp) and [Known issues](known-issues.md#expand-state-is-not-restored-after-reopening), [#347](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/347)).

# Concurrency

`CommandProcessor.execute()` is synchronous, so two commands never run in it at the same time.[^command-processor] The part that can overlap is asynchronous and not covered: the provider awaits `applyEdit()`, and the webview does not wait for `commandResult` before sending the next command. A second command that arrives during that wait reads the document text before the first edit and computes its range from it (see [Known issues](known-issues.md#commands-can-overlap-while-an-edit-is-applied)).

Commands also carry IDs from the schema the webview last received. If the document changes in the text editor and the command is sent before the new `updateSchema` arrives, the IDs refer to the old structure. Position-based IDs can then point to a different node (see [Schema model](schema-model.md#node-ids)).

# Limitations

- Every command reformats the whole file ([Known issues](known-issues.md#every-command-reformats-the-whole-document), [xmlbind-ts#252](https://github.com/neumaennl/xmlbind-ts/issues/252)).
- Commands can overlap while an edit is applied ([Known issues](known-issues.md#commands-can-overlap-while-an-edit-is-applied)).
- Every document change is parsed in full and logged ([Known issues](known-issues.md#every-document-change-is-parsed-in-full-and-logged)).

[^extension]: [Extension entry point](../src/extension.ts)

[^webview-provider]: [Custom editor provider](../src/webviewProvider.ts)

[^command-processor]: [CommandProcessor](../src/commandProcessor.ts)

[^schema-xml]: [Conversion between XML and schema objects](../src/schemaXml.ts)

[^webview-main]: [Webview app](../webview-src/main.ts)

[^workspace-edit-test]: [Integration tests for the WorkspaceEdit path](../src/__tests__/pipeline.workspaceEdit.test.ts)

[^serialization-test]: [Integration tests for namespaces after serialization](../src/__tests__/pipeline.serialization.test.ts)

[^xmlbind-ts]: [xmlbind-ts](https://github.com/neumaennl/xmlbind-ts)
