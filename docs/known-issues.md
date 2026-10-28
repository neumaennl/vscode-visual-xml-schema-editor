---
type: Known Issues
title: Known issues
description: Problems found in the extension that are not fixed yet, with links to GitHub issues where they exist.
tags: [known-issues, maintenance, technical-debt]
status: stable
generated: { by: human:neumaennl, at: 2026-10-28T14:12:52Z }
verified: { by: human:neumaennl, at: 2026-10-28T15:08:21Z }
---

# Purpose

This list collects problems that were found but not fixed, so they are not forgotten. It grows when new problems are found and shrinks when they are fixed. Not every entry needs a GitHub issue; when one is created, it is linked from the entry.

Rules:

- Each issue is a `##` heading with a short title, followed by its location, severity, effort, a description and the GitHub issue (a link, or "none").
- Within each section, entries are sorted by severity (high first), then by effort (small first).
- When an issue is fixed, its entry is removed and the removal is recorded in [log.md](log.md).
- Entries in [GitHub issues](#github-issues) describe open GitHub issues that do not match the code or the documentation. They are removed when the GitHub issue is updated or closed.

Severity:

- **High:** a feature fails, or an edit changes or loses data that the user did not ask to change.
- **Medium:** a visible bug that misinforms the user or blocks a task, missing editor support for constructs that are common in schemas, or a mismatch that is likely to lead to wrong changes.
- **Low:** cosmetic issues, maintainability problems (structure, duplicated or dead code), missing support for rare constructs or details, or minor inaccuracies.

Severity rates the problem itself, not its priority and not the problems it causes; those have entries of their own.

Effort:

- **S:** less than an hour, a local change.
- **M:** a few hours, changes in several files.
- **L:** a day or more, or design decisions are needed.

# Code

## Dropping an enumeration replaces the existing values

- **Location:** `webview-src/drop/DropCommandFactoryTypeHelpers.ts` (`createFacetNodeDropCommand()`)
- **Severity:** High
- **Effort:** S
- **Description:** Dropping the enumeration facet onto a type that already has enumeration values sends `modifySimpleType` with the existing facets overwritten by the default facet, so `["a", "b"]` becomes `["value"]`. The values are lost without a warning; only undo brings them back. The fix is to append the default value (made unique, for example `value2`) to the existing list instead of replacing it.
- **GitHub issue:** none

## Editing facets drops all but the first pattern

- **Location:** `shared/commands/schemaTypes.ts` (`RestrictionFacets.pattern`), `src/commandExecutors/simpleTypeExecutors.ts`, `webview-src/propertiesPanel/propertiesPanelFacets.ts`, `webview-src/drop/DropCommandFactoryTypeHelpers.ts` (`createFacetNodeDropCommand()`)
- **Severity:** High
- **Effort:** M
- **Description:** XSD allows several `xs:pattern` facets in one restriction, and the diagram reads all of them, but `RestrictionFacets.pattern` is a single string. `modifySimpleType` replaces all facets with the ones in the payload, and the properties panel sends only the first pattern (`pattern?.[0]`). Changing any facet of a type with two or more patterns therefore deletes all patterns but the first, without a warning (see [Commands](commands.md#restriction-facets)). Dropping a facet from the palette does the same, and dropping a pattern replaces the existing pattern with the default `.*` instead of adding one (see [Drag and drop](drag-and-drop.md#defaults)). The fix is to make `pattern` a `string[]` like `enumeration`, write one `xs:pattern` per value, send all patterns from the properties panel and the facet drop, and append a dropped pattern. See also [Diagram items copy values from the schema objects](#diagram-items-copy-values-from-the-schema-objects).
- **GitHub issue:** none

## Attributes on derived complex types are rejected or misplaced

- **Location:** `webview-src/drop/DropCommandFactory.ts` (`createAttributeNodeDropCommand()`), `src/commandExecutors/attributeExecutors.ts` (`addAttributeToParent()`)
- **Severity:** High
- **Effort:** M
- **Description:** In a complex type with `xs:complexContent` or `xs:simpleContent`, attributes belong inside the `xs:extension` or `xs:restriction`. The drop and the command get this wrong in two ways:
  - The attribute drop accepts a named complex type only if its label is exactly `complexType`. A derived named type is labelled `complexType (extends Base)` or `complexType (restricts Base)`, so the drop is rejected.
  - On an element with an anonymous complex type, the drop is accepted whatever the content model is. `addAttribute` always appends the attribute to the complex type itself, so for a derived anonymous type it writes `<attribute>` after `<complexContent>`, which is invalid XSD, and reports success.

  The fix is to use `isComplexTypeNode()` in the attribute drop rule, as the other rules do, and to add the attribute to the extension or restriction in the executor when the complex type has complex or simple content.
- **GitHub issue:** none

## Node IDs are ambiguous and have many special cases

- **Location:** `shared/idStrategy.ts`, `src/schemaNavigator.ts`, `src/commandValidators/`, `src/commandExecutors/`, `webview-src/diagram/` (ID generation)
- **Severity:** High
- **Effort:** L
- **Description:** The ID conventions go back to the original protocol design, written before the editor was implemented, and were adapted during implementation (see [Schema model](schema-model.md#node-ids)). Some of the resulting problems are bugs:
  - **Equal names resolve to the first node.** IDs of local elements contain both name and position (`element:first[0]`), but `findByNameOrPosition()` only uses the position when there is no name. If a compositor contains two particles with the same name or the same `ref` (which XSD allows, for example a sequence `a, b, a` or a reference that is repeated), every ID resolves to the first one, and commands change the wrong node.
  - **Element references cannot be addressed.** Unlike group and attribute group references, element references have no node type. The diagram builder gives an `<xs:element ref="…"/>` the name "unnamed", so its ID is `element:unnamed[N]`, which `locateNodeById()` cannot resolve because it matches by name or `ref`. Commands that target such a node fail.
  - **Namespaced names are parsed wrongly.** `locateNodeById()` uses `parseSchemaId()` to split the ID, but then parses each segment with a private copy of the segment parser (`parseSegment`). Unlike `parseNodeSegment()` in `idStrategy.ts`, the copy splits at the first colon and does not handle `{namespace}name`.

  Others are special cases that make the scheme harder to use and to extend:
  - Top-level components, imports and includes are not under `/schema` (`/element:x`, `/import[0]`), but schema-root annotations are (`/schema/annotation[0]`).
  - There are three annotation schemes: a component's annotation uses the component's ID, schema-root annotations are numbered, and `/schema/documentation[N]` is a shorthand for the first schema annotation.
  - Compositors reuse the node type `group` (`group:sequence[0]`) instead of having their own node types.
  - `complexContent` derivation is skipped, so the `extension` or `restriction` has no segment of its own.
  - Top-level components have a name and no position; local elements have both, but only one is used.
  - The last segment of annotations, imports, includes and references is resolved by the individual validators and executors instead of one resolver.
  - The doc comments of `parentId` in `shared/commands/schemaTypes.ts` say "Omit or set to 'schema'", but `isSchemaRoot()` only accepts `/schema`; `parentId: "schema"` fails with "Parent not found: schema".

  The goal is one consistent grammar, generated and resolved by a single implementation in `shared/`. Since IDs are not stored in the XSD file, a new format needs no migration. The redesign should be planned together with [Diagram items copy values from the schema objects](#diagram-items-copy-values-from-the-schema-objects), which also changes the diagram builder.
- **GitHub issue:** [#348](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/348)

## Removing a namespace prefix does not check for references

- **Location:** `src/commandValidators/schemaValidators.ts` (`validateModifySchemaNamespaces()`)
- **Severity:** Medium
- **Effort:** S
- **Description:** `modifySchemaNamespaces` replaces the complete prefix map, so a prefix that is missing from the map is removed. The validator does not check whether QNames such as `type="tns:Address"` still use the removed prefix, and the schema is left with references that cannot be resolved. The properties panel sends this command when a namespace row is deleted. `removeImport` already rejects the removal of a namespace that is still referenced (`isPrefixReferencedInSchema()`); the same check is needed for prefixes that are removed and not renamed.
- **GitHub issue:** none

## Documentation overlaps the next item

- **Location:** `webview-src/diagram/DiagramItem.ts` (`calculateBoundingBox()`), `webview-src/diagram/DiagramLayout.ts`
- **Severity:** Medium
- **Effort:** S
- **Description:** With `showDocumentation`, the documentation of an item is drawn in a box 5 px below its shape, up to 100 px high. The item's bounding box does not include this box, and the next sibling is placed 20 px below the bounding box. The documentation is therefore drawn over the next item: for a top-level element with 150 characters of documentation, the box ends at y = 115, while the next element starts at y = 60. The fix is to include the documentation box in the bounding box (see [Diagram rendering](diagram-rendering.md#layout)). See also [Documentation in the diagram is cut off and hard to read](#documentation-in-the-diagram-is-cut-off-and-hard-to-read).
- **GitHub issue:** none

## Generated names ignore local names in the drop target

- **Location:** `webview-src/drop/DropCommandFactory.ts` (`updateNamesFromSchema()`, `nextName()`)
- **Severity:** Medium
- **Effort:** S
- **Description:** The names for dropped elements and attributes are generated from the names of top-level constructs only. If the drop target already contains a local element `Element1` or a local attribute `Attribute1`, the drop generates the same name, and the command is rejected with an error such as "Cannot add element: duplicate element name 'Element1' in sequence". For attributes, the message contains the internal term `topLevelComplexType` instead of the type name. A second drop succeeds, because the failed name stays reserved until the next schema update. The fix is to also skip the names already used in the drop target (see [Drag and drop](drag-and-drop.md#defaults)).
- **GitHub issue:** none

## Diagram error text stays after a successful render

- **Location:** `webview-src/renderer.ts` (`showError()`), `webview-src/diagram/DiagramSvgRenderer.ts` (`render()`)
- **Severity:** Medium
- **Effort:** S
- **Description:** When building, laying out or drawing fails, `DiagramRenderer.showError()` adds the text "Error: …" to the canvas group. The next render only empties the content group inside it, so the error text stays visible over the diagram, even after the schema has been fixed. The app also shows the error in the notification bar, which is enough. The fix is to remove the SVG error text, or to put it into the content group (see [Diagram rendering](diagram-rendering.md#pipeline)).
- **GitHub issue:** none

## Restricted complex content is shown without content and attributes

- **Location:** `webview-src/diagram/SchemaProcessors.ts` (`processComplexType()`), `webview-src/diagram/SchemaProcessorsSimpleTypes.ts` (`processRestriction()`)
- **Severity:** Medium
- **Effort:** M
- **Description:** For `xs:complexContent` and `xs:simpleContent`, an `xs:extension` is processed with its attributes and compositors, but an `xs:restriction` is passed to the simple type function `processRestriction()`, which only reads facets. A complex type that restricts another one with complex content is therefore shown without children, and the attributes of both kinds of restriction are missing in the properties panel. The function also sets `simpleTypeDerivationKind` on the complex type. The fix is to process restrictions of complex content like extensions (attributes and compositors), and to read the attributes of restrictions of simple content as well (see [Diagram rendering](diagram-rendering.md#from-schema-to-diagram-items)). See also [Diagram items copy values from the schema objects](#diagram-items-copy-values-from-the-schema-objects).
- **GitHub issue:** none

## Renames and new references do not check for duplicates

- **Location:** `src/commandValidators/elementValidators.ts` (`validateModifyElement()`, `validateModifyAttribute()`), `src/commandValidators/typeValidators.ts` (`validateModifySimpleType()`, `validateModifyComplexType()`), `src/commandValidators/groupValidators.ts` (`validateModifyGroup()`)
- **Severity:** Medium
- **Effort:** M
- **Description:** The `add*` validators reject a name or reference that already exists, but the `modify*` validators of elements, attributes, simple types, complex types and groups only check that the new name or reference is valid. Renaming the top-level element `a` to `b` while `b` exists is accepted and writes a schema with two top-level elements named `b`, which is invalid XSD; the same happens for attributes, types and groups. Likewise, changing a local element or attribute into a reference that its parent already contains (for example a second `<xs:attribute ref="lang"/>` in the same complexType) is accepted, which `validateAddElement()` and `validateAddAttribute()` reject. Because node IDs resolve to the first match, the two nodes can then no longer be told apart (see [Node IDs are ambiguous](#node-ids-are-ambiguous-and-have-many-special-cases)). `validateModifyAttributeGroup()` already has the check for names. The fix is the same check in these validators as in the matching `add*` validators, skipped when the name or reference does not change.
- **GitHub issue:** none

## Removing a simple or complex type does not check for references

- **Location:** `src/commandValidators/typeValidators.ts` (`validateRemoveSimpleType()`, `validateRemoveComplexType()`), `src/commandValidators/elementValidators.ts` (`validateRemoveElement()`, `validateRemoveAttribute()`)
- **Severity:** Medium
- **Effort:** M
- **Description:** Removing a top-level simple or complex type is accepted even if elements, attributes or other types still use it (`validateRemoveSimpleType()` has a `TODO Phase 2` for this). The schema is left with `type` and `base` values that point nowhere. The properties panel sends these commands when a type is deleted. The same applies to top-level elements and attributes that are still referenced with `ref` or `substitutionGroup`. Groups, attribute groups and imports already reject the removal while they are referenced; types, elements and attributes need the same check (see [Commands](commands.md#conventions)).
- **GitHub issue:** none

## View state is not restored after reopening

- **Location:** `webview-src/main.ts` (constructor), `webview-src/renderer.ts`, `webview-src/webviewTypes.ts` (`WebviewState`)
- **Severity:** Medium
- **Effort:** M
- **Description:** When VS Code is restarted with a schema open in the visual editor, all nodes are collapsed and the diagram is not where it was. There are two causes:
  - The zoom and pan are saved, but not applied. The constructor creates `DiagramRenderer` with the default view state object and only afterwards replaces `this.viewState` with the saved one; the renderer keeps the old object and renders at zoom 1, pan 0/0. Centering is skipped because the restored pan is not 0/0, so the root node ends up in the top-left corner. The first pan or zoom then jumps to the saved position.
  - The expand state is not saved. The renderer keeps it across re-renders in memory only; `WebviewState` contains just the schema, the view state and the diagram options.
- **GitHub issue:** [#347](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/347)

## Commands can overlap while an edit is applied

- **Location:** `src/commandProcessor.ts` (`isExecuting`), `src/webviewProvider.ts` (`executeCommand()`), `webview-src/main.ts`
- **Severity:** Medium
- **Effort:** M
- **Description:** `CommandProcessor` guards against concurrent commands with an `isExecuting` flag, but `execute()` is synchronous, so the flag can never be set when the next command arrives. The asynchronous part is not guarded: the provider awaits `applyEdit()`, and the webview sends commands without waiting for `commandResult`. A second command that arrives during the wait reads the document text before the first edit and computes its replace range from it, so it can undo the first change or leave parts of the old text in the document. This follows from the code and was not reproduced in VS Code. The fix is to queue commands in the provider (process one after the other, each after the previous edit is applied) and to remove the flag; the webview could additionally block input while a command is pending (see [Persistence](persistence.md#concurrency)). The messages carry no request ID and `commandResult` does not name its command, so the webview cannot tell which of several pending commands a result belongs to (see [Messaging](messaging.md#limitations)).
- **GitHub issue:** none

## Particles are not shown in document order

- **Location:** `webview-src/diagram/SchemaProcessors.ts` (`processGroup()`)
- **Severity:** Medium
- **Effort:** M
- **Description:** The generated classes store the particles of a compositor in one array per kind, and the diagram builder adds them kind by kind: first the elements, then the group references, then nested `choice`s, then nested `sequence`s. A `sequence` of `a`, a `choice` and `b` is therefore shown as `a`, `b`, `choice`, which gives the wrong order for a sequence. The node IDs are not affected, because positions are counted per kind. xmlbind-ts keeps the element order for serialization (see [Persistence](persistence.md#what-serialization-changes)); the fix is to use it when the children are added (see [Diagram rendering](diagram-rendering.md#from-schema-to-diagram-items)).
- **GitHub issue:** none

## Imports and includes cannot be edited in the editor

- **Location:** `webview-src/diagram/DiagramBuilder.ts`, `webview-src/propertiesPanel/`, `webview-src/palette/`
- **Severity:** Medium
- **Effort:** M
- **Description:** `xs:import` and `xs:include` are neither shown in the diagram nor in the properties panel, and the palette has no entry for them. The commands exist (`addImport`, `removeImport`, `modifyImport`, `addInclude`, `removeInclude`, `modifyInclude`, see [Commands](commands.md#imports-includes-and-namespaces)), but nothing in the webview sends them, so imports and includes can only be edited in the text editor. Other edits keep them unchanged. One option is a section in the properties panel of the schema root, next to the namespace declarations.
- **GitHub issue:** [#359](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/359)

## Element references are not shown as references

- **Location:** `webview-src/diagram/SchemaProcessors.ts`, `webview-src/diagram/SchemaProcessorsGroups.ts`
- **Severity:** Medium
- **Effort:** M
- **Description:** The diagram builder does not read the `ref` attribute of local elements. An `<xs:element ref="…"/>` is shown with the name "unnamed" and is not marked as a reference. `isReference` is only set for group references, and `DiagramItem.inheritFrom` is declared but never set. (That commands on such nodes fail is part of [Node IDs are ambiguous and have many special cases](#node-ids-are-ambiguous-and-have-many-special-cases).) See also [Diagram items copy values from the schema objects](#diagram-items-copy-values-from-the-schema-objects).
- **GitHub issue:** [#276](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/276)

## Name validation is ASCII-only and rejects prefixed references

- **Location:** `src/commandValidators/validationUtils.ts` (`isValidXmlName()`), the validators that call it
- **Severity:** Medium
- **Effort:** M
- **Description:** `isValidXmlName()` is the regular expression `/^[a-zA-Z_][\w.-]*$/`. XML names may contain non-ASCII letters (`Straße`, `名前`), which are rejected. The same function checks `ref` values of elements, attributes, groups and attribute groups, so a reference with a prefix such as `tns:Address`, which is the usual form in schemas with a target namespace, is rejected as well, and the existence checks compare the `ref` with the unprefixed names (`name === ref`). The webview does not send `ref` values yet, so today only names are affected. The fix is a check for NCNames following the XML specification, and a QName check for `ref` that resolves the prefix like `validateElementType()`.
- **GitHub issue:** none

## Mixed content toggle ignores simple content, `complexContent` and the base type

- **Location:** `webview-src/propertiesPanel/propertiesPanel.ts` (`renderConstraintsSection()`, `canShowConstraintsSection()`), `webview-src/diagram/TypeNodeCreators.ts`, `webview-src/diagram/SchemaProcessors.ts`, `src/commandExecutors/complexTypeExecutors.ts`, `src/commandValidators/`
- **Severity:** Medium
- **Effort:** M
- **Description:** The properties panel shows a "Mixed content" toggle for every complex type and for every element with an anonymous complex type. The diagram reads, and `modifyComplexType` writes, only the `mixed` attribute of `xs:complexType`. This is wrong in three cases:
  - **Simple content.** With `xs:simpleContent`, `mixed="true"` has no effect, and XSD 1.0 says it should be avoided. The toggle is shown anyway.
  - **`mixed` on `xs:complexContent`.** If present, it takes precedence over the attribute on `xs:complexType`. It is neither read nor written, so the toggle can show the wrong state, and switching it changes nothing.
  - **Derivation by extension.** The content types of the base and the derived type must both be mixed or both be element-only. Switching only the derived type can make the schema invalid; no validator checks `mixed`.

  The fix is to hide the toggle for simple content, to read and write the effective value (on `xs:complexContent` if the attribute is there), and to check the base type in the validator.
- **GitHub issue:** none

## Facets are not checked against the base type

- **Location:** `src/commandValidators/typeValidators.ts` (`validateSimpleTypeBody()`), `webview-src/propertiesPanel/propertiesPanelFacets.ts`
- **Severity:** Medium
- **Effort:** L
- **Description:** `addSimpleType` and `modifySimpleType` only check that a restriction has at least one facet. They do not check whether a facet applies to the base type, or whether facet values fit together. `maxLength` on `xs:integer`, `fractionDigits` on `xs:string`, `minLength` greater than `maxLength` or a `maxInclusive` that is not a valid value of the base type are accepted and written to the file, which makes the schema invalid. The properties panel does not limit the facets by base type either. The fix is a table of the facets that apply to each built-in primitive type (XSD Part 2), a lookup that follows user-defined base types down to their primitive type, and checks for the value constraints between facets (see [Commands](commands.md#restriction-facets)).
- **GitHub issue:** none

## Every command reformats the whole document

- **Location:** `src/webviewProvider.ts` (`executeCommand()`), `@neumaennl/xmlbind-ts` (`marshal`)
- **Severity:** Medium
- **Effort:** L
- **Description:** The provider replaces the whole document with the output of `marshal`, which does not keep the source formatting: indentation becomes two spaces, attributes are reordered, quotes and empty elements are normalized, and element prefixes change (see [Persistence](persistence.md#what-serialization-changes)). Even a small command therefore changes most lines of a hand-formatted file, which makes Git diffs and undo steps large. Comments, element order and the XML declaration are kept. The fix belongs in `xmlbind-ts`, for example by keeping attribute order, quote style and indentation as metadata like the element order.
- **GitHub issue:** [xmlbind-ts#252](https://github.com/neumaennl/xmlbind-ts/issues/252)

## Inline types have no node of their own

- **Location:** `webview-src/diagram/SchemaProcessors.ts`, `webview-src/drop/` (drop rules), `webview-src/propertiesPanel/` (element editors), `shared/idStrategy.ts`, `src/commandExecutors/`
- **Severity:** Medium
- **Effort:** L
- **Description:** An anonymous (inline) complex or simple type is not drawn as a node; its content is merged into the element (see [Diagram rendering](diagram-rendering.md#from-schema-to-diagram-items)). In the schema model and the node IDs, however, the anonymous type has its own segment (`/element:person/anonymousComplexType[0]`, see [Schema model](schema-model.md#conventions)). So one diagram node stands for two constructs, and every part of the editor has to decide which of the two is meant:
  - The drop rules have extra cases for "element with anonymous complex type" and "element with simple content", which turn a drop on the element into a command on its type (see [Drag and drop](drag-and-drop.md)). Attributes dropped on a derived anonymous complex type end up in the wrong place (see [Attributes on derived complex types are rejected or misplaced](#attributes-on-derived-complex-types-are-rejected-or-misplaced)).
  - The properties panel of an element mixes element and type fields: Base Type, Replacement Type, `mixed` and the Facets tab belong to the type (see [UX concept](ux-concept.md)).
  - Anonymous types cannot be selected or deleted on their own, and the element's documentation falls back to the type's documentation, which cannot be told apart.

  How Altova XMLSpy shows anonymous types is unclear: its manual says that "there is no separate symbol for local complex types", which can mean that they are merged into the element or that they use the same symbol as named complex types; this was not tried in XMLSpy. The editor does not have to follow XMLSpy here. An alternative is to draw the anonymous type as a child node of the element, so that every node is exactly one construct. This could be a diagram option. It should be decided before the [node IDs are redesigned](#node-ids-are-ambiguous-and-have-many-special-cases). It should also be planned together with [Diagram items copy values from the schema objects](#diagram-items-copy-values-from-the-schema-objects).
- **GitHub issue:** [#358](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/358)

## Palette has no entry for attribute groups

- **Location:** `webview-src/palette/`, `webview-src/drop/`, `webview-src/diagram/DiagramBuilderHelpers.ts` (`extractAttributes()`)
- **Severity:** Medium
- **Effort:** L
- **Description:** The palette has items for elements, attributes and groups, but none for attribute groups, so they cannot be created or referenced in the editor. The commands exist (`addAttributeGroup`, `removeAttributeGroup`, `modifyAttributeGroup`, see [Commands](commands.md#attribute-groups)), but the webview never sends them. The diagram does not show attribute groups either: it only reads `attribute`, so top-level attribute group definitions and `<xs:attributeGroup ref="…"/>` inside complex types are left out, and the only use in the webview is the duplicate-name check in `DropCommandFactory`. The fix is a palette item with drop targets for the schema (definition) and complex types (reference), showing definitions and references in the diagram, and the header delete button for them.
- **GitHub issue:** none

## `SchemaEditorProvider` parses XML without `SchemaModelManager`

- **Location:** `src/webviewProvider.ts`
- **Severity:** Low
- **Effort:** S
- **Description:** The provider calls `unmarshal()` directly to send the schema to the webview, while the command pipeline uses `SchemaModelManager.loadFromXml()`. The two paths have different error handling, and parsing is not in one place.
- **GitHub issue:** none

## Nonce uses `Math.random`

- **Location:** `src/webviewProvider.ts` (`getNonce()`)
- **Severity:** Low
- **Effort:** S
- **Description:** The doc comment says the function produces a cryptographically secure nonce for the webview's Content Security Policy, but it uses `Math.random`. The risk is low: the webview is local to VS Code, a new nonce is generated for every page, and the official VS Code webview samples use the same approach. The misleading comment is the main problem. The fix is either to correct the comment or to use `crypto.randomBytes` or `crypto.randomUUID`.
- **GitHub issue:** none

## Message `schemaModified` is unused

- **Location:** `shared/messages.ts`, `webview-src/main.ts`
- **Severity:** Low
- **Effort:** S
- **Description:** The extension-to-webview message `schemaModified` is defined in the message types, but the extension never sends it and the webview does not handle it.
- **GitHub issue:** none

## `modifySimpleType` skips part of its validation

- **Location:** `src/commandValidators/typeValidators.ts` (`validateModifySimpleType()`)
- **Severity:** Low
- **Effort:** S
- **Description:** The validator returns the result of `validateSimpleTypeBody()` with `if (bodyValidation) return bodyValidation;`. The result is always an object, so the function always returns there, and the checks after it never run: a `typeName` for an anonymous simple type is accepted and ignored by the executor instead of being rejected, and the message "Cannot apply restrictions without a base type" is unreachable. Because `validateSimpleTypeBody()` requires `baseType` for every restriction body, `restrictions` without `baseType` fail with "Base type cannot be empty", even if the type already is a restriction (see [Commands](commands.md#simple-types)). The properties panel always sends both. `validateAddSimpleType()` uses the same pattern, but there the body check is the last one. The fix is to return only invalid results and to decide whether `restrictions` may keep the current base type.
- **GitHub issue:** none

## Leftovers of the removed top-level drop target

- **Location:** `webview-src/drop/DropCommandFactory.ts` (`createTopLevelDropCommand`), `webview-src/palette/PaletteView.ts`, `webview-src/main.test.ts`
- **Severity:** Low
- **Effort:** S
- **Description:** A separate drop target for top-level constructs was implemented and later removed, because it added nothing over dropping on the schema root node. The public method `createTopLevelDropCommand` is still there but only called from tests, the palette hint still reads "Drag onto nodes or the top-level drop target", and the DOM fixture in `main.test.ts` still contains `#top-level-drop-target`. Top-level constructs are added by dropping on the schema root node (see [Drag and drop](drag-and-drop.md#drop-rules)). A refined version of the idea may come back with the work on large schemas ([#19](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/19), [#20](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/20)).
- **GitHub issue:** none

## Palette drag and drop uses two ways to pass the dragged construct

- **Location:** `webview-src/palette/PaletteItems.ts` (`PALETTE_MIME_TYPE`, `setActiveDraggedPaletteSchemaConstruct`), `webview-src/palette/PaletteView.ts`, `webview-src/renderer.ts` (`getDraggedPaletteSchemaConstruct`)
- **Severity:** Low
- **Effort:** S
- **Description:** The palette puts the dragged construct both into `dataTransfer` under a custom MIME type and into a module variable. The renderer reads the MIME data first and falls back to the module variable, justified with "some environments" that do not expose custom MIME data. The extension only runs in one environment, the VS Code webview (Chromium), so one approach should be chosen. In Chromium, `getData()` always returns an empty string during `dragover` (the data can only be read on `drop`), so today the highlighting of valid drop targets always uses the module variable and the drop itself uses the MIME data. Since the drag source and the drop target are in the same webview, the module variable alone would be enough. Alternatively, the construct could be encoded in the MIME type name, which is readable through `dataTransfer.types` during `dragover`.
- **GitHub issue:** none

## Every document change is parsed in full and logged

- **Location:** `src/webviewProvider.ts` (`updateWebview()`)
- **Severity:** Low
- **Effort:** S
- **Description:** The provider parses the whole document and sends the complete schema to the webview on every `onDidChangeTextDocument`, without a debounce, so typing in the text editor triggers a parse and a full re-render per keystroke. Each parse also logs the content length, the first 200 characters and the whole parsed object with `console.log`. For large schemas this costs time and fills the extension host log. The fix is to debounce the refresh for changes that do not come from the provider's own edits and to remove the debug logging (see [Persistence](persistence.md#changes-from-outside)).
- **GitHub issue:** none

## Empty Facets tab says adding facets is not available yet

- **Location:** `webview-src/propertiesPanel/propertiesPanelFacets.ts` (`renderFacetsTab()`)
- **Severity:** Low
- **Effort:** S
- **Description:** A restriction without facets shows "This type has no facets yet. To add a facet, drag one from the palette onto the node (available in a future release)." Dropping facets from the palette already works (see [UX concept](ux-concept.md#adding-editing-and-deleting)), so the part in parentheses should be removed.
- **GitHub issue:** none

## Language of documentation entries cannot be edited

- **Location:** `webview-src/propertiesPanel/propertiesPanelDocs.ts`
- **Severity:** Low
- **Effort:** S
- **Description:** The Docs tab shows only the text of a documentation entry, not its `xml:lang` attribute, and it has no field to set or change it. Existing values are preserved because `modifyDocumentation` is sent without `lang`, but new entries always lack a language. Both commands already accept `lang`, and in `modifyDocumentation` an empty value removes the attribute (see [Commands](commands.md#annotations-and-documentation)); only the webview is missing. The fix is a language field next to each entry that sends `lang` with `addDocumentation` and `modifyDocumentation`.
- **GitHub issue:** none

## Items with maxOccurs 0 are drawn as repeated

- **Location:** `webview-src/diagram/ShapeRenderers.ts`
- **Severity:** Low
- **Effort:** S
- **Description:** The shape renderers draw the second outline that marks repetition whenever `maxOccurrence !== 1`. An element, group or type with `maxOccurs="0"` (which removes it from the content model) is therefore drawn as if it could repeat. The check should be `maxOccurrence > 1 || maxOccurrence === -1` (see [Diagram rendering](diagram-rendering.md#shapes-and-notation)). See also [Diagram items copy values from the schema objects](#diagram-items-copy-values-from-the-schema-objects).
- **GitHub issue:** none

## Diagram stays empty after `showMessage`

- **Location:** `webview-src/renderer.ts` (`showMessage()`)
- **Severity:** Low
- **Effort:** S
- **Description:** `showMessage()` empties the canvas and creates a new canvas group for its text, but `DiagramSvgRenderer` keeps drawing into the old group, which is no longer in the canvas. After a message, no diagram is shown until the webview is recreated. Today this cannot happen: the message is only shown when `updateSchema` carries no schema, and the extension always sends the parse result. The fix is to keep the canvas group and only replace the content, for example with a method on `DiagramSvgRenderer` (see [Diagram rendering](diagram-rendering.md#interaction)).
- **GitHub issue:** none

## Documentation box size does not match the drawn text

- **Location:** `webview-src/diagram/DiagramLayout.ts` (`calculateDocumentationBox()`), `webview-src/diagram/TextRenderers.ts` (`renderDocumentation()`)
- **Severity:** Low
- **Effort:** S
- **Description:** The layout estimates the height of the documentation as if the text were wrapped at 30 characters per line with 12 px per line (at most 100 px). The renderer does not wrap: it draws the first three lines of the documentation, cuts each after 50 characters and uses the font size number 9 as line height, although the font size is 9 pt (12 px). For 150 characters on one line, the box is 70 px high, but a single line of 50 characters is drawn, and the rest is not visible anywhere in the diagram. The fix is to wrap the text in the renderer and compute the height from the same wrapped lines (see [Diagram rendering](diagram-rendering.md#shapes-and-notation)). See also [Documentation in the diagram is cut off and hard to read](#documentation-in-the-diagram-is-cut-off-and-hard-to-read).
- **GitHub issue:** none

## Selection highlight is lost after expanding or collapsing

- **Location:** `webview-src/main.ts` (`onNodeClick()`, `updateDiagramOptions` handler), `webview-src/renderer.ts` (`refresh()`)
- **Severity:** Low
- **Effort:** S
- **Description:** Every render recreates the SVG of all items, which removes the `.selected` class. After `updateSchema`, the app selects the node again, but not after an expand or collapse and not after a changed diagram option. The highlight disappears while the properties panel still shows the node. The fix is to apply the selection again in the renderer after each render, or to call `refreshSelection()` in these places as well (see [Diagram rendering](diagram-rendering.md#interaction)).
- **GitHub issue:** none

## Diagram does not follow theme changes

- **Location:** `webview-src/diagram/DiagramTypes.ts` (`defaultDiagramStyle`)
- **Severity:** Low
- **Effort:** S
- **Description:** The diagram colors and font are read from VS Code's CSS variables once, when the module is loaded, and written into the SVG as inline styles. When the user switches the color theme, the rest of the webview follows, but the diagram keeps the old colors until the webview is recreated; with a switch between light and dark themes, the diagram can become hard to read. This follows from the code and was not tried in VS Code. The fix is to use the CSS variables directly in the SVG styles (`var(--vscode-editor-foreground)`), or to read them again on each render.
- **GitHub issue:** none

## Command and message type tests only check object literals

- **Location:** `shared/__tests__/commands/` (six files), `shared/__tests__/messages.test.ts`
- **Severity:** Low
- **Effort:** S
- **Description:** These tests build typed object literals for commands and messages and check that the fields have the values just assigned. The compiler already checks that the literals match the types, and the files contain no runtime code to test, so the tests cannot fail for a reason the build would not catch. They are also unit tests in a `__tests__` folder, which the conventions reserve for integration tests (see [Testing](testing.md#files-and-structure)). The fix is to delete them, or to replace them with type tests that the compiler checks (for example with `@ts-expect-error` for payloads that must be rejected). This is planned for Phase 9 of the [Tech Stack Modernization](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340), on the editor branch, which has more of these tests.
- **GitHub issue:** none

## Test helpers are copied between test files

- **Location:** `src/commandExecutors/schemaExecutors.test.ts`, `schemaPrefixChecker.test.ts`, `schemaQNameRewriter.test.ts`, `simpleTypeExecutors.test.ts`, `complexTypeExecutors.test.ts`, `schemaLocalRenamer.test.ts`, `src/commandValidators/annotationValidators.test.ts`, `src/commandExecutors/annotationExecutors.test.ts`, `src/webviewProvider.test.ts`, `src/__tests__/pipeline.workspaceEdit.test.ts`, `src/__tests__/testHelpers.ts`, `webview-src/__tests__/svgTestUtils.ts`
- **Severity:** Low
- **Effort:** S
- **Description:** Some helpers exist as copies in several test files, against the conventions in [Testing](testing.md#helper-functions): `emptySchema()` is identical in three executor tests, `schemaWith(body)` is in three (once with line breaks around the body), the XML constants `schemaWithAnnotationXml` and `schemaWithTwoAnnotationsXml` are in both the annotation validator and executor tests, and the stubs of the VS Code objects for `SchemaEditorProvider` are built separately in `webviewProvider.test.ts` and `pipeline.workspaceEdit.test.ts`. The two helper modules are named `testHelpers.ts` and `svgTestUtils.ts` instead of `<topic>TestHelpers.ts`. The fix is to move the copies into helper modules and rename the two modules. This is planned for Phase 9 of the [Tech Stack Modernization](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340), on the editor branch, which has more of these tests. Moving the inline XML is a separate, larger task (see [Test XML is inline instead of in `test-resources`](#test-xml-is-inline-instead-of-in-test-resources)).
- **GitHub issue:** none

## Mocha brings dependencies with known vulnerabilities

- **Location:** `package.json` (`@vscode/test-cli`)
- **Severity:** Low
- **Effort:** S
- **Description:** `@vscode/test-cli` 0.0.15 depends on Mocha 11, which brings `serialize-javascript` 6 ([GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq), high: code execution through crafted input; [GHSA-qj8w-gfj5-8c6v](https://github.com/advisories/GHSA-qj8w-gfj5-8c6v), moderate: denial of service) and `diff` 7 ([GHSA-73rr-hh4g-fpgx](https://github.com/advisories/GHSA-73rr-hh4g-fpgx), low: denial of service). `npm audit` reports them. They are development dependencies that only run the [tests in the extension host](testing.md#tests-in-the-extension-host) on this repository's own test files, and they are not part of the VSIX. `@vscode/test-cli` declares overrides for both packages itself, but npm ignores the overrides of dependencies, and its switch to Mocha 12 is merged ([microsoft/vscode-test-cli#118](https://github.com/microsoft/vscode-test-cli/pull/118)) but not released yet. The decision is to wait for that release instead of overriding the versions here. When it is out, update `@vscode/test-cli`, check `npm audit` and remove this entry.
- **GitHub issue:** none

## Tests are exempt from the size limits

- **Location:** test files in `src/`, `webview-src/` and `shared/`
- **Severity:** Low
- **Effort:** S
- **Description:** The limits of 500 lines per file and 120 lines per function in the [development guidelines](development-guidelines.md#code-size) do not apply to tests for now. Many test files are longer than 500 lines, and the `describe` callbacks that contain the tests are usually longer than 120 lines. Applying the function limit to these callbacks makes little sense, but without any limit test files can grow without bound. The rule needs to be refined, for example with a higher file limit for tests, a limit for single tests instead of `describe` callbacks, or splitting test files by topic.
- **GitHub issue:** none

## Most test files use `it()` instead of `test()`

- **Location:** 50 of the 66 Vitest test files, in `src/`, `shared/`, `webview-src/` and `scripts/`
- **Severity:** Low
- **Effort:** S
- **Description:** The [test conventions](testing.md#files-and-structure) ask for `test("should …")`, but most Vitest test files use `it("should …")`. Vitest treats both the same, and no file mixes them, but the two styles make the tests look inconsistent, and new tests in these files follow the deviating style. The fix is to rename `it(` and `it.each(` to `test(` and `test.each(` in these files, and then to enable the ESLint rule `vitest/consistent-test-it` with `{ fn: "test", withinDescribe: "test" }` in `eslint.config.mjs`, so that ESLint enforces the style. This is planned for Phase 9 of the [Tech Stack Modernization](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340), on the editor branch, which has more of these tests.
- **GitHub issue:** none

## Documentation in the diagram is cut off and hard to read

- **Location:** `webview-src/diagram/TextRenderers.ts` (`renderDocumentation()`), `webview-src/diagram/DiagramBuilderHelpers.ts` (`extractDocumentation()`), `webview-src/diagram/DiagramLayout.ts`
- **Severity:** Low
- **Effort:** M
- **Description:** With `showDocumentation` (off by default), the documentation is drawn in a way that is likely to confuse (see [Diagram rendering](diagram-rendering.md#shapes-and-notation)). All `xs:documentation` entries of an item, in all languages, are joined with line breaks into one text. The renderer draws only its first three lines and cuts each after 50 characters, without wrapping and without an ellipsis, so the reader cannot tell that text is missing. Line breaks inside a documentation entry (the parser keeps them, only the outer whitespace is trimmed) count as lines, so a second language may appear as the third line without any marker, or may not appear at all. The full text cannot be seen anywhere in the diagram. Related layout problems are listed in [Documentation overlaps the next item](#documentation-overlaps-the-next-item) and [Documentation box size does not match the drawn text](#documentation-box-size-does-not-match-the-drawn-text). A better presentation needs a short design: for example, wrap the text to the box width, normalize whitespace, mark cut text with an ellipsis, show only one language, and show the full text in a tooltip or in the properties panel.
- **GitHub issue:** none

## Properties panel builds commands in its event handlers

- **Location:** `webview-src/propertiesPanel/propertiesPanel.ts` (`renderCardinalitySection()`, `renderConstraintsSection()`), `propertiesPanelDocs.ts`, `propertiesPanelElementDefaults.ts`, `propertiesPanelFacets.ts`, `propertiesPanelSchemaNamespaces.ts`, `propertiesPanelSimpleTypeEditors.ts`, `propertiesPanelTypes.ts`
- **Severity:** Low
- **Effort:** M
- **Description:** The properties panel builds its commands in two ways. `propertiesPanelCommands.ts` and `propertiesPanelSimpleTypeCommands.ts` have functions that take a node and return a command, such as `createRenameNodeComand()` and `createTypeCommand()`. Twenty other commands are written out inside the event handlers that render the fields and update the draft copy: seven in `propertiesPanel.ts` (cardinality, nillable, abstract, mixed), seven in `propertiesPanelDocs.ts` and one or two in each of the other files listed. These can only be tested through the DOM, and changes to a command or to the values it reads (for example [#360](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/360), see [Diagram items copy values from the schema objects](#diagram-items-copy-values-from-the-schema-objects)) have to be found in all of these places. `propertiesPanel.ts` has 484 lines, close to the limit of 500 in the [development guidelines](development-guidelines.md#code-size). The fix is to move the construction of these commands into functions in the command modules and to leave only the draft update and the dispatch in the handlers.
- **GitHub issue:** none

## Code exceeds the size limits

- **Location:** `src/commandValidators/groupValidators.ts`, `src/commandExecutors/elementExecutors.ts`, `src/commandExecutors/schemaPrefixChecker.ts`, `webview-src/renderer.ts`, `webview-src/diagram/SchemaProcessors.ts`, `webview-src/propertiesPanel/propertiesPanelDocs.ts`, `propertiesPanelFacets.ts`, `propertiesPanelSimpleTypeEditors.ts`, `propertiesPanelTypes.ts`
- **Severity:** Low
- **Effort:** M
- **Description:** Some code is longer than the [development guidelines](development-guidelines.md#code-size) allow. Counted with comments and blank lines, `elementExecutors.ts` and `renderer.ts` have slightly more than 500 lines, and eight functions have more than 120 lines: `renderFacetsTab()` and `renderEnumerationEditor()` in `propertiesPanelFacets.ts` (196 and 166 lines), `isQNameMatchedInSchema()`, `renderSimpleTypeUnionEditor()`, `validateModifyGroup()`, `processGroup()`, `createAnnotationSection()` and `renderTypeProperty()` (126 to 140 lines). The limits are not checked automatically, so these were not noticed. The fix is to split the code, and to enable the ESLint rules `max-lines` and `max-lines-per-function` for everything but the tests (see [Tests are exempt from the size limits](#tests-are-exempt-from-the-size-limits)).
- **GitHub issue:** none

## Top-level lookups are duplicated instead of shared

- **Location:** `src/schemaModelManager.ts`, `src/commandValidators/`, `src/commandExecutors/`, `src/schemaNavigator.ts`, `webview-src/diagram/DiagramBuilder.ts`, `webview-src/drop/DropCommandFactory.ts`
- **Severity:** Low
- **Effort:** L
- **Description:** `SchemaModelManager` has query methods (`findElement()`, `findComplexType()`, `findGroup()`, the `getAll*()` methods, `getTargetNamespace()`, `getImports()`, `getIncludes()`, `isLoaded()`, `clear()`), but they are only called from tests. They work on the schema stored in the manager, while validators and executors get a cloned schema object, and the webview cannot use code from `src/`. So the same lookups are written out again and again:
  - About 40 places look up a top-level component by name with `toArray(schemaObj.<kind>).some(…)` or `.find(…)`.
  - `schemaQNameRewriter.ts`, `schemaLocalRenamer.ts`, `schemaPrefixChecker.ts` and the group and attribute group validators each iterate over all top-level kinds one by one.
  - `validationUtils.ts` repeats `Array.isArray(x) ? x : [x]` instead of using `toArray()`; both are obsolete since `xmlbind-ts` 2.3 (see [`toArray()` is obsolete since `xmlbind-ts` 2.3](#toarray-is-obsolete-since-xmlbind-ts-23)).
  - `DiagramBuilder` and `DropCommandFactory` collect the same lists in the webview.

  The fix is to replace the manager's query methods with pure functions in `shared/` that take the schema object as a parameter (for example `findTopLevel(schemaObj, kind, name)`, `getTopLevel(schemaObj, kind)` and `forEachTopLevelComponent(schemaObj, callback)`), use them everywhere, and remove the unused methods.
- **GitHub issue:** none

## Duplicated and dead code

- **Location:** whole repository
- **Severity:** Low
- **Effort:** L
- **Description:** The [development guidelines](development-guidelines.md#code-quality) ask to avoid code duplication, but the code base likely contains a fair amount of duplicated and dead code that was not caught in reviews. The [leftovers of the removed top-level drop target](#leftovers-of-the-removed-top-level-drop-target) and the [duplicated top-level lookups](#top-level-lookups-are-duplicated-instead-of-shared) are examples. A systematic cleanup by an agent is planned. Examples found in the diagram code (see [Diagram rendering](diagram-rendering.md)):
  - `SchemaProcessorsGroups.ts` is not imported anywhere; `SchemaProcessors.ts` contains its functions.
  - `DiagramLayout` has its own `isCompositorGroup()`, which returns `true` when the ID cannot be parsed, while the one in `groupUtils.ts` returns `false`.
  - `DiagramLayout.relayoutItem()` and `DiagramItem.getTextDocumentation()` are only called from tests, `DiagramBuilder.elementMap` is only cleared, and `DiagramItem.inheritFrom` is never set.
  - `DiagramItemType.reference` is never assigned; only the layout and a test handle it, and the renderer draws no shape for it.
  - `Diagram.size` is not used, and `Diagram.scale` is always 1, so the `scale*()` helpers of `Diagram` and `DiagramItem` change nothing.

  Example found in the tests: `src/__test-utils__/assertions.ts` (`expectStringsOnSameLine()`, `expectStringsOnConsecutiveLines()`) is not used by any test. `tsconfig.extension.json` does not exclude it, so it is compiled into `out/` and packaged.
- **GitHub issue:** none

## Diagram items copy values from the schema objects

- **Location:** `webview-src/diagram/DiagramItem.ts`, `webview-src/diagram/SchemaProcessors*.ts`, `webview-src/diagram/TypeNodeCreators.ts`, `webview-src/propertiesPanel/propertiesPanelDraft.ts`, `webview-src/propertiesPanel/`, `webview-src/drop/`
- **Severity:** Low
- **Effort:** L
- **Description:** `DiagramItem` does not reference the schema object it represents; the builder copies about 22 values into it instead (see [Diagram rendering](diagram-rendering.md#data-model)). The renderer needs only a few of them; most are read by the properties panel and the drop code. Every new value has to be added to the item, to the builder and to `createDraftNode()`, which copies all fields again by hand for the properties panel draft. The extraction is partly duplicated: `processGroup` builds group elements inline instead of using `createElementNode`. Values that are not copied, or copied in a reduced form, cause bugs: [Editing facets drops all but the first pattern](#editing-facets-drops-all-but-the-first-pattern), [Restricted complex content is shown without content and attributes](#restricted-complex-content-is-shown-without-content-and-attributes), [Element references are not shown as references](#element-references-are-not-shown-as-references) and [Items with maxOccurs 0 are drawn as repeated](#items-with-maxoccurs-0-are-drawn-as-repeated) come at least partly from this layer. The plan is to keep only view state on the item, add a typed reference to the schema object, and read values through one module of accessor functions. The properties panel draft must then be a deep copy of the schema object: after a failed command the webview receives no new schema, so changes to the shared object would remain. The many `toArray()` calls come from xmlbind-ts, which returns a single object for a repeated element that occurs once ([neumaennl/xmlbind-ts#261](https://github.com/neumaennl/xmlbind-ts/issues/261)). This should be planned together with [inline types](#inline-types-have-no-node-of-their-own) and the [node ID redesign](#node-ids-are-ambiguous-and-have-many-special-cases), which also change the builder.
- **GitHub issue:** [#360](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/360)

## Identity constraints, notations and redefines cannot be shown or edited

- **Location:** `shared/commands/`, `src/commandValidators/`, `src/commandExecutors/`, `webview-src/diagram/DiagramBuilder.ts`, `webview-src/propertiesPanel/`
- **Severity:** Low
- **Effort:** L
- **Description:** Identity constraints (`xs:key`, `xs:keyref`, `xs:unique` with their `selector` and `field`s), `xs:notation` and `xs:redefine` are in the schema classes, but there are no commands for them, the diagram does not show them, and the properties panel has no fields for them (see [Diagram rendering](diagram-rendering.md#from-schema-to-diagram-items)). They can only be edited in the text editor; other edits keep them unchanged. Renaming or removing an element does not update the selectors, fields or `refer` values that point to it. All three are rare: in a GitHub code search (October 2026, `xs:` prefix only, approximate counts), `xs:unique` appeared in about 6% as many XSD files as `xs:complexType`, `xs:redefine`, `xs:key` and `xs:keyref` in 1 to 2%, and `xs:notation` in 0.2%. `redefine` is also deprecated in XSD 1.1. Because they are kept unchanged and are rarely used, full editing support is not planned for now; showing them read-only would be a smaller first step.
- **GitHub issue:** none

## Diagram is rebuilt in full on every change

- **Location:** `webview-src/renderer.ts` (`renderSchema()`, `refresh()`), `webview-src/main.ts` (`updateSchema`, `updateDiagramOptions`), `webview-src/diagram/DiagramLayout.ts` (`relayoutItem()`)
- **Severity:** Low
- **Effort:** L
- **Description:** Every change redraws the whole diagram. Each `updateSchema` builds all diagram items from the schema object again, calculates the layout of every item and replaces all SVG content, even if the edit changed a single attribute. Changing a diagram option does the same, although the options are only applied after the build and would need only a new layout. Expanding or collapsing a node calls `refresh()`, which keeps the items but calculates the layout of all items and redraws the whole SVG. `DiagramLayout.relayoutItem()` was written to recalculate the layout of one item and its ancestors, but it is never called (see [Duplicated and dead code](#duplicated-and-dead-code)). For large schemas this probably makes editing slow; this was not measured. Smaller improvements are to use `refresh()` for option changes and `relayoutItem()` for expanding and collapsing; real incremental updates would need the [ambiguous node IDs](#node-ids-are-ambiguous-and-have-many-special-cases) fixed first, so that items can be matched across builds (see [Diagram rendering](diagram-rendering.md#pipeline)).
- **GitHub issue:** none

## Test XML is inline instead of in `test-resources`

- **Location:** test files in `src/`, `webview-src/` and `shared/`
- **Severity:** Low
- **Effort:** L
- **Description:** The [test conventions](testing.md#files-and-structure) require larger XML snippets that several tests use to be stored in `src/__tests__/test-resources`. The folder does not exist; the snippets are inline in the test files, often repeated. They should be moved there and shared.
- **GitHub issue:** none

## `toArray()` is obsolete since `xmlbind-ts` 2.3

- **Location:** `shared/schemaUtils.ts` (`toArray()`) and its callers in `shared/`, `src/` and `webview-src/`
- **Severity:** Low
- **Effort:** L
- **Description:** Before version 2.3, `unmarshal` returned a single object instead of a one-item array when a repeated element occurred only once, although the generated classes declare arrays (`element?: topLevelElement[]`). The code therefore reads every repeated child through `toArray()`, about 250 times in production code. Since `xmlbind-ts` 2.3, these fields are always arrays: one item for a single occurrence, and an empty array when the element is absent ([xmlbind-ts#261](https://github.com/neumaennl/xmlbind-ts/issues/261)). `toArray()` and the `Array.isArray(x) ? x : [x]` checks in `validationUtils.ts` no longer change anything for unmarshalled data. The cleanup removes them; code that builds schema objects itself, such as the executors, then has to assign arrays as well, and the generated properties are still declared optional. It is done on the editor branch, which has more of these calls, after `main` is merged into it (Phase 9 of the [Tech Stack Modernization](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340)).
- **GitHub issue:** none

## Executors do nothing or fail with a TypeError instead of a meaningful error

- **Location:** `src/commandExecutors/`
- **Severity:** Low
- **Effort:** L
- **Description:** The executors rely on the validators: `CommandProcessor` only runs an executor after the validator has accepted the command, and the executors do not repeat the validators' checks, which is intended. But when an executor cannot do what it is supposed to do, for example because the node to change does not exist, it should throw an error that says so. Instead, a missing target mostly changes nothing, so the command reports success without an effect; only some commands that address an entry by an index that is too large cause a `TypeError` such as "Cannot read properties of undefined": removing or modifying an import, modifying an include, and some annotation and documentation commands. A missing parent changes nothing for elements, attributes and group references, but causes a `TypeError` for anonymous types, attribute group references, annotations and documentation. Their TSDoc nevertheless says "@throws Error if … not found". This only shows when a validator and its executor disagree, which is then hard to notice. The fix is a meaningful error in every executor where it cannot find its target or its parent, without repeating the other checks of the validators. It is done on the editor branch, which rewrites many executors.
- **GitHub issue:** none

## Branch coverage is below 80%

- **Location:** `vitest.config.ts` (`coverage.thresholds`), code of the editor in `src/` and `webview-src/`
- **Severity:** Low
- **Effort:** L
- **Description:** Much of the code of the editor has no tests for some of its branches. Branch coverage is 73.4%, below the 80% that applies to lines, statements and functions, so the threshold for branches is 70% for now (see [Testing](testing.md#coverage)). About 270 more covered branches are needed for 80%. The largest gaps are in `schemaLocalRenamer.ts` (38%), `schemaPrefixChecker.ts` (53%), `propertiesPanelXmlPreview.ts` (56%), `renderer.ts` (43%), `webview-src/main.ts` (37%) and `SchemaProcessorsGroups.ts`, which no test covers. The fix is the tests that are missing, after which all four thresholds are raised to 85% (Phase 9 of the [Tech Stack Modernization](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340)).
- **GitHub issue:** none

## The extension host is not bundled

- **Location:** `tsconfig.extension.json` (build of `out/`), `package.json` (runtime dependencies)
- **Severity:** Low
- **Effort:** L
- **Description:** `tsc` compiles the extension host file by file into `out/`, and `vsce` packages the runtime dependencies from `node_modules/` as they are. The VSIX therefore contains about 270 JavaScript files: about 135 from `out/`, 99 of them the generated schema classes, and about 140 from `node_modules/`, mainly `@neumaennl/xmlbind-ts` and `fast-xml-parser`, including `commander`, which `xmlbind-ts` only needs for its `xsd2ts` command line. `vsce package` warns about this in every CI run ("This extension consists of … files, out of which … are JavaScript files. For performance reasons, you should bundle your extension"). Loading many files makes the activation slower, which happens when the first schema is opened in the visual editor. The webview is already one bundle (see [Build and packaging](build-and-packaging.md#the-webview-build)). Bundling the extension host, for example with Vite, which the project already uses, would put it into one file; it also affects the source maps, `package:verify`, the staging of the tests in the extension host, the watch task and the launch configurations, and has to keep the legacy decorators and `reflect-metadata` working.
- **GitHub issue:** none

# Documentation

## There is no changelog

- **Location:** repository root
- **Severity:** Low
- **Effort:** S
- **Description:** The [development guidelines](development-guidelines.md#documentation) ask for a changelog of notable changes, but there is no `CHANGELOG.md`. The VS Code Marketplace shows this file on the page of the extension. The fix is to add it, starting with the current state of the extension.
- **GitHub issue:** none

# GitHub issues

## Phase 3 toolbar issue contradicts the UX concept

- **GitHub issues:** [#18](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/18), [#155](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/155)
- **Severity:** Medium
- **Effort:** S
- **Description:** #155 asks for toolbar buttons to add and remove nodes. The UX concept keeps the toolbar for diagram-wide actions and adds nodes through the palette. #18 tracks #155 and should be updated with it.

## Attribute editing is half implemented

- **GitHub issue:** [#282](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/282)
- **Severity:** Medium
- **Effort:** S
- **Description:** The issue has no body. The commands `modifyAttribute` and `removeAttribute` exist with executors in `src/commandExecutors/attributeExecutors.ts`, but the webview never sends them: attributes can only be added from the palette, and the properties panel lists them read-only.

## Phase 5 issue does not reflect palette drag and drop

- **GitHub issue:** [#20](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/20)
- **Severity:** Low
- **Effort:** S
- **Description:** Drag and drop from the palette exists; moving or reordering existing nodes by drag and drop, copy and paste, keyboard shortcuts and double-click renaming do not. The issue does not distinguish between the two kinds of drag and drop.

## Focus issue mentions toolbar add actions

- **GitHub issue:** [#280](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/280)
- **Severity:** Low
- **Effort:** S
- **Description:** It asks for consistent behavior between toolbar, palette and other add flows, but the toolbar has no add actions; nodes are added from the palette.

## Issues without description or labels

- **GitHub issues:** see description
- **Severity:** Low
- **Effort:** M
- **Description:** [#279](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/279), [#282](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/282), [#283](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/283) and [#307](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/307) have no description, so their scope is only given by the title; [#284](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/284) only has a link. These and [#276](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/276), [#280](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/280), [#302](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/302), [#304](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/304) and [#308](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/308) have no labels.
