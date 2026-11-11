---
type: Known Issues
title: Known issues
description: Problems found in the extension that are not fixed yet, with links to GitHub issues where they exist.
tags: [known-issues, maintenance, technical-debt]
status: stable
generated: { by: human:neumaennl, at: 2026-11-11T12:54:49Z }
verified: { by: human:neumaennl, at: 2026-11-11T13:20:42Z }
---

# Purpose

This list collects problems that were found but not fixed, so they are not forgotten. It grows when new problems are found and shrinks when they are fixed. Not every entry needs a GitHub issue; when one is created, it is linked from the entry.

Rules:

- Each issue is a `##` heading with a short title, followed by its location, severity, effort, a description and the GitHub issue (a link, or "none").
- Within each section, entries are sorted by severity (high first), then by effort (small first).
- When an issue is fixed, its entry is removed and the removal is recorded in [log.md](log.md).
- If the cause is in `xmlbind-ts` (see [Architecture](architecture.md#responsibilities-of-xmlbind-ts-and-the-editor)), the problem is recorded in the [known issues of xmlbind-ts](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md). The entry here describes the effect on schemas and the editor, and links to the entry there.
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

## Attributes on derived complex types are rejected or misplaced

- **Location:** `webview-src/drop/DropCommandFactory.ts` (`createAttributeNodeDropCommand()`), `src/commandExecutors/attributeExecutors.ts` (`addAttributeToParent()`)
- **Severity:** High
- **Effort:** M
- **Description:** In a complex type with `xs:complexContent` or `xs:simpleContent`, attributes belong inside the `xs:extension` or `xs:restriction`. The drop and the command get this wrong in two ways:
  - The attribute drop accepts a named complex type only if its label is exactly `complexType`. A derived named type is labelled `complexType (extends Base)` or `complexType (restricts Base)`, so the drop is rejected.
  - On an element with an anonymous complex type, the drop is accepted whatever the content model is. `addAttribute` always appends the attribute to the complex type itself, so for a derived anonymous type it writes `<attribute>` after `<complexContent>`, which is invalid XSD, and reports success.

  The fix is to use `isComplexTypeNode()` in the attribute drop rule, as the other rules do, and to add the attribute to the extension or restriction in the executor when the complex type has complex or simple content.
- **GitHub issue:** [#425](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/425)

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

## Commands can change or lose content outside the edit

- **Location:** `@neumaennl/xmlbind-ts` (`marshal()`, `unmarshal()`), `src/webviewProvider.ts` (`executeCommand()`)
- **Severity:** High
- **Effort:** L
- **Description:** Every command writes the whole document with `marshal` (see [Persistence](persistence.md#what-serialization-changes)). Besides the formatting (see [Every command reformats the whole document](#every-command-reformats-the-whole-document)), this changes or loses content that the command did not touch, even when it only renames something. Reproduced with `unmarshal` and `marshal` and the generated schema classes:
  - Children of one kind that occur in more than one run are written together: the `sequence` `element z, choice, any, element a, group` becomes `element z, element a, choice, any, group`, which changes its meaning. Comments move with them: in `element a, <!--c1-->, element b, simpleType s, <!--c2-->, element c`, `c1` moves behind `c`. ([xmlbind-ts: elements](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#elements-are-reordered-when-occurrences-are-not-contiguous), [comments](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#comments-between-repeated-elements-move))
  - Content that the classes generated from XSD 1.0 do not map is dropped without notice: XSD 1.1 constructs such as `xs:assert`, and foreign elements at the top level. Processing instructions, a document type declaration and comments after the root element are dropped as well. ([xmlbind-ts: unmapped content](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#unmapped-content-is-dropped-without-notice), [processing instructions](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#processing-instructions-the-document-type-and-comments-after-the-root-are-dropped))
  - Mixed content in `xs:documentation` is scrambled: `Some <b>mixed</b> &amp; text` becomes `<b>mixed</b>` followed by `Some&amp; text`. ([xmlbind-ts](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#mixed-content-is-reordered-and-loses-whitespace))
  - A namespace declaration below the root element is dropped: `<xs:element xmlns:t="urn:t" name="e" type="t:T"/>` loses `xmlns:t`, so `t:T` no longer resolves. ([xmlbind-ts](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#namespace-declarations-below-the-root-are-not-kept))
  - Element text that looks like a number is converted, so `<xs:documentation>1.0</xs:documentation>` becomes `1`, and a character reference such as `&#65;` becomes `&amp;#65;`. ([xmlbind-ts: numbers](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#element-text-that-looks-like-a-number-is-converted), [character references](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#character-references-are-not-decoded))
  - The XML declaration is always written as `<?xml version="1.0" encoding="UTF-8"?>`. ([xmlbind-ts](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#the-attributes-of-the-xml-declaration-are-not-kept))

  The editor does not warn about any of this. The causes are in `xmlbind-ts` and are fixed there (see [Architecture](architecture.md#responsibilities-of-xmlbind-ts-and-the-editor)). What the editor does with a schema that does not survive a round trip unchanged is its own decision: for example, it could compare the document with the result of a round trip when it is opened, and warn or switch to read-only if they differ.
- **GitHub issue:** none

## Turning the default namespace into a prefix does not rewrite references

- **Location:** `src/commandExecutors/schemaExecutors.ts` (`executeModifySchemaNamespaces()`), `src/commandExecutors/schemaQNameRewriter.ts`
- **Severity:** Medium
- **Effort:** S
- **Description:** `modifySchemaNamespaces` treats a prefix whose name changed but whose URI did not as a rename, and rewrites the QNames that use it (see [Commands](commands.md#imports-includes-and-namespaces)). If one side of the rename is the empty prefix of the default namespace, nothing is rewritten. When `xmlns="urn:x"` becomes `xmlns:tns="urn:x"`, unprefixed QNames such as `type="Address"` no longer resolve to `urn:x`; when `tns` becomes the default namespace, `tns:Address` loses its binding. The fix is to add the prefix to unprefixed QNames in the first case and to remove it in the second. The `xpath` of selectors and fields needs its own rule: XPath does not apply the default namespace to unprefixed names, so a name in an XPath keeps its prefix, and turning a prefix that an XPath uses into the default namespace should be rejected.
- **GitHub issue:** [#426](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/426)

## Removing an import without a namespace does not check for references

- **Location:** `src/commandValidators/schemaValidators.ts` (`validateRemoveImport()`, `isNamespaceReferenced()`)
- **Severity:** Medium
- **Effort:** S
- **Description:** `removeImport` rejects the removal of an import whose namespace is still referenced, by looking for QNames with a prefix of that namespace. An `<xs:import>` without a `namespace` imports a schema without a target namespace, whose components are referenced with unprefixed QNames when the schema has no default namespace. These references have no prefix to look for, so `isNamespaceReferenced()` returns `false` and the import can always be removed, leaving references that cannot be resolved. The fix is to treat the unprefixed QNames that do not name a component of the schema itself as references to the import, as long as the schema has no default namespace. The test that accepts removing such an import uses a schema without references.
- **GitHub issue:** [#427](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/427)

## Removing a namespace prefix does not check for references

- **Location:** `src/commandValidators/schemaValidators.ts` (`validateModifySchemaNamespaces()`)
- **Severity:** Medium
- **Effort:** S
- **Description:** `modifySchemaNamespaces` replaces the complete prefix map, so a prefix that is missing from the map is removed. The validator does not check whether QNames such as `type="tns:Address"` still use the removed prefix, and the schema is left with references that cannot be resolved. The properties panel sends this command when a namespace row is deleted. `removeImport` already rejects the removal of a namespace that is still referenced (`isPrefixReferencedInSchema()`); the same check is needed for prefixes that are removed and not renamed.
- **GitHub issue:** [#428](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/428)

## Documentation overlaps the next item

- **Location:** `webview-src/diagram/DiagramItem.ts` (`calculateBoundingBox()`), `webview-src/diagram/DiagramLayout.ts`
- **Severity:** Medium
- **Effort:** S
- **Description:** With `showDocumentation`, the documentation of an item is drawn in a box 5 px below its shape, up to 100 px high. The item's bounding box does not include this box, and the next sibling is placed 20 px below the bounding box. The documentation is therefore drawn over the next item: for a top-level element with 150 characters of documentation, the box ends at y = 115, while the next element starts at y = 60. The fix is to include the documentation box in the bounding box (see [Diagram rendering](diagram-rendering.md#layout)). See also [Documentation in the diagram is cut off and hard to read](#documentation-in-the-diagram-is-cut-off-and-hard-to-read).
- **GitHub issue:** [#429](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/429)

## Generated names ignore local names in the drop target

- **Location:** `webview-src/drop/DropCommandFactory.ts` (`updateNamesFromSchema()`, `nextName()`)
- **Severity:** Medium
- **Effort:** S
- **Description:** The names for dropped elements and attributes are generated from the names of top-level constructs only. If the drop target already contains a local element `Element1` or a local attribute `Attribute1`, the drop generates the same name, and the command is rejected with an error such as "Cannot add element: duplicate element name 'Element1' in sequence". For attributes, the message contains the internal term `topLevelComplexType` instead of the type name. A second drop succeeds, because the failed name stays reserved until the next schema update. The fix is to also skip the names already used in the drop target (see [Drag and drop](drag-and-drop.md#defaults)).
- **GitHub issue:** [#430](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/430)

## Diagram error text stays after a successful render

- **Location:** `webview-src/renderer.ts` (`showError()`), `webview-src/diagram/DiagramSvgRenderer.ts` (`render()`)
- **Severity:** Medium
- **Effort:** S
- **Description:** When building, laying out or drawing fails, `DiagramRenderer.showError()` adds the text "Error: …" to the canvas group. The next render only empties the content group inside it, so the error text stays visible over the diagram, even after the schema has been fixed. The app also shows the error in the notification bar, which is enough. The fix is to remove the SVG error text, or to put it into the content group (see [Diagram rendering](diagram-rendering.md#pipeline)).
- **GitHub issue:** [#431](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/431)

## Restricted complex content is shown without content and attributes

- **Location:** `webview-src/diagram/SchemaProcessors.ts` (`processComplexType()`), `webview-src/diagram/SchemaProcessorsSimpleTypes.ts` (`processRestriction()`)
- **Severity:** Medium
- **Effort:** M
- **Description:** For `xs:complexContent` and `xs:simpleContent`, an `xs:extension` is processed with its attributes and compositors, but an `xs:restriction` is passed to the simple type function `processRestriction()`, which only reads facets. A complex type that restricts another one with complex content is therefore shown without children, and the attributes of both kinds of restriction are missing in the properties panel. The function also sets `simpleTypeDerivationKind` on the complex type. The fix is to process restrictions of complex content like extensions (attributes and compositors), and to read the attributes of restrictions of simple content as well (see [Diagram rendering](diagram-rendering.md#from-schema-to-diagram-items)). See also [Diagram items copy values from the schema objects](#diagram-items-copy-values-from-the-schema-objects).
- **GitHub issue:** none

## Renames and new references do not check for duplicates

- **Location:** `src/commandValidators/elementValidators.ts` (`validateModifyElement()`), `src/commandValidators/attributeValidators.ts` (`validateModifyAttribute()`), `src/commandValidators/simpleTypeValidators.ts` (`validateModifySimpleType()`), `src/commandValidators/complexTypeValidators.ts` (`validateModifyComplexType()`), `src/commandValidators/groupValidators.ts` (`validateModifyGroup()`)
- **Severity:** Medium
- **Effort:** M
- **Description:** The `add*` validators reject a name or reference that already exists, but the `modify*` validators of elements, attributes, simple types, complex types and groups only check that the new name or reference is valid. Renaming the top-level element `a` to `b` while `b` exists is accepted and writes a schema with two top-level elements named `b`, which is invalid XSD; the same happens for attributes, types and groups. Likewise, changing a local element or attribute into a reference that its parent already contains (for example a second `<xs:attribute ref="lang"/>` in the same complexType) is accepted, which `validateAddElement()` and `validateAddAttribute()` reject. Because node IDs resolve to the first match, the two nodes can then no longer be told apart (see [Node IDs are ambiguous](#node-ids-are-ambiguous-and-have-many-special-cases)). `validateModifyAttributeGroup()` already has the check for names. The fix is the same check in these validators as in the matching `add*` validators, skipped when the name or reference does not change.
- **GitHub issue:** none

## Removing a simple or complex type does not check for references

- **Location:** `src/commandValidators/simpleTypeValidators.ts` (`validateRemoveSimpleType()`), `src/commandValidators/complexTypeValidators.ts` (`validateRemoveComplexType()`), `src/commandValidators/elementValidators.ts` (`validateRemoveElement()`), `src/commandValidators/attributeValidators.ts` (`validateRemoveAttribute()`)
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
- **GitHub issue:** [#432](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/432)

## Particles are not shown in document order

- **Location:** `webview-src/diagram/SchemaProcessors.ts` (`processGroup()`)
- **Severity:** Medium
- **Effort:** M
- **Description:** The generated classes store the particles of a compositor in one array per kind, and the diagram builder adds them kind by kind: first the elements, then the group references, then nested `choice`s, then nested `sequence`s. A `sequence` of `a`, a `choice` and `b` is therefore shown as `a`, `b`, `choice`, which gives the wrong order for a sequence. The node IDs are not affected, because positions are counted per kind. xmlbind-ts records the local names of the child elements in document order (`_elementOrder`), from which the diagram builder could restore the order when the children are added (see [Diagram rendering](diagram-rendering.md#from-schema-to-diagram-items)). But xmlbind-ts does not use this order completely when it writes the document, so after the first command the file itself can have the wrong order (see [Commands can change or lose content outside the edit](#commands-can-change-or-lose-content-outside-the-edit)).
- **GitHub issue:** none

## Imports and includes cannot be edited in the editor

- **Location:** `webview-src/diagram/DiagramBuilder.ts`, `webview-src/propertiesPanel/`, `webview-src/palette/`
- **Severity:** Medium
- **Effort:** M
- **Description:** `xs:import` and `xs:include` are neither shown in the diagram nor in the properties panel, and the palette has no entry for them. The commands exist (`addImport`, `removeImport`, `modifyImport`, `addInclude`, `removeInclude`, `modifyInclude`, see [Commands](commands.md#imports-includes-and-namespaces)), but nothing in the webview sends them, so imports and includes can only be edited in the text editor. Other edits keep them unchanged. One option is a section in the properties panel of the schema root, next to the namespace declarations.
- **GitHub issue:** [#359](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/359)

## Element references are not shown as references

- **Location:** `webview-src/diagram/SchemaProcessors.ts`
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

- **Location:** `src/commandValidators/simpleTypeValidators.ts` (`validateSimpleTypeBody()`), `webview-src/propertiesPanel/propertiesPanelFacets.ts`
- **Severity:** Medium
- **Effort:** L
- **Description:** `addSimpleType` and `modifySimpleType` only check that a restriction has at least one facet. They do not check whether a facet applies to the base type, or whether facet values fit together. `maxLength` on `xs:integer`, `fractionDigits` on `xs:string`, `minLength` greater than `maxLength` or a `maxInclusive` that is not a valid value of the base type are accepted and written to the file, which makes the schema invalid. The properties panel does not limit the facets by base type either. The fix is a table of the facets that apply to each built-in primitive type (XSD Part 2), a lookup that follows user-defined base types down to their primitive type, and checks for the value constraints between facets (see [Commands](commands.md#restriction-facets)).
- **GitHub issue:** none

## Every command reformats the whole document

- **Location:** `src/webviewProvider.ts` (`executeCommand()`), `@neumaennl/xmlbind-ts` (`marshal`)
- **Severity:** Medium
- **Effort:** L
- **Description:** The provider replaces the whole document with the output of `marshal`, which does not keep the source formatting: indentation becomes two spaces, attributes are reordered, and quotes and empty elements are normalized (see [Persistence](persistence.md#what-serialization-changes)). Even a small command therefore changes most lines of a hand-formatted file, which makes Git diffs and undo steps large. Comments, the prefixes of the element names and the XML declaration are kept; changes beyond the formatting are described in [Commands can change or lose content outside the edit](#commands-can-change-or-lose-content-outside-the-edit). The fix belongs in `xmlbind-ts`, for example by keeping attribute order, quote style and indentation as metadata like the element order. Smaller still would be edits of the changed part only: if `xmlbind-ts` recorded where each element is in the source text, a command could replace just the text of the element it changed and leave everything else as it is, which fits commands that each change one place ([xmlbind-ts#252](https://github.com/neumaennl/xmlbind-ts/issues/252), approach 3).
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

## References to included and imported schemas are not checked

- **Location:** `src/commandValidators/validationUtils.ts` (`validateElementType()`)
- **Severity:** Medium
- **Effort:** L
- **Description:** The editor never reads the schemas that `xs:include` and `xs:import` refer to. `validateElementType()` therefore accepts every type name with a prefix whose namespace has an `xs:import`, and every name without a prefix as soon as the schema has an `xs:include`, whether the type exists there or not: a misspelled `type="tns:Adress"` is accepted when `tns` is imported. The diagram cannot show the content of such types either. The fix needs the referenced files to be read and their components collected, the symbol table of [Responsibilities of xmlbind-ts and the editor](architecture.md#responsibilities-of-xmlbind-ts-and-the-editor). See also [Imports and includes cannot be edited in the editor](#imports-and-includes-cannot-be-edited-in-the-editor).
- **GitHub issue:** none

## Lists and unions with inline types are shown as if they had named types

- **Location:** `webview-src/diagram/SchemaProcessorsSimpleTypes.ts` (`processList()`, `processUnion()`), `webview-src/propertiesPanel/propertiesPanelXmlPreview.ts`
- **Severity:** Low
- **Effort:** S
- **Description:** For a list whose item type is an inline simple type (`<xs:list><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:list>`), `processList()` takes the base of the inline type as the item type. The diagram shows "list of xs:int", the properties panel offers `xs:int` as the item type, and the XML tab shows `<xs:list itemType="xs:int"/>`, although the list has no `itemType`. Changing the item type in the panel replaces the inline type. A union with inline member types is shown without any member types: the XML tab shows an empty `<xs:union/>`. The fix is to show inline item and member types as such, which depends on [Inline types have no node of their own](#inline-types-have-no-node-of-their-own).
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

## `vscode:check` does not check the Node versions that runtime dependencies require

- **Location:** `scripts/vscode-version.ts`, `.github/workflows/ci.yml`
- **Severity:** Low
- **Effort:** S
- **Description:** The extension runs on the Node version of the extension host, which `.nvmrc` records (see [VS Code and Node versions](build-and-packaging.md#vs-code-and-node-versions)). `npm run vscode:check` checks the values derived from the VS Code version, but not whether the runtime dependencies accept that Node version: `@neumaennl/xmlbind-ts` declares `engines.node` `>=24`, which fits the extension host's 24.15.0, but an upgrade that raises its minimum would go unnoticed. `xmlbind-ts` checks the same for its own dependencies with `npm run node:check`. The fix is a check after `npm ci` that reads `engines.node` of the runtime dependencies from `node_modules` and compares it with `.nvmrc`.
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

## Mocha brings dependencies with known vulnerabilities

- **Location:** `package.json` (`@vscode/test-cli`)
- **Severity:** Low
- **Effort:** S
- **Description:** `@vscode/test-cli` 0.0.15 depends on Mocha 11, which brings `serialize-javascript` 6 ([GHSA-5c6j-r48x-rmvq](https://github.com/advisories/GHSA-5c6j-r48x-rmvq), high: code execution through crafted input; [GHSA-qj8w-gfj5-8c6v](https://github.com/advisories/GHSA-qj8w-gfj5-8c6v), moderate: denial of service) and `diff` 7 ([GHSA-73rr-hh4g-fpgx](https://github.com/advisories/GHSA-73rr-hh4g-fpgx), low: denial of service). `npm audit` reports them. They are development dependencies that only run the [tests in the extension host](testing.md#tests-in-the-extension-host) on this repository's own test files, and they are not part of the VSIX. `@vscode/test-cli` declares overrides for both packages itself, but npm ignores the overrides of dependencies, and its switch to Mocha 12 is merged ([microsoft/vscode-test-cli#118](https://github.com/microsoft/vscode-test-cli/pull/118)) but not released yet. The decision is to wait for that release instead of overriding the versions here. When it is out, update `@vscode/test-cli`, check `npm audit` and remove this entry.
- **GitHub issue:** none

## Every message from the webview is a schema command

- **Location:** `shared/messages.ts` (`WebviewMessage`, `ExecuteCommandMessage`), `src/webviewProvider.ts` (`handleWebviewMessage()`), `webview-src/main.ts`
- **Severity:** Low
- **Effort:** M
- **Description:** `WebviewMessage`, the union of the messages from the webview, has a single member, `executeCommand`, which wraps a `SchemaCommand` (see [Messaging](messaging.md#messages)). So the switch on `message.command` in `handleWebviewMessage()` has one case, which ESLint reports as an unnecessary condition (`@typescript-eslint/no-unnecessary-condition`); an `eslint-disable-next-line` comment points to this entry. It is unclear whether this is intended. If every message from the webview is meant to be a schema edit, the wrapper is redundant and the webview could send `SchemaCommand`s directly. If the webview is meant to send other requests as well, these are missing so far; the [UX concept](ux-concept.md) plans context menu operations such as find usages, go to definition and regenerating sample XML, some of which need the extension but do not change the schema, and the [missing correlation](messaging.md#limitations) of commands and results may need a request ID in the message. Deciding needs an analysis of the existing and planned features and an architecture decision, recorded as an ADR.
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
- **GitHub issue:** [#156](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/156)

## Code exceeds the size limits

- **Location:** `src/commandValidators/groupValidators.ts`, `src/commandExecutors/elementExecutors.ts`, `webview-src/renderer.ts`, `webview-src/diagram/SchemaProcessors.ts`, `webview-src/propertiesPanel/propertiesPanelDocs.ts`, `propertiesPanelFacets.ts`, `propertiesPanelSimpleTypeEditors.ts`, `propertiesPanelTypes.ts`
- **Severity:** Low
- **Effort:** M
- **Description:** Some code is longer than the [development guidelines](development-guidelines.md#code-size) allow. Counted with comments and blank lines, `elementExecutors.ts` and `renderer.ts` have slightly more than 500 lines, and six functions have more than 120 lines: `renderFacetsTab()` in `propertiesPanelFacets.ts` (193 lines), `validateModifyGroup()`, `renderSimpleTypeUnionEditor()`, `processGroup()`, `createAnnotationSection()` and `renderTypeProperty()` (126 to 148 lines). The limits are not checked automatically, so these were not noticed. The fix is to split the code, and to enable the ESLint rules `max-lines` and `max-lines-per-function` for the code, as `max-lines` and a local rule already do for the tests.
- **GitHub issue:** none

## Top-level lookups are duplicated instead of shared

- **Location:** `src/schemaModelManager.ts`, `src/commandValidators/`, `src/commandExecutors/`, `src/schemaNavigator.ts`, `webview-src/diagram/DiagramBuilder.ts`, `webview-src/drop/DropCommandFactory.ts`
- **Severity:** Low
- **Effort:** L
- **Description:** `SchemaModelManager` has query methods (`findElement()`, `findComplexType()`, `findGroup()`, the `getAll*()` methods, `getTargetNamespace()`, `getImports()`, `getIncludes()`, `isLoaded()`, `clear()`), but they are only called from tests. They work on the schema stored in the manager, while validators and executors get a cloned schema object, and the webview cannot use code from `src/`. So the same lookups are written out again and again:
  - About 40 places look up a top-level component by name with `(schemaObj.<kind> ?? []).some(…)` or `.find(…)`.
  - The group and attribute group validators iterate over all top-level kinds one by one.
  - `DiagramBuilder` and `DropCommandFactory` collect the same lists in the webview.

  The fix is to replace the manager's query methods with pure functions in `shared/` that take the schema object as a parameter (for example `findTopLevel(schemaObj, kind, name)`, `getTopLevel(schemaObj, kind)` and `forEachTopLevelComponent(schemaObj, callback)`), use them everywhere, and remove the unused methods.
- **GitHub issue:** none

## Duplicated and dead code

- **Location:** whole repository
- **Severity:** Low
- **Effort:** L
- **Description:** The [development guidelines](development-guidelines.md#code-quality) ask to avoid code duplication, but the code base likely contains a fair amount of duplicated and dead code that was not caught in reviews. The [leftovers of the removed top-level drop target](#leftovers-of-the-removed-top-level-drop-target) and the [duplicated top-level lookups](#top-level-lookups-are-duplicated-instead-of-shared) are examples. A systematic cleanup by an agent is planned. Besides duplicates within one part, the agent should look explicitly for code that the extension (`src/`) and the webview (`webview-src/`) each implement on their own, and move it to `shared/`, which both use; for example the rules where an element or attribute may be placed, which both sides check (see [Architecture](architecture.md#principles)), and the top-level lookups in `DiagramBuilder` and `DropCommandFactory`. Examples found in the diagram code (see [Diagram rendering](diagram-rendering.md)):
  - `DiagramLayout` has its own `isCompositorGroup()`, which returns `true` when the ID cannot be parsed, while the one in `groupUtils.ts` returns `false`.
  - `DiagramLayout.relayoutItem()` and `DiagramItem.getTextDocumentation()` are only called from tests, `DiagramBuilder.elementMap` is only cleared, and `DiagramItem.inheritFrom` is never set.
  - `DiagramItemType.reference` is never assigned; only the layout and a test handle it, and the renderer draws no shape for it.
  - `Diagram.size` is not used, and `Diagram.scale` is always 1, so the `scale*()` helpers of `Diagram` and `DiagramItem` change nothing.
- **GitHub issue:** none

## Diagram items copy values from the schema objects

- **Location:** `webview-src/diagram/DiagramItem.ts`, `webview-src/diagram/SchemaProcessors*.ts`, `webview-src/diagram/TypeNodeCreators.ts`, `webview-src/propertiesPanel/propertiesPanelDraft.ts`, `webview-src/propertiesPanel/`, `webview-src/drop/`
- **Severity:** Low
- **Effort:** L
- **Description:** `DiagramItem` does not reference the schema object it represents; the builder copies about 22 values into it instead (see [Diagram rendering](diagram-rendering.md#data-model)). The renderer needs only a few of them; most are read by the properties panel and the drop code. Every new value has to be added to the item, to the builder and to `createDraftNode()`, which copies all fields again by hand for the properties panel draft. The extraction is partly duplicated: `processGroup` builds group elements inline instead of using `createElementNode`. Values that are not copied, or copied in a reduced form, cause bugs: [Restricted complex content is shown without content and attributes](#restricted-complex-content-is-shown-without-content-and-attributes), [Element references are not shown as references](#element-references-are-not-shown-as-references) and [Items with maxOccurs 0 are drawn as repeated](#items-with-maxoccurs-0-are-drawn-as-repeated) come at least partly from this layer. The plan is to keep only view state on the item, add a typed reference to the schema object, and read values through one module of accessor functions. The properties panel draft must then be a deep copy of the schema object: after a failed command the webview receives no new schema, so changes to the shared object would remain. This should be planned together with [inline types](#inline-types-have-no-node-of-their-own) and the [node ID redesign](#node-ids-are-ambiguous-and-have-many-special-cases), which also change the builder.
- **GitHub issue:** [#360](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/360)

## Complex types with simple content cannot be created or derived

- **Location:** `shared/commands/schemaTypes.ts` (`AddComplexTypePayload`, `ModifyComplexTypePayload`), `src/commandValidators/complexTypeValidators.ts` (`validateModifyComplexType()`), `src/commandExecutors/complexTypeExecutors.ts`
- **Severity:** Low
- **Effort:** L
- **Description:** A complex type with `xs:simpleContent` has text content of a simple type plus attributes, for example a price with a currency. The complex type commands only know complex content: `addComplexType` requires a `contentModel` and always creates a compositor, and the executor only builds `complexContent`, so a `baseType` or `contentModel` for a type with simple content would add a `complexContent` next to the `simpleContent`, which is invalid. `modifyComplexType` therefore rejects `baseType`, `derivationKind` and `contentModel` for such types (see [Commands](commands.md#complex-types)). Such types can be shown and renamed, and their documentation can be edited, but a type with simple content cannot be created, its base type and derivation cannot be changed, and an existing type cannot be switched between simple and complex content. Related problems are [Attributes on derived complex types are rejected or misplaced](#attributes-on-derived-complex-types-are-rejected-or-misplaced) and the [mixed content toggle](#mixed-content-toggle-ignores-simple-content-complexcontent-and-the-base-type). The fix needs a way to choose simple content in the payloads, for example a content kind, and an executor that builds `simpleContent` with an `extension` or `restriction` of a simple base type.
- **GitHub issue:** none

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

## Attribute editing is half implemented

- **GitHub issue:** [#282](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/282)
- **Severity:** Medium
- **Effort:** S
- **Description:** The issue has no body. The commands `modifyAttribute` and `removeAttribute` exist with executors in `src/commandExecutors/attributeExecutors.ts`, but the webview never sends them: attributes can only be added from the palette, and the properties panel lists them read-only.

## Focus issue mentions toolbar add actions

- **GitHub issue:** [#280](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/280)
- **Severity:** Low
- **Effort:** S
- **Description:** It asks for consistent behavior between toolbar, palette and other add flows, but the toolbar has no add actions; nodes are added from the palette.

## Issues without description or labels

- **GitHub issues:** see description
- **Severity:** Low
- **Effort:** M
- **Description:** [#279](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/279), [#282](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/282), [#283](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/283) and [#307](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/307) have no description, so their scope is only given by the title. These, [#284](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/284) and [#276](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/276), [#280](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/280), [#302](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/302), [#304](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/304) and [#308](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/308) have no labels.
