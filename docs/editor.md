---
type: Component
title: Editor
description: The custom editor and the webview app - how the editor opens, the page layout, the app that wires palette, diagram and property panel together, navigation, diagram settings, the palette and the property panel tabs.
tags: [editor, webview, palette, property-panel, navigation, ui]
status: stable
generated: { by: human:neumaennl, at: 2026-10-07T14:41:24Z }
verified:
  by: human:neumaennl
  at: 2026-10-08T08:46:19Z
sources:
  - id: manifest
    resource: ../package.json
    title: Extension manifest
  - id: extension
    resource: ../src/extension.ts
    title: Extension activation (editor registration)
  - id: webview-provider
    resource: ../src/webviewProvider.ts
    title: Custom editor provider
  - id: webview-main
    resource: ../webview-src/main.ts
    title: Webview entry point (SchemaEditorApp)
  - id: palette-items
    resource: ../webview-src/palette/PaletteItems.ts
    title: Palette item definitions
  - id: property-panel
    resource: ../webview-src/propertyPanel/propertyPanel.ts
    title: PropertyPanel
---

# Purpose

The editor is what the user sees and works with: a webview with a palette on the left, the schema diagram in the middle and a property panel on the right. It shows the schema and turns user actions into commands. It never changes the schema itself. See [Architecture](architecture.md) for how it fits into the extension.

This document describes the parts of the editor and how they are connected. The details are in other documents:

| Topic | Document |
|---|---|
| Interaction model: what is done where | [UX concept](ux-concept.md) |
| How the diagram is built, laid out and drawn | [Diagram rendering](diagram-rendering.md) |
| How a palette drop becomes a command | [Drag and drop](drag-and-drop.md) |
| Messages between webview and extension | [Messaging](messaging.md) |
| What happens to a command in the extension | [Persistence](persistence.md) |

# Opening the editor

The extension contributes the custom editor `xmlSchemaVisualEditor.editor` for `*.xsd` files with priority `option`, so the text editor stays the default.[^manifest] Users open the visual editor through:

- "Open With…" → "XML Schema Visual Editor",
- the explorer context menu entry "Open in XML Schema Visual Editor" (command `xmlSchemaVisualEditor.openEditor`), shown for `.xsd` files.

`SchemaEditorProvider` implements `CustomTextEditorProvider`, so the editor works on the regular text document. Saving, undo/redo and the dirty marker are handled by VS Code. The webview is registered with `retainContextWhenHidden: true`, and one document can only be open in one visual editor at a time (`supportsMultipleEditorsPerDocument: false`).[^extension]

# Webview page

The provider generates the HTML page. It allows scripts, restricts local resources to the extension folder, and sets a Content Security Policy with `default-src 'none'` and a nonce for the script. It loads `webview/main.js`, `webview/styles.css` and the Codicon CSS.[^webview-provider]

| Area | Element | Content |
|---|---|---|
| Left | `#palette-panel` | Palette of schema constructs |
| Center, top | `#notification-bar` | Error messages, dismissible |
| Center, top | `#toolbar` | Zoom In, Zoom Out, Fit View |
| Center | `#schema-canvas` (SVG) | The diagram |
| Right | `#properties-panel` | Properties of the selected node |

The styles use VS Code theme CSS variables, so the editor follows the active color theme.

# SchemaEditorApp

`SchemaEditorApp` in `webview-src/main.ts` is the webview's entry point. It creates the renderer, the palette and the property panel, and wires them together.[^webview-main]

**Messages from the extension**

| Message | Reaction |
|---|---|
| `updateSchema` | Store the schema, update the name list of `DropCommandFactory`, re-render the diagram, hide the notification, restore the selection, save state. |
| `updateDiagramOptions` | Store the options, save state, re-render. |
| `error` | Show the message in the notification bar. |
| `commandResult` | On success, hide the notification. On failure, show the error and restore the selection. |

All edits are sent as `executeCommand` messages. See [Messaging](messaging.md).

**State.** The app saves the last schema, the view state (zoom, pan) and the diagram options with `vscode.setState`, and reads them at startup, so the diagram reappears at once when the webview is recreated. The restored zoom and pan are not applied to the first render, and the expand state is not saved (see [Known issues](known-issues.md#view-state-is-not-restored-after-reopening)). The selection is kept in memory only; after every re-render the app selects the node with the same ID again (see [UX concept](ux-concept.md#synchronization)).

# Navigation

Zoom and pan are handled by the app, which passes the view state to the renderer:[^webview-main]

- Mouse wheel: zoom around the cursor.
- Toolbar: Zoom In and Zoom Out (around the center), Fit View (fit the whole diagram into the canvas).
- Panning: drag with the left mouse button on the background, with the middle mouse button, or with Ctrl + left mouse button.
- On the first render without a saved pan position, the diagram is centered.

# Diagram

The diagram shows the schema as a tree of nodes. Clicking a node selects it and shows it in the property panel; clicking its expand button shows or hides its children. How it is built and drawn is described in [Diagram rendering](diagram-rendering.md).

Three user settings change the diagram. All are booleans and default to `false`:[^manifest]

| Setting | Effect |
|---|---|
| `xmlSchemaVisualEditor.showDocumentation` | Show documentation text below items. |
| `xmlSchemaVisualEditor.alwaysShowOccurrence` | Show occurrence (min..max) also for the default `1..1`. |
| `xmlSchemaVisualEditor.showType` | Show the type name in items. |

# Palette

The palette lists the constructs that can be added, in four groups, each with a Codicon and a tooltip:[^palette-items]

| Group | Items |
|---|---|
| Structure | element, attribute, group, any (disabled) |
| Compositors | sequence, choice, all |
| Types | complexType, simpleType, extension, restriction |
| Facets | enumeration, pattern, length, minLength, maxLength, minExclusive, minInclusive, maxExclusive, maxInclusive, totalDigits, fractionDigits, whiteSpace |

Items are added by dragging them onto a node in the diagram. Which construct can be dropped where, and which command a drop creates, is described in [Drag and drop](drag-and-drop.md).

# Property panel

`PropertyPanel` shows the selected node and is the place where existing constructs are edited.[^property-panel] Its header shows the node type, the node ID and, if the node can be deleted, a delete button.

| Tab | Shown for | Content |
|---|---|---|
| General | All nodes | Name, type, cardinality, constraints, default/fixed value (elements), namespace declarations (schema root), attributes |
| Facets | Simple types derived by restriction (not list or union) | Facet values, add and delete facets |
| Docs | All nodes (not editable for every node) | `xs:documentation` entries of the node's annotations |
| XML | All nodes | Read-only XML preview of the node |

Which fields are editable, the draft copy and the type suggestions are described in [UX concept](ux-concept.md#property-panel).

[^manifest]: Extension manifest

[^extension]: Extension activation (editor registration)

[^webview-provider]: Custom editor provider

[^webview-main]: Webview entry point (SchemaEditorApp)

[^palette-items]: Palette item definitions

[^property-panel]: PropertyPanel
