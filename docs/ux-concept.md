---
type: Concept
title: UX concept
description: The interaction model of the editor - which surface adds, edits and deletes what, how facets work, and how the property panel behaves - with a list of what the current editor does not implement yet.
tags: [ux, editor, palette, property-panel, facets, context-menu, toolbar]
status: stable
generated: { by: human:neumaennl, at: 2026-10-08T10:18:09Z }
verified: { by: human:neumaennl, at: 2026-10-08T12:56:31Z }
sources:
  - id: palette-items
    resource: ../webview-src/palette/PaletteItems.ts
    title: Palette item definitions
  - id: drop-type-helpers
    resource: ../webview-src/drop/DropCommandFactoryTypeHelpers.ts
    title: Drop helpers for types, derivations and facets
  - id: property-panel
    resource: ../webview-src/propertyPanel/propertyPanel.ts
    title: PropertyPanel
  - id: panel-types
    resource: ../webview-src/propertyPanel/propertyPanelTypes.ts
    title: Type and base type fields of the property panel
  - id: panel-facets
    resource: ../webview-src/propertyPanel/propertyPanelFacets.ts
    title: Facets tab
  - id: panel-docs
    resource: ../webview-src/propertyPanel/propertyPanelDocs.ts
    title: Docs tab
  - id: panel-xml
    resource: ../webview-src/propertyPanel/propertyPanelXmlPreview.ts
    title: XML tab preview
  - id: panel-commands
    resource: ../webview-src/propertyPanel/propertyPanelCommands.ts
    title: Commands sent by the property panel
  - id: webview-main
    resource: ../webview-src/main.ts
    title: Webview entry point (SchemaEditorApp)
---

# Purpose

This document defines how users interact with the editor: the palette, the diagram, the property panel, the context menu and the toolbar. It describes the intended model. Most of it is implemented; what is not is listed in [Current state](#current-state).

The components that implement the model are described in [Editor](editor.md); the commands they send are listed in [Commands](commands.md). A prototype of the UX direction exists in the `emergent` branch ([#153](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/153)).

# Core rules

- New constructs are added by dragging an item from the palette onto a node in the diagram.
- Existing constructs are edited in the property panel, and deleted there where deletion is supported.
- The toolbar only has actions for the whole schema or diagram.
- The context menu complements palette and panel; it is never the main way to add or edit.
- The XML tab of the property panel is read-only.

# What goes where

Each interaction belongs to one main surface:

| Surface | Role | Examples |
|---|---|---|
| Palette and drag and drop | Add constructs | elements, attributes, groups, compositors, simple and complex types, restriction, extension, facets[^palette-items] |
| Property panel | Edit and delete the selected node | name, type, cardinality, facet values, documentation, delete |
| Toolbar | Actions for the whole diagram | zoom in, zoom out, fit view |
| Context menu | Contextual operations | reorder, refactor, find usages, go to definition, cut, copy, paste, regenerate sample XML |
| Read-only display | Computed values | namespace, derived labels, unresolved values |

Discoverability rule: adding starts in the palette, editing starts in the panel. The context menu adds contextual operations to both.

# Facets

## Adding, editing and deleting

Facets follow the same pattern as all other constructs:

- **Add:** drag a facet item from the palette onto a simple type derived by restriction, or onto an element with such an anonymous simple type. The facet is added with a default value.[^drop-type-helpers]
- **Edit:** change the value in the Facets tab of the property panel.
- **Delete:** use the delete control in the facet's row.[^panel-facets]

Every change in the Facets tab sends `modifySimpleType` with the base type and the complete set of facets (see [Commands](commands.md#restriction-facets)).

## Multiple facets on the same type

A restriction can have any number of facets at once, and the Facets tab shows a row for each of them. XSD defines which facets apply to which base types:

| Facet | Applies to |
|---|---|
| `enumeration` | all types except `xs:boolean` |
| `pattern` | all types |
| `length`, `minLength`, `maxLength` | string and binary types (`xs:string`, `xs:hexBinary`, `xs:base64Binary` and their derived types) |
| `minInclusive`, `maxInclusive`, `minExclusive`, `maxExclusive` | numeric, date and time types |
| `totalDigits`, `fractionDigits` | `xs:decimal` and its derived types |
| `whiteSpace` | string types |

## Combinations

Some facets cannot be combined:

| Combination | Rule |
|---|---|
| `length` with `minLength` or `maxLength` | Not allowed. |
| `minInclusive` with `minExclusive` | Only one lower bound. |
| `maxInclusive` with `maxExclusive` | Only one upper bound. |
| `enumeration` with range or length facets | Allowed; the values must also satisfy the other facets. |
| `enumeration` with `pattern` | Allowed; a value must match the pattern and be in the list. |

Palette drops and panel edits prevent facets that do not apply to the base type and combinations that are not allowed.

## Multiple patterns

XSD allows several `xs:pattern` facets in one restriction; a value must match all of them. The panel shows and edits the first pattern; the others are preserved when a facet is edited. Editing all patterns is planned for Phase 3.

# Property panel

## General

The panel shows an editable field only where the selected node supports the matching command:[^property-panel]

| Node | Editable fields |
|---|---|
| Element | Name; Type (explicit type) or Base Type and Replacement Type (anonymous type); minOccurs and maxOccurs (local elements only); default and fixed value; nillable; abstract (top-level only); mixed (anonymous complex type) |
| Simple type | Name; Base Type, if a single base type can be resolved |
| Complex type | Name; Base Type, if the type is derived by extension; abstract; mixed |
| Group | Name |
| Attribute | Name, type, use, default and fixed value |

Computed values are shown as read-only text, for example the namespace, the group type, the anonymous-type indicator and summary labels such as `simpleType (restricts xs:string)`. The schema root shows its namespace declarations (see [Editor](editor.md#property-panel)).

The panel header has a delete button for the selected node.[^panel-commands]

## Facets

- Shown for simple types and elements with simple content that are derived by restriction, not by list or union.
- Shows an editable row for every facet that is present.
- Without facets, it points the user to the palette.[^panel-facets]

## Type editing safety rule

- A type field is only editable if the panel can map it to exactly one schema property. Summary labels are never edited directly.
- An element with `type="…"` has an editable **Type** field.
- An element with an anonymous simple type has an editable **Base Type** field and the Facets tab. An element with an anonymous complex type derived by extension has an editable **Base Type** field. Both offer a **Replacement Type** field that replaces the anonymous type with a reference to a named type.
- Dropping an anonymous simple or complex type on an element with `type="…"` replaces the reference with the anonymous type instead of failing.
- Dropping **restriction** on a node creates or changes a restriction; dropping **extension** creates or changes a complex type extension. The base type is the one shown on the node; without one, it is `xs:string` for simple types and `xs:anyType` for complex types and extensions.[^drop-type-helpers]
- Type and Base Type fields suggest the built-in XSD types and the types of the current schema, with and without the schema's prefix. Any other value can be typed, for types from imported or included schemas.[^panel-types]

## Docs

- Each documentation entry is a text field that commits on blur or Enter, like all other fields. There is no save button.
- Documentation entries can be added and removed, each with its language (`xml:lang`). The schema root can have several annotations, which can be added and removed; other nodes show only their first annotation.
- Nodes without a target for documentation show "Documentation cannot be edited for this node."[^panel-docs]

## XML

The XML tab is read-only. It shows an XSD fragment for the node, generated in the webview from the panel's draft copy, so edits appear immediately. The fragment includes attributes, annotations, facets and some child nodes, and is shortened for large nodes.[^panel-xml] It states: "Preview only; it may differ from the exact schema XML. Open the schema in a text editor tab for the source of truth."

## Synchronization

- The panel edits a draft copy of the selected node, so switching tabs does not reload old values from the diagram.
- After every schema update, the panel finds the selected node again by its ID and the diagram highlights it again. If the node no longer exists, the panel is cleared.
- When a command fails, the webview shows the error message, and the panel shows the node again as it was before the edit.[^webview-main]

# Context menu and toolbar

## Context menu

- Depends strongly on the selected node.
- Offers operations that do not fit palette or panel: reorder, a refactor submenu, find usages, go to definition, cut, copy, paste, and regenerate sample XML.
- May repeat add, edit and delete actions as shortcuts, without becoming the main way to do them.

## Toolbar

- Only has actions for the whole diagram (zoom in, zoom out, fit view).
- Operations on single nodes belong in the palette, the panel or the context menu.

# Current state

The current editor does not implement these parts of the model yet:

- **Context menu:** there is none.
- **Keyboard shortcuts:** there are none (for example, Delete or arrow keys to move the selection); Enter only commits a field (see [Known issues](known-issues.md#phase-5-issue-does-not-reflect-palette-drag-and-drop)).
- **Attribute groups:** the palette has no item for them (see [Known issues](known-issues.md#palette-has-no-entry-for-attribute-groups)). The `any` item is shown but disabled.
- **Facet checks:** neither the webview nor the extension host checks facets against the base type or forbidden combinations (see [Known issues](known-issues.md#facets-are-not-checked-against-the-base-type)).
- **Multiple patterns:** editing a facet deletes all patterns except the first (see [Known issues](known-issues.md#editing-facets-drops-all-but-the-first-pattern)).
- **Deleting facets:** the last facet of a restriction cannot be deleted in the Facets tab.
- **Empty Facets tab:** the hint still says that adding facets is "available in a future release" (see [Known issues](known-issues.md#empty-facets-tab-says-adding-facets-is-not-available-yet)).
- **Attributes:** no field is editable (see [Known issues](known-issues.md#attribute-editing-is-half-implemented)).
- **Mixed content:** the toggle is also shown for simple content, ignores `mixed` on `xs:complexContent` and does not check the base type (see [Known issues](known-issues.md#mixed-content-toggle-ignores-simple-content-complexcontent-and-the-base-type)).
- **Deleting nodes:** the header delete button exists only for elements, named simple and complex types, groups and group references; attributes, compositors and anonymous types cannot be deleted.
- **Documentation language:** `xml:lang` is preserved but neither shown nor editable (see [Known issues](known-issues.md#language-of-documentation-entries-cannot-be-edited)).
- **Toolbar:** implemented as described; an open Phase 3 issue still plans node actions there (see [Known issues](known-issues.md#phase-3-toolbar-issue-contradicts-the-ux-concept)).

[^palette-items]: Palette item definitions

[^drop-type-helpers]: Drop helpers for types, derivations and facets

[^property-panel]: PropertyPanel

[^panel-types]: Type and base type fields of the property panel

[^panel-facets]: Facets tab

[^panel-docs]: Docs tab

[^panel-xml]: XML tab preview

[^panel-commands]: Commands sent by the property panel

[^webview-main]: Webview entry point (SchemaEditorApp)
