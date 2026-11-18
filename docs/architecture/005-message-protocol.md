---
type: Architecture Decision Record
title: "ADR 005: Message protocol"
description: The decision to keep the messages from the webview as a union of requests, of which a schema edit is one, instead of sending schema commands directly, with the reasons, how requests that expect an answer will be matched to it, and when to review it.
tags: [adr, architecture, messaging, protocol, webview]
status: stable
generated: { by: human:neumaennl, at: 2026-11-18T08:18:54Z }
verified: { by: human:neumaennl, at: 2026-11-18T08:56:25Z }
sources:
  - id: messages
    resource: ../../shared/messages.ts
    title: Message types
  - id: webview-provider
    resource: ../../src/webviewProvider.ts
    title: Custom editor provider (receives the messages of the webview)
  - id: ux-concept
    resource: ../ux-concept.md
    title: UX concept
  - id: messaging
    resource: ../messaging.md
    title: Messaging
  - id: issue-448
    resource: https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/448
    title: "Review the structure of the editor code (#448)"
---

# ADR 005: Message protocol

**Status:** Accepted  
**Date:** 2026-11-18

## Context

The webview sends one kind of message, `executeCommand`, which wraps a `SchemaCommand`. `WebviewMessage`, the union of the messages from the webview, has this single member, and the switch over it in `handleWebviewMessage()` has one case.[^messages][^webview-provider] It was open whether this is intended: if every message from the webview is a schema edit, the wrapper is redundant; if the webview is meant to send other requests, they are missing so far. The structure review ([#448](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/448)) decided it.[^issue-448]

The [UX concept](../ux-concept.md#context-menu) plans a context menu with find usages, go to definition, cut, copy, paste and regenerate sample XML.[^ux-concept] Some of these need the extension host but do not change the schema:

- **Go to definition** of a component in an included or imported schema opens another file, which only the extension host can do. The same holds for showing a node in the text editor.
- **Find usages** across included and imported schemas needs their content, which only the extension host can read.
- **Regenerate sample XML** writes a file.
- **Copy and paste** may need the clipboard of VS Code.

Several of them expect an answer. The protocol has no way yet to match an answer to its request: `commandResult` does not say which command it belongs to (see [Messaging](../messaging.md#limitations)).[^messaging]

## Decision

1. **The messages from the webview are a union of requests.** Each kind of request is a member of `WebviewMessage`, told apart by `command`. A schema edit is one kind of request, `executeCommand`, whose data is the `SchemaCommand`. New requests, such as opening a definition, get members of their own; they are not disguised as schema commands, which would make the extension host validate and execute them as edits.
2. **All schema edits stay in one kind of message.** The extension host passes every `executeCommand` to the `CommandProcessor` in one place, so validation, execution and writing the document stay one path. The commands are not lifted into the message union.
3. **Answers are matched by a request ID.** A request that expects an answer carries a `requestId`, which the answer repeats. The first request that expects an answer introduces the field, as does the fix of [Commands can overlap while an edit is applied](../known-issues.md#commands-can-overlap-while-an-edit-is-applied) for `executeCommand` and `commandResult`.
4. **Both ends are typed.** The extension host sends only `ExtensionMessage`s and the webview only `WebviewMessage`s, so that the compiler checks both ends of the protocol (see [Principles](../architecture.md#principles)).

## Consequences

- The switch in `handleWebviewMessage()` keeps its single case until the first other request is added. ESLint reports the switch as an unnecessary condition (`@typescript-eslint/no-unnecessary-condition`); an `eslint-disable-next-line` comment points to this ADR.
- The known issue "Every message from the webview is a schema command" is resolved by this decision.

## Rejected alternatives

- **Sending schema commands directly.** `WebviewMessage` would be `SchemaCommand`. This removes one level of nesting, but the first request that is not an edit would need the envelope again, and until then a request that is not an edit would have to be a schema command.
- **One message per schema command.** Each command would be a member of `WebviewMessage`. The extension host would have to tell edits from other requests by a list of command types, and the union would mix two kinds of things.

## Review

Review this decision when the first request that is not a schema edit is designed, or when requests and answers are matched for the first time.

[^messages]: [Message types](../../shared/messages.ts)

[^webview-provider]: [Custom editor provider (receives the messages of the webview)](../../src/webviewProvider.ts)

[^ux-concept]: [UX concept](../ux-concept.md)

[^messaging]: [Messaging](../messaging.md)

[^issue-448]: [Review the structure of the editor code (#448)](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/448)
