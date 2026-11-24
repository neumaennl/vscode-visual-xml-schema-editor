---
type: Architecture Decision Record
title: "ADR 007: Diagram items reference their schema objects"
description: The decision that the items of the diagram reference the schema objects they show instead of copying values from them, that the webview reads these objects through accessor modules, and that the properties panel only reads them, with the reasons, the consequences and when to review it.
tags: [adr, architecture, webview, diagram, properties-panel]
status: stable
generated: { by: human:neumaennl, at: 2026-11-24T16:37:13Z }
verified: { by: human:neumaennl, at: 2026-11-24T17:27:00Z }
sources:
  - id: diagram-item
    resource: ../../webview-src/diagram/DiagramItem.ts
    title: DiagramItem
  - id: schema-accessors
    resource: ../../webview-src/diagram/schemaAccessors.ts
    title: Accessors of the schema objects
  - id: type-accessors
    resource: ../../webview-src/diagram/typeAccessors.ts
    title: Accessors of the types and derivations
  - id: documentation-accessors
    resource: ../../webview-src/diagram/documentationAccessors.ts
    title: Accessors of the documentation
  - id: webview-main
    resource: ../../webview-src/main.ts
    title: Webview entry point
  - id: issue-360
    resource: https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/360
    title: "Let DiagramItem reference its schema object instead of copying values (#360)"
---

# ADR 007: Diagram items reference their schema objects

**Status:** Accepted  
**Date:** 2026-11-23  
**Issue:** [#360](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/360)[^issue-360]

## Context

The webview shows the schema as a tree of diagram items. Each item copied about twenty values from the schema object it shows, such as the type, the occurrences, the facets and the documentation, and some of them in a changed form, such as `-1` for `unbounded`.[^diagram-item] The renderer, the properties panel and the drop rules read these copies.

- Every new value had to be added in three places: on the item, in the diagram builder and in the copy that the properties panel edits.
- Values that were not copied, or copied in a reduced form, caused bugs: element references were not recognized, and `maxOccurs="0"` was drawn as repeated.
- The drop rules read some values from the text that the diagram shows, such as the base type in "restricts xs:string".

## Decision

- **An item references the schema object it shows.** An element, a named type, a group definition, a compositor, a group reference or the schema. An element whose type is anonymous is one item, which shows the element and its type. The item keeps only what belongs to the view: its ID, the text it shows (`label`), its kind, its parent and children, whether its children are shown, and its layout. Its kind includes the kind of schema construct, which the builder records from the field of the parent it found the object in: the schema object alone cannot tell a complex type without content from a simple type, and the ID is an address, not a description.
- **The diagram references the whole schema.** Facts about the schema, such as its target namespace and prefixes, are read from it, not copied.
- **Accessor modules read the schema objects.** Besides the diagram builder, only the accessor functions in `webview-src/diagram/` know the shape of the generated schema classes: `schemaAccessors.ts`, `typeAccessors.ts` for types and derivations, and `documentationAccessors.ts` for documentation.[^schema-accessors][^type-accessors][^documentation-accessors] They type the schema objects with the generated classes, not with shapes of their own, so the types say which schema objects have an attribute. The renderer, the properties panel and the drop rules use them.
- **Nothing in the webview changes the schema objects.** The properties panel shows the selected item itself. An edit sends a command and changes nothing else; the panel and the diagram show the change with the next schema from the extension host. Its reply to every command, also to a failed one, shows the selected node again.[^webview-main] Until then, a field keeps what the user typed.

## Reasons

- **One layer for the shape of the schema classes.** The generated classes change with xmlbind-ts 3 ([#444](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/444)). Then only the builder and the accessor modules have to follow.
- **Nothing is lost on the way.** What the schema says is read from the schema, so a value cannot be missing or reduced.
- **A rejected value cannot leak.** The webview keeps no value that the extension host has not applied, so a rejected or unsent value can neither appear on the next redraw of the diagram nor be saved with the view state.
- **The webview does not repeat the executors.** Showing a change before the extension host has applied it would mean applying it to the schema object a second time, in the webview.

## Consequences

- A new value that the webview needs is a new accessor function, not a new field on the item.
- The drop rules decide by the schema objects, not by the text that the diagram shows.
- Tests of the webview build their items from a schema, so that the items have schema objects. A test that creates an item by hand and never reads its schema object says so with a schema object that fails the test when it is read.
- Until the extension host answers, which takes a few milliseconds, the panel shows the values of the last schema; only the field that was edited shows the new value.

## Rejected alternatives

- **Keeping the copies and generating them.** A generated copy would not be lost or reduced, but the values would still be stored twice.
- **A draft with a copy of the schema object.** The properties panel would change the copy to show a change before the extension host has applied it. That repeats what the executors do, and the reply of the extension host replaces the panel a few milliseconds later anyway.

## Review

Review this decision when the schema objects of xmlbind-ts 3 are known ([#444](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/444)), or when the diagram shows inline types as items of their own ([#358](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/358)).

[^diagram-item]: [DiagramItem](../../webview-src/diagram/DiagramItem.ts)

[^schema-accessors]: [Accessors of the schema objects](../../webview-src/diagram/schemaAccessors.ts)

[^type-accessors]: [Accessors of the types and derivations](../../webview-src/diagram/typeAccessors.ts)

[^documentation-accessors]: [Accessors of the documentation](../../webview-src/diagram/documentationAccessors.ts)

[^webview-main]: [Webview entry point](../../webview-src/main.ts)

[^issue-360]: [Let DiagramItem reference its schema object instead of copying values (#360)](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/360)
