---
type: Component
title: Editor
description: The custom editor and the webview app - how the editor opens, the page layout, the app that wires palette, diagram and properties panel together, navigation, diagram settings, the palette and the properties panel tabs.
tags: [editor, webview, palette, properties-panel, navigation, ui]
status: draft
generated: { by: human:neumaennl, at: 2026-11-26T13:58:35Z }
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
  - id: diagram-canvas
    resource: ../webview-src/canvas/DiagramCanvas.ts
    title: DiagramCanvas
  - id: canvas-view
    resource: ../webview-src/canvas/CanvasView.ts
    title: CanvasView (zoom and pan)
  - id: palette-items
    resource: ../webview-src/palette/paletteEntries.ts
    title: Palette entries
  - id: properties-panel
    resource: ../webview-src/propertiesPanel/propertiesPanel.ts
    title: PropertiesPanel
---

# Purpose

The editor is what the user sees and works with: a webview with a palette on the left, the schema diagram in the middle and a properties panel on the right. It shows the schema and turns user actions into commands. It never changes the schema itself. See [Architecture](architecture.md) for how it fits into the extension.

This document describes the parts of the editor and how they are connected. The details are in other documents:

| Topic                                        | Document                                  |
| -------------------------------------------- | ----------------------------------------- |
| Interaction model: what is done where        | [UX concept](ux-concept.md)               |
| How the diagram is built, laid out and drawn | [Diagram rendering](diagram-rendering.md) |
| How a palette drop becomes a command         | [Drag and drop](drag-and-drop.md)         |
| Messages between webview and extension       | [Messaging](messaging.md)                 |
| What happens to a command in the extension   | [Persistence](persistence.md)             |

# Opening the editor

The extension contributes the custom editor `visualXmlSchemaEditor.editor` for `*.xsd` files with priority `option`, so the text editor stays the default.[^manifest] Users open the visual editor through:

- "Open With…" → "Visual XML Schema Editor",
- the explorer context menu entry "Open in Visual XML Schema Editor" (command `visualXmlSchemaEditor.openEditor`), shown for `.xsd` files.

The editor is a custom text editor, so it works on the regular text document, and VS Code handles saving, undo/redo and the dirty marker. The webview keeps its content while it is hidden, and a document can only be open in one visual editor at a time.[^extension]

# Webview page

The provider generates the HTML page. It allows scripts, restricts local resources to the extension folder, and sets a Content Security Policy with `default-src 'none'` and a nonce for the script. It loads `webview/main.js`, `webview/styles.css` and the Codicon CSS.[^webview-provider]

| Area        | Content                              |
| ----------- | ------------------------------------ |
| Left        | Palette of schema constructs         |
| Center, top | Error messages, in full, dismissible |
| Center, top | Toolbar: Zoom In, Zoom Out, Fit View |
| Center      | The diagram (SVG)                    |
| Right       | Properties of the selected node      |

The styles use VS Code theme CSS variables, so the editor follows the active color theme.

# SchemaEditorApp

`SchemaEditorApp` in `webview-src/main.ts` is the webview's entry point. It creates the canvas, the palette and the properties panel, and wires them together.[^webview-main] The canvas (`DiagramCanvas` in `webview-src/canvas/`) draws the diagram and handles everything that happens on it: selecting, expanding and collapsing nodes, zooming and panning, and drops.[^diagram-canvas]

**Messages from the extension**

| Message                | Reaction                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `updateSchema`         | Store the schema, re-render the diagram (the canvas also updates the names that its drop rules generate), hide the notification, restore the selection, save state. |
| `updateDiagramOptions` | Store the options, save state, re-render.                                                                                                                           |
| `error`                | Show the message in the notification bar.                                                                                                                           |
| `commandResult`        | On success, hide the notification. On failure, show the error and restore the selection.                                                                            |

All edits are sent as `executeCommand` messages. See [Messaging](messaging.md).

**State.** The app saves the last schema, the view state (zoom, pan) and the diagram options with `vscode.setState`, and reads them at startup, so the diagram reappears at once, with the saved zoom and pan, when the webview is recreated. The expand state is not saved (see [Known issues](known-issues.md#expand-state-is-not-restored-after-reopening)). The selection is kept in memory only; the canvas keeps the selected node selected across every redraw, and after an `updateSchema` the app shows the node with the same ID again in the properties panel, follows it to its new ID if an edit changed it, or clears it if the node is gone (see [UX concept](ux-concept.md#synchronization)).

# Navigation

Zoom and pan are handled by the canvas, which reports every change to the app, which saves it:[^canvas-view]

- Mouse wheel: zoom around the cursor.
- Toolbar: Zoom In and Zoom Out (around the center), Fit View (fit the whole diagram into the canvas).
- Panning: drag with the left mouse button on the background, with the middle mouse button, or with Ctrl + left mouse button.
- On the first render without a saved view state, the diagram is centered.

# Diagram

The diagram shows the schema as a tree of nodes. Clicking a node selects it and shows it in the properties panel; clicking its expand button shows or hides its children. How it is built and drawn is described in [Diagram rendering](diagram-rendering.md).

Three user settings change the diagram. All are booleans and default to `false`:[^manifest]

| Setting                                      | Effect                                                  |
| -------------------------------------------- | ------------------------------------------------------- |
| `visualXmlSchemaEditor.showDocumentation`    | Show documentation text below items.                    |
| `visualXmlSchemaEditor.alwaysShowOccurrence` | Show occurrence (min..max) also for the default `1..1`. |
| `visualXmlSchemaEditor.showType`             | Show the type name in items.                            |

# Palette

The palette lists the schema constructs that can be added, in four groups, each with a Codicon and a tooltip:[^palette-items]

| Group       | Items                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Structure   | element, attribute, group, any (disabled)                                                                                                           |
| Compositors | sequence, choice, all                                                                                                                               |
| Types       | complexType, simpleType, extension, restriction                                                                                                     |
| Facets      | enumeration, pattern, length, minLength, maxLength, minExclusive, minInclusive, maxExclusive, maxInclusive, totalDigits, fractionDigits, whiteSpace |

Items are added by dragging them onto a node in the diagram. Which schema construct can be dropped where, and which command a drop creates, is described in [Drag and drop](drag-and-drop.md).

# Properties panel

`PropertiesPanel` shows the selected node and is the place where existing schema constructs are edited.[^properties-panel] Its header shows the node type, the node ID and, if the node can be deleted, a delete button.

| Tab     | Shown for                                               | Content                                                                                                                |
| ------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| General | All nodes                                               | Name, type, cardinality, constraints, default/fixed value (elements), namespace declarations (schema root), attributes |
| Facets  | Simple types derived by restriction (not list or union) | Facet values, add and delete facets                                                                                    |
| Docs    | All nodes (not editable for every node)                 | `xs:documentation` entries of the node's annotations                                                                   |
| XML     | All nodes                                               | Read-only XML preview of the node                                                                                      |

Which fields are editable, how the panel shows changes and the type suggestions are described in [UX concept](ux-concept.md#properties-panel).

[^manifest]: Extension manifest

[^extension]: Extension activation (editor registration)

[^webview-provider]: Custom editor provider

[^webview-main]: Webview entry point (SchemaEditorApp)

[^diagram-canvas]: DiagramCanvas

[^canvas-view]: CanvasView (zoom and pan)

[^palette-items]: Palette entries

[^properties-panel]: PropertiesPanel
