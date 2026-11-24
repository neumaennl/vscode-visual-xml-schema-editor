---
type: Known Issues
title: Known issues
description: Problems found in the extension that are not fixed yet, with links to GitHub issues where they exist.
tags: [known-issues, maintenance, technical-debt]
status: draft
generated: { by: human:neumaennl, at: 2026-11-24T16:36:51Z }
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
- **Medium:** a visible bug that misinforms the user or blocks a task, missing editor support for schema constructs that are common in schemas, or a mismatch that is likely to lead to wrong changes.
- **Low:** cosmetic issues, maintainability problems (structure, duplicated or dead code), missing support for rare schema constructs or details, or minor inaccuracies.

Severity rates the problem itself, not its priority and not the problems it causes; those have entries of their own.

Effort:

- **S:** less than an hour, a local change.
- **M:** a few hours, changes in several files.
- **L:** a day or more, or design decisions are needed.

# Code

## Replacement type changes an inline restriction of an inline type

- **Location:** `webview-src/propertiesPanel/propertiesPanelTypes.ts` (`renderReplacementType()`), `webview-src/propertiesPanel/propertiesPanelCommands.ts` (`createTypeCommand()`)
- **Severity:** High
- **Effort:** S
- **Description:** An element whose inline simple type has no single base type, such as `<xs:element name="short"><xs:simpleType><xs:restriction><xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType></xs:restriction></xs:simpleType></xs:element>`, shows a "Replacement Type" field with the hint that a replacement type removes the inline simple type. Entering `xs:token` sends `modifySimpleType` with `baseType: "xs:token"` for `/element:short/anonymousSimpleType[0]` instead of `modifyElement` with `elementType`: the inline type stays, and its inline base type is replaced by `xs:token`. `createTypeCommand()` builds the base type command for every element with an inline simple type; the replacement of inline lists, unions and restrictions with a base type uses `renderInlineSimpleTypeReplacement()`, which sends `modifyElement`. The fix is to send `modifyElement` there as well.
- **GitHub issue:** [#450](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/450)

## Node IDs are ambiguous and have many special cases

- **Location:** `shared/idStrategy.ts`, `src/schemaNavigator.ts`, `src/commandValidators/`, `src/commandExecutors/`, `webview-src/diagram/` (ID generation), `webview-src/propertiesPanel/propertiesPanelCommands.ts`, `webview-src/propertiesPanel/propertiesPanelNodeKinds.ts`, `webview-src/propertiesPanel/propertiesPanelTargets.ts`
- **Severity:** High
- **Effort:** L
- **Description:** The ID conventions go back to the original protocol design, written before the editor was implemented, and were adapted during implementation (see [Schema model](schema-model.md#node-ids)). One of the resulting problems is a bug:
  - **Namespaced names are parsed wrongly.** `locateNodeById()` uses `parseSchemaId()` to split the ID, but then parses each segment with a private copy of the segment parser (`parseSegment`). Unlike `parseNodeSegment()` in `idStrategy.ts`, the copy splits at the first colon and does not handle `{namespace}name`.

  Others are special cases that make the scheme harder to use and to extend:
  - Top-level components, imports and includes are not under `/schema` (`/element:x`, `/import[0]`), but schema-root annotations are (`/schema/annotation[0]`).
  - There are three annotation schemes: a component's annotation uses the component's ID, schema-root annotations are numbered, and `/schema/documentation[N]` is a shorthand for the first schema annotation.
  - Compositors reuse the node type `group` (`group:sequence[0]`) instead of having their own node types.
  - `complexContent` derivation is skipped, so the `extension` or `restriction` has no segment of its own.
  - Top-level components have a name and no position; local elements have both.
  - The last segment of annotations, imports, includes and references is resolved by the individual validators and executors instead of one resolver.
  - The doc comments of `parentId` in `shared/commands/simpleType.ts` and `complexType.ts` say "Omit or set to 'schema'", but `isSchemaRoot()` only accepts `/schema`; `parentId: "schema"` fails with "Parent not found: schema".

  The webview reads IDs with its own helpers, such as `getNodeType()` and `isTopLevelElement()` in `propertiesPanelNodeKinds.ts`, instead of shared ones; `idStrategy.ts` had such helpers, but nothing used them, so they were removed.

  The goal is one consistent grammar, generated and resolved by a single implementation in `shared/`. Since IDs are not stored in the XSD file, a new format needs no migration.

- **GitHub issue:** [#348](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/348)

## Commands can change or lose content outside the edit

- **Location:** `@neumaennl/xmlbind-ts` (`marshal()`, `unmarshal()`), `src/webviewProvider.ts` (`executeCommand()`)
- **Severity:** High
- **Effort:** L
- **Description:** Every command writes the whole document with `marshal` (see [Persistence](persistence.md#what-serialization-changes)). Besides the formatting (see [Every command reformats the whole document](#every-command-reformats-the-whole-document)), this changes or loses content that the command did not touch, even when it only renames something. Reproduced with `unmarshal` and `marshal` and the generated schema classes:
  - Children of one kind that occur in more than one run are written together: the `sequence` `element z, choice, any, element a, group` becomes `element z, element a, choice, any, group`, which changes its meaning. A comment is written after as many elements as were before it in the source, so it moves when they are reordered: in `element a, <!--c1-->, element b, simpleType s, <!--c2-->, element c`, `c2` moves behind `c`. ([xmlbind-ts: elements](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#elements-are-reordered-when-occurrences-are-not-contiguous), [comments](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#comments-move-when-elements-are-reordered-or-dropped))
  - Content that the classes generated from XSD 1.0 do not map is dropped without notice: XSD 1.1 constructs such as `xs:assert`, and foreign elements at the top level. A comment after dropped content moves for the same reason: in `sequence, assert, <!--c-->, attribute`, `c` moves behind `attribute`. Processing instructions, a document type declaration and comments after the root element are dropped as well. ([xmlbind-ts: unmapped content](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#unmapped-content-is-dropped-without-notice), [comments](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#comments-move-when-elements-are-reordered-or-dropped), [processing instructions](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#processing-instructions-the-document-type-and-comments-after-the-root-are-dropped))
  - Mixed content in `xs:documentation` is scrambled: `Some <b>mixed</b> &amp; text` becomes `<b>mixed</b>` followed by `Some&amp; text`. ([xmlbind-ts](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#mixed-content-is-reordered-and-loses-whitespace))
  - A namespace declaration below the root element is dropped: `<xs:element xmlns:t="urn:t" name="e" type="t:T"/>` loses `xmlns:t`, so `t:T` no longer resolves. ([xmlbind-ts](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#namespace-declarations-below-the-root-are-not-kept))
  - The XML declaration is always written as `<?xml version="1.0" encoding="UTF-8"?>`. ([xmlbind-ts](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#the-attributes-of-the-xml-declaration-are-not-kept))

  The editor does not warn about any of this. The causes are in `xmlbind-ts` (see [Architecture](architecture.md#responsibilities-of-xmlbind-ts-and-the-editor)); 2.x gets no more fixes, and version 3, which writes only the changes of a command, fixes them ([#444](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/444)). What the editor does with a schema that does not survive a round trip unchanged is its own decision: for example, it could compare the document with the result of a round trip when it is opened, and warn or switch to read-only if they differ.

- **GitHub issue:** [#444](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/444)

## Turning the default namespace into a prefix does not rewrite references

- **Location:** `src/commandExecutors/schemaExecutors.ts` (`executeModifySchemaNamespaces()`), `src/schemaReferences/referenceRewrites.ts`
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
- **Description:** `modifySchemaNamespaces` replaces the complete prefix map, so a prefix that is missing from the map is removed. The validator does not check whether QNames such as `type="tns:Address"` still use the removed prefix, and the schema is left with references that cannot be resolved. The properties panel sends this command when a namespace row is deleted. `removeImport` already rejects the removal of a namespace that is still referenced (`isAnyPrefixReferenced()`); the same check is needed for prefixes that are removed and not renamed.
- **GitHub issue:** [#428](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/428)

## Documentation overlaps the next item

- **Location:** `webview-src/diagram/DiagramItem.ts` (`calculateBoundingBox()`), `webview-src/diagram/DiagramLayout.ts`
- **Severity:** Medium
- **Effort:** S
- **Description:** With `showDocumentation`, the documentation of an item is drawn in a box 5 px below its shape, up to 100 px high. The item's bounding box does not include this box, and the next sibling is placed 20 px below the bounding box. The documentation is therefore drawn over the next item: for a top-level element with 150 characters of documentation, the box ends at y = 115, while the next element starts at y = 60. The fix is to include the documentation box in the bounding box (see [Diagram rendering](diagram-rendering.md#layout)). See also [Documentation in the diagram is cut off and hard to read](#documentation-in-the-diagram-is-cut-off-and-hard-to-read).
- **GitHub issue:** [#429](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/429)

## Generated names ignore local names in the drop target

- **Location:** `webview-src/dragAndDrop/DropCommandFactory.ts` (`updateNamesFromSchema()`, `nextName()`)
- **Severity:** Medium
- **Effort:** S
- **Description:** The names for dropped elements and attributes are generated from the names of top-level schema constructs only. If the drop target already contains a local element `Element1` or a local attribute `Attribute1`, the drop generates the same name. A second `Attribute1`, or an `Element1` of another type, is rejected; an `Element1` of the same type is added, which is allowed in a sequence but not in a choice (see [Unique Particle Attribution is not checked](#unique-particle-attribution-is-not-checked)). After a rejection, a second drop succeeds, because the failed name stays reserved until the next schema update. The fix is to also skip the names already used in the drop target (see [Drag and drop](drag-and-drop.md#defaults)).
- **GitHub issue:** [#430](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/430)

## Unique Particle Attribution is not checked

- **Location:** `src/schemaConstraints/`
- **Severity:** Medium
- **Effort:** L
- **Description:** XML Schema requires that each element of a document matches exactly one particle of its content model without looking ahead ("Unique Particle Attribution"). `<xs:choice><xs:element name="a"/><xs:element name="a"/></xs:choice>`, two `a` in an `xs:all`, and a sequence `a?, a` violate it, even if both `a` have the same type. The editor does not check it, so adding or renaming elements and changing their occurrences can produce such content models. The fix is one more constraint in the check of the result (see [ADR 003](architecture/003-validators-check-executors-assume.md)). It waits for the move to xmlbind-ts 3, because the check needs the order of the children of a sequence, which xmlbind-ts 2 does not keep reliably.
- **GitHub issue:** [#444](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/444)

## Removing a simple or complex type does not check for references

- **Location:** `src/commandValidators/simpleTypeValidators.ts` (`validateRemoveSimpleType()`), `src/commandValidators/complexTypeValidators.ts` (`validateRemoveComplexType()`), `src/commandValidators/elementValidators.ts` (`validateRemoveElement()`), `src/commandValidators/attributeValidators.ts` (`validateRemoveAttribute()`)
- **Severity:** Medium
- **Effort:** M
- **Description:** Removing a top-level simple or complex type is accepted even if elements, attributes or other types still use it (`validateRemoveSimpleType()` has a `TODO Phase 2` for this). The schema is left with `type` and `base` values that point nowhere. The properties panel sends these commands when a type is deleted. The same applies to top-level elements and attributes that are still referenced with `ref` or `substitutionGroup`. Groups, attribute groups and imports already reject the removal while they are referenced; types, elements and attributes need the same check (see [Commands](commands.md#conventions)).
- **GitHub issue:** none

## Expand state is not restored after reopening

- **Location:** `webview-src/canvas/DiagramCanvas.ts` (`render()`), `webview-src/main.ts` (`WebviewState`)
- **Severity:** Medium
- **Effort:** S
- **Description:** When VS Code is restarted with a schema open in the visual editor, all nodes are collapsed. The canvas keeps the expand state across redraws in memory only; `WebviewState` contains just the schema, the view state and the diagram options. The zoom and pan are restored since the structure review [#448](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/448). The fix is to save the expand state with the other state and to pass it to the canvas when the webview is created.
- **GitHub issue:** [#347](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/347)

## The panel loses the focus when the reply to an edit arrives

- **Location:** `webview-src/main.ts` (`refreshSelection()`), `webview-src/propertiesPanel/propertiesPanel.ts`
- **Severity:** Medium
- **Effort:** S
- **Description:** Every reply of the extension host to a command shows the selected node again and renders the whole properties panel anew. When the user leaves a field with Tab or by clicking another field, the field sends its value, and the reply replaces the field the user moved to a few milliseconds later. The focus is gone, so what the user types next goes nowhere. If the reply comes only after the user has started typing, as with large schemas, the new field commits the half-typed value when it is removed. The panel should put the focus back on the same field after it renders the same node again. [#280](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/280) covers this together with the focus after creating a node, which has the same cause.
- **GitHub issue:** [#280](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/280)

## Commands can overlap while an edit is applied

- **Location:** `src/webviewProvider.ts` (`executeCommand()`), `webview-src/main.ts`
- **Severity:** Medium
- **Effort:** M
- **Description:** `CommandProcessor.execute()` is synchronous, so two commands never run in it at the same time. The asynchronous part is not guarded: the provider awaits `applyEdit()`, and the webview sends commands without waiting for `commandResult`. A second command that arrives during the wait reads the document text before the first edit and computes its replace range from it, so it can undo the first change or leave parts of the old text in the document. This follows from the code and was not reproduced in VS Code. The fix is to queue commands in the provider (process one after the other, each after the previous edit is applied) and to remove the flag; the webview could additionally block input while a command is pending (see [Persistence](persistence.md#concurrency)). The messages carry no request ID and `commandResult` does not name its command, so the webview cannot tell which of several pending commands a result belongs to (see [Messaging](messaging.md#limitations)).
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

## Name validation is ASCII-only

- **Location:** `shared/qNames.ts` (`isValidXmlName()`), the validators and the fields of the properties panel that call it
- **Severity:** Medium
- **Effort:** M
- **Description:** `isValidXmlName()` is the regular expression `/^[a-zA-Z_][\w.-]*$/`. XML names may contain non-ASCII letters (`Straße`, `名前`), which are rejected, in names and in the prefix and local name of a `ref`. The fix is a check for NCNames following the XML specification.
- **GitHub issue:** none

## Built-in types are recognized by their local name only

- **Location:** `shared/typeReferences.ts` (`validateTypeReference()`), `webview-src/propertiesPanel/propertiesPanelTypeReferences.ts` (`collectTypeSuggestions()`, `normalizeTypeReference()`)
- **Severity:** Medium
- **Effort:** S
- **Description:** A type reference names a built-in type only if its prefix declares the namespace of XML Schema, or if it has no prefix and the default namespace is the namespace of XML Schema. The editor ignores the prefix on both sides:
  - `validateTypeReference()`, which the validators and the properties panel share, accepts every reference whose local name is a built-in type or a type of the schema, whatever the prefix: `type="tns:string"`, `type="foo:string"` with an undeclared `foo`, or `ext:Address` for a local type `Address` are accepted.
  - The properties panel suggests the built-in types with the prefix `xs`, which is wrong in a schema that declares the namespace with another prefix such as `xsd`, and `normalizeTypeReference()` keeps a built-in type that is entered without a prefix, such as `string`, without one, which is only valid if the default namespace is the namespace of XML Schema.

  The fix is to resolve the prefix with the namespace declarations of the schema (`shared/qNames.ts`) and to use the schema's own prefix for the namespace of XML Schema; the structure review [#448](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/448) does this when it replaces the fixed `xs:` prefix in the webview.

- **GitHub issue:** [#448](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/448)

## Mixed content toggle ignores simple content, `complexContent` and the base type

- **Location:** `webview-src/propertiesPanel/propertiesPanelConstraints.ts` (`renderConstraintsSection()`, `canShowConstraintsSection()`), `webview-src/diagram/TypeNodeCreators.ts`, `webview-src/diagram/SchemaProcessors.ts`, `src/commandExecutors/complexTypeExecutors.ts`, `src/commandValidators/`
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

## Attributes in a restriction are not checked against the base type

- **Location:** `src/commandValidators/attributeValidators.ts` (`validateAddAttribute()`), `src/commandValidators/attributeGroupValidators.ts` (`validateAddAttributeGroup()`), `webview-src/dragAndDrop/DropCommandFactory.ts` (`createAttributeNodeDropCommand()`)
- **Severity:** Medium
- **Effort:** L
- **Description:** In a complex type that derives by restriction, XML Schema only allows attributes that restrict an attribute of the base type, or that the base type's `xs:anyAttribute` allows ("Derivation Valid (Restriction, Complex)"). `addAttribute` and `addAttributeGroup` add any attribute or reference to the `xs:restriction` of complex or simple content, and the attribute drop accepts such types and adds `Attribute1`. Unless the base type declares `Attribute1` or has a matching wildcard, the schema is then invalid; the command reports success. The user can rename the attribute to one of the base type. The fix needs the attributes of the base type, including those of its attribute groups and its own base types, and its wildcard; it can share the lookup of the base type with [Facets are not checked against the base type](#facets-are-not-checked-against-the-base-type).
- **GitHub issue:** none

## Every command reformats the whole document

- **Location:** `src/webviewProvider.ts` (`executeCommand()`), `@neumaennl/xmlbind-ts` (`marshal`)
- **Severity:** Medium
- **Effort:** L
- **Description:** The provider replaces the whole document with the output of `marshal`, which does not keep the source formatting: indentation becomes two spaces, attributes are reordered, and quotes and empty elements are normalized (see [Persistence](persistence.md#what-serialization-changes)). Even a small command therefore changes most lines of a hand-formatted file, which makes Git diffs and undo steps large. Comments, the prefixes of the element names and the XML declaration are kept; changes beyond the formatting are described in [Commands can change or lose content outside the edit](#commands-can-change-or-lose-content-outside-the-edit). The fix belongs in `xmlbind-ts`, for example by keeping attribute order, quote style and indentation as metadata like the element order. Smaller still would be edits of the changed part only: if `xmlbind-ts` recorded where each element is in the source text, a command could replace just the text of the element it changed and leave everything else as it is, which fits commands that each change one place ([xmlbind-ts#252](https://github.com/neumaennl/xmlbind-ts/issues/252), approach 3).
- **GitHub issue:** [xmlbind-ts#252](https://github.com/neumaennl/xmlbind-ts/issues/252)

## Inline types have no node of their own

- **Location:** `webview-src/diagram/SchemaProcessors.ts`, `webview-src/dragAndDrop/` (drop rules), `webview-src/propertiesPanel/` (element editors), `shared/idStrategy.ts`, `src/commandExecutors/`
- **Severity:** Medium
- **Effort:** L
- **Description:** An anonymous (inline) complex or simple type is not drawn as a node; its content is merged into the element (see [Diagram rendering](diagram-rendering.md#from-schema-to-diagram-items)). In the schema model and the node IDs, however, the anonymous type has its own segment (`/element:person/anonymousComplexType[0]`, see [Schema model](schema-model.md#conventions)). So one diagram node stands for two schema constructs, and every part of the editor has to decide which of the two is meant:
  - The drop rules have extra cases for "element with anonymous complex type" and "element with simple content", which turn a drop on the element into a command on its type (see [Drag and drop](drag-and-drop.md)).
  - The properties panel of an element mixes element and type fields: Base Type, Replacement Type, `mixed` and the Facets tab belong to the type (see [UX concept](ux-concept.md)).
  - Anonymous types cannot be selected or deleted on their own, and the element's documentation falls back to the type's documentation, which cannot be told apart.

  How Altova XMLSpy shows anonymous types is unclear: its manual says that "there is no separate symbol for local complex types", which can mean that they are merged into the element or that they use the same symbol as named complex types; this was not tried in XMLSpy. The editor does not have to follow XMLSpy here. An alternative is to draw the anonymous type as a child node of the element, so that every node is exactly one schema construct. This could be a diagram option. It should be decided before the [node IDs are redesigned](#node-ids-are-ambiguous-and-have-many-special-cases).

- **GitHub issue:** [#358](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/358)

## Palette has no entry for attribute groups

- **Location:** `webview-src/palette/`, `webview-src/dragAndDrop/`, `webview-src/diagram/typeAccessors.ts` (`getAttributes()`)
- **Severity:** Medium
- **Effort:** L
- **Description:** The palette has items for elements, attributes and groups, but none for attribute groups, so they cannot be created or referenced in the editor. The commands exist (`addAttributeGroup`, `removeAttributeGroup`, `modifyAttributeGroup`, see [Commands](commands.md#attribute-groups)), but the webview never sends them. The diagram does not show attribute groups either: it only reads `attribute`, so top-level attribute group definitions and `<xs:attributeGroup ref="…"/>` inside complex types are left out, and the only use in the webview is the duplicate-name check in `DropCommandFactory`. The fix is a palette item with drop targets for the schema (definition) and complex types (reference), showing definitions and references in the diagram, and the header delete button for them.
- **GitHub issue:** none

## References to included and imported schemas are not checked

- **Location:** `shared/typeReferences.ts` (`validateTypeReference()`)
- **Severity:** Medium
- **Effort:** L
- **Description:** The editor never reads the schemas that `xs:include` and `xs:import` refer to. `validateTypeReference()` therefore accepts every type name with a prefix whose namespace has an `xs:import`, and every name without a prefix as soon as the schema has an `xs:include`, whether the type exists there or not: a misspelled `type="tns:Adress"` is accepted when `tns` is imported. The diagram cannot show the content of such types either. The fix needs the referenced files to be read and their components collected, the symbol table of [Responsibilities of xmlbind-ts and the editor](architecture.md#responsibilities-of-xmlbind-ts-and-the-editor). See also [Imports and includes cannot be edited in the editor](#imports-and-includes-cannot-be-edited-in-the-editor).
- **GitHub issue:** none

## Lists and unions with inline types are shown as if they had named types

- **Location:** `webview-src/diagram/typeAccessors.ts` (`getSimpleDerivation()`), `webview-src/propertiesPanel/propertiesPanelXmlPreview.ts`
- **Severity:** Low
- **Effort:** S
- **Description:** For a list whose item type is an inline simple type (`<xs:list><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:list>`), `getSimpleDerivation()` takes the base of the inline type as the item type. The diagram shows "list of xs:int", the properties panel offers `xs:int` as the item type, and the XML tab shows `<xs:list itemType="xs:int"/>`, although the list has no `itemType`. Changing the item type in the panel replaces the inline type. A union with inline member types is shown without any member types: the XML tab shows an empty `<xs:union/>`. The fix is to show inline item and member types as such, which depends on [Inline types have no node of their own](#inline-types-have-no-node-of-their-own).
- **GitHub issue:** none

## Nonce uses `Math.random`

- **Location:** `src/webviewProvider.ts` (`getNonce()`)
- **Severity:** Low
- **Effort:** S
- **Description:** The doc comment says the function produces a cryptographically secure nonce for the webview's Content Security Policy, but it uses `Math.random`. The risk is low: the webview is local to VS Code, a new nonce is generated for every page, and the official VS Code webview samples use the same approach. The misleading comment is the main problem. The fix is either to correct the comment or to use `crypto.randomBytes` or `crypto.randomUUID`.
- **GitHub issue:** none

## `vscode:check` does not check the Node versions that runtime dependencies require

- **Location:** `scripts/vscode-version.ts`, `.github/workflows/ci.yml`
- **Severity:** Low
- **Effort:** S
- **Description:** The extension runs on the Node version of the extension host, which `.nvmrc` records (see [VS Code and Node versions](build-and-packaging.md#vs-code-and-node-versions)). `npm run vscode:check` checks the values derived from the VS Code version, but not whether the runtime dependencies accept that Node version: `@neumaennl/xmlbind-ts` declares `engines.node` `>=24`, which fits the extension host's 24.15.0, but an upgrade that raises its minimum would go unnoticed. `xmlbind-ts` checks the same for its own dependencies with `npm run node:check`. The fix is a check after `npm ci` that reads `engines.node` of the runtime dependencies from `node_modules` and compares it with `.nvmrc`.
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

## Documentation box size does not match the drawn text

- **Location:** `webview-src/diagram/DiagramLayout.ts` (`calculateDocumentationBox()`), `webview-src/diagram/TextRenderers.ts` (`renderDocumentation()`)
- **Severity:** Low
- **Effort:** S
- **Description:** The layout estimates the height of the documentation as if the text were wrapped at 30 characters per line with 12 px per line (at most 100 px). The renderer does not wrap: it draws the first three lines of the documentation, cuts each after 50 characters and uses the font size number 9 as line height, although the font size is 9 pt (12 px). For 150 characters on one line, the box is 70 px high, but a single line of 50 characters is drawn, and the rest is not visible anywhere in the diagram. The fix is to wrap the text in the renderer and compute the height from the same wrapped lines (see [Diagram rendering](diagram-rendering.md#shapes-and-notation)). See also [Documentation in the diagram is cut off and hard to read](#documentation-in-the-diagram-is-cut-off-and-hard-to-read).
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

## The editor corrects the line breaks of the output

- **Location:** `src/schemaXml.ts` (`fixOutputLineBreaks()`), `xmlbind-ts` (`marshal`)
- **Severity:** Low
- **Effort:** S
- **Description:** Since version 2.4.0, `marshal` starts its output with a line break unless it starts with the XML declaration, and no longer ends it with one ([xmlbind-ts](https://github.com/neumaennl/xmlbind-ts/blob/main/docs/known-issues.md#the-output-of-marshal-starts-with-a-line-break)). Every command would therefore remove the line break at the end of the file and put an empty line at the start of a schema without an XML declaration. `serializeSchema()` removes the leading line break and ends the output with exactly one (see [Persistence](persistence.md#what-serialization-changes)). Keeping the formatting of the source belongs to `xmlbind-ts` (see [Architecture](architecture.md#responsibilities-of-xmlbind-ts-and-the-editor)), and 2.x gets no more fixes, so the editor works around it until it moves to version 3, whose output has to keep the line breaks of the source; then `fixOutputLineBreaks()` is removed.
- **GitHub issue:** [#444](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/444)

## Unused protected class members are not detected

- **Location:** `shared/`, `src/`, `webview-src/`, `scripts/`, `.fallowrc.jsonc`
- **Severity:** Low
- **Effort:** S
- **Description:** fallow finds unused public and static class members, but the installed version skips protected members (see [Build and packaging](build-and-packaging.md#unused-code)). ESLint only finds unused private members. So a protected member that nothing uses goes unnoticed. fallow has a rule for them, `unused-protected-class-members` ([fallow-rs/fallow#4624](https://github.com/fallow-rs/fallow/issues/4624)), but no released version contains it yet. When one does, update fallow, set the rule to `error` in `.fallowrc.jsonc`, remove the findings, and remove this entry.
- **GitHub issue:** none

## Node types in IDs are not checked

- **Location:** `shared/idStrategy.ts` (`toNodeType()`), `src/schemaNavigator.ts`
- **Severity:** Low
- **Effort:** S
- **Description:** When an ID is parsed, the text of its node type, such as `element` in `/element:a`, is taken as a `SchemaNodeType` without a check. `toNodeType()` does this with a type assertion and an `eslint-disable` comment. An ID with an unknown type, such as `/foo:bar`, gets a node type that does not exist; the lookup then finds nothing, and the error says the node was not found instead of naming the unknown type. A check against the values of `SchemaNodeType` would remove the assertion: `parseSchemaId()` would throw for an unknown type, and `parseRequiredId()` and the navigator would turn that into a clear error. The IDs are redesigned in [#417](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/417) (see [Node IDs are ambiguous and have many special cases](#node-ids-are-ambiguous-and-have-many-special-cases)), so the check belongs into the new parser.
- **GitHub issue:** none (part of [#417](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/417))

## Documentation in the diagram is cut off and hard to read

- **Location:** `webview-src/diagram/TextRenderers.ts` (`renderDocumentation()`), `webview-src/diagram/DiagramBuilderHelpers.ts` (`extractDocumentation()`), `webview-src/diagram/DiagramLayout.ts`
- **Severity:** Low
- **Effort:** M
- **Description:** With `showDocumentation` (off by default), the documentation is drawn in a way that is likely to confuse (see [Diagram rendering](diagram-rendering.md#shapes-and-notation)). All `xs:documentation` entries of an item, in all languages, are joined with line breaks into one text. The renderer draws only its first three lines and cuts each after 50 characters, without wrapping and without an ellipsis, so the reader cannot tell that text is missing. Line breaks inside a documentation entry (the parser keeps them, only the outer whitespace is trimmed) count as lines, so a second language may appear as the third line without any marker, or may not appear at all. The full text cannot be seen anywhere in the diagram. Related layout problems are listed in [Documentation overlaps the next item](#documentation-overlaps-the-next-item) and [Documentation box size does not match the drawn text](#documentation-box-size-does-not-match-the-drawn-text). A better presentation needs a short design: for example, wrap the text to the box width, normalize whitespace, mark cut text with an ellipsis, show only one language, and show the full text in a tooltip or in the properties panel.
- **GitHub issue:** none

## Properties panel builds commands in its event handlers

- **Location:** `webview-src/propertiesPanel/propertiesPanel.ts` (`renderCardinalitySection()`), `propertiesPanelConstraints.ts` (`renderConstraintsSection()`), `propertiesPanelDocs.ts`, `propertiesPanelElementDefaults.ts`, `propertiesPanelFacets.ts`, `propertiesPanelSchemaNamespaces.ts`, `propertiesPanelSimpleTypeEditors.ts`, `propertiesPanelTypes.ts`
- **Severity:** Low
- **Effort:** M
- **Description:** The properties panel builds its commands in two ways. `propertiesPanelCommands.ts` and `propertiesPanelSimpleTypeCommands.ts` have functions that take a node and return a command, such as `createRenameNodeCommand()` and `createTypeCommand()`. Twenty other commands are written out inside the event handlers that render the fields: two in `propertiesPanel.ts` (cardinality), five in `propertiesPanelConstraints.ts` (nillable, abstract, mixed), seven in `propertiesPanelDocs.ts` and one or two in each of the other files listed. These can only be tested through the DOM, and changes to a command or to the values it reads have to be found in all of these places. The fix is to move the construction of these commands into functions in the command modules and to leave only the dispatch in the handlers.
- **GitHub issue:** [#156](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/156)

## Top-level lookups are duplicated instead of shared

- **Location:** `src/commandValidators/`, `src/commandExecutors/`, `src/schemaNavigator.ts`, `webview-src/diagram/DiagramBuilder.ts`, `webview-src/dragAndDrop/DropCommandFactory.ts`
- **Severity:** Low
- **Effort:** L
- **Description:** There are no shared functions that look up top-level components in a schema object. `SchemaModelManager` had query methods, but only tests called them, so [#439](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/439) removed them: they worked on the schema stored in the manager, while validators and executors got a cloned schema object, and the webview cannot use code from `src/`. #439 also merged the lookups that were copies of each other within the validators, the executors and the navigator. The parts still look up components on their own:
  - More than ten places in the validators and executors look up a top-level component by name with `(schemaObj.<kind> ?? []).some(…)` or `.find(…)`, and the navigator has a table of the top-level kinds.
  - `DiagramBuilder` and `DropCommandFactory` collect the same lists in the webview.

  The fix is pure functions in `shared/` that take the schema object as a parameter (for example `findTopLevel(schemaObj, kind, name)`, `getTopLevel(schemaObj, kind)` and `forEachTopLevelComponent(schemaObj, callback)`), used everywhere.

- **GitHub issue:** none

## Duplicated and dead code

- **Location:** whole repository
- **Severity:** Low
- **Effort:** L
- **Description:** The [development guidelines](development-guidelines.md#code-quality) ask to avoid code duplication, but the code base likely contains dead code, and duplicated logic that is written in different ways, which was not caught in reviews. `npm run lint` reports code that is copied, also with changed names (see [Build and packaging](build-and-packaging.md#duplicated-code)), and [#439](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/439) removed all such copies; it does not find logic that is written differently. fallow finds code that is unused across files, but not unused branches within a function (see [Build and packaging](build-and-packaging.md#unused-code)). The [duplicated top-level lookups](#top-level-lookups-are-duplicated-instead-of-shared) are an example. A systematic cleanup by an agent is planned. Besides duplicated logic within one part, the agent should look explicitly for code that the extension (`src/`) and the webview (`webview-src/`) each implement on their own, and move it to `shared/`, which both use; for example the rules where an element or attribute may be placed, which both sides check (see [Architecture](architecture.md#principles)), and the top-level lookups in `DiagramBuilder` and `DropCommandFactory`. Functions that read schema objects move into `shared/` only with the move to `xmlbind-ts` 3 ([ADR 006](architecture/006-module-structure.md#schema-objects-on-both-sides)). The structure review [#448](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/448) removed the dead code it found in the diagram, and moved the built-in types, the facets and the functions on QNames and namespace prefixes, which both sides had written down on their own, into `shared/` (`builtInTypes.ts`, `facets.ts`, `qNames.ts`).

- **GitHub issue:** none

## Complex types with simple content cannot be created or derived

- **Location:** `shared/commands/complexType.ts` (`AddComplexTypePayload`, `ModifyComplexTypePayload`), `src/commandValidators/complexTypeValidators.ts` (`validateModifyComplexType()`), `src/commandExecutors/complexTypeExecutors.ts`
- **Severity:** Low
- **Effort:** L
- **Description:** A complex type with `xs:simpleContent` has text content of a simple type plus attributes, for example a price with a currency. The complex type commands only know complex content: `addComplexType` requires a `contentModel` and always creates a compositor, and the executor only builds `complexContent`, so a `baseType` or `contentModel` for a type with simple content would add a `complexContent` next to the `simpleContent`, which is invalid. `modifyComplexType` therefore rejects `baseType`, `derivationKind` and `contentModel` for such types (see [Commands](commands.md#complex-types)). Such types can be shown and renamed, and their documentation can be edited, but a type with simple content cannot be created, its base type and derivation cannot be changed, and an existing type cannot be switched between simple and complex content. A related problem is the [mixed content toggle](#mixed-content-toggle-ignores-simple-content-complexcontent-and-the-base-type). The fix needs a way to choose simple content in the payloads, for example a content kind, and an executor that builds `simpleContent` with an `extension` or `restriction` of a simple base type.
- **GitHub issue:** none

## Identity constraints, notations and redefines cannot be shown or edited

- **Location:** `shared/commands/`, `src/commandValidators/`, `src/commandExecutors/`, `webview-src/diagram/DiagramBuilder.ts`, `webview-src/propertiesPanel/`
- **Severity:** Low
- **Effort:** L
- **Description:** Identity constraints (`xs:key`, `xs:keyref`, `xs:unique` with their `selector` and `field`s), `xs:notation` and `xs:redefine` are in the schema classes, but there are no commands for them, the diagram does not show them, and the properties panel has no fields for them (see [Diagram rendering](diagram-rendering.md#from-schema-to-diagram-items)). They can only be edited in the text editor; other edits keep them unchanged. Renaming or removing an element does not update the selectors, fields or `refer` values that point to it. All three are rare: in a GitHub code search (October 2026, `xs:` prefix only, approximate counts), `xs:unique` appeared in about 6% as many XSD files as `xs:complexType`, `xs:redefine`, `xs:key` and `xs:keyref` in 1 to 2%, and `xs:notation` in 0.2%. `redefine` is also deprecated in XSD 1.1. Because they are kept unchanged and are rarely used, full editing support is not planned for now; showing them read-only would be a smaller first step.
- **GitHub issue:** none

## Diagram is rebuilt in full on every change

- **Location:** `webview-src/canvas/DiagramCanvas.ts` (`render()`, `draw()`), `webview-src/main.ts` (`updateSchema`, `updateDiagramOptions`), `webview-src/diagram/DiagramLayout.ts`
- **Severity:** Low
- **Effort:** L
- **Description:** Every change redraws the whole diagram. Each `updateSchema` builds all diagram items from the schema object again, calculates the layout of every item and replaces all SVG content, even if the edit changed a single attribute. Changing a diagram option does the same, although the options are only applied after the build and would need only a new layout. Expanding or collapsing a node keeps the items but calculates the layout of all items and redraws the whole SVG. For large schemas this probably makes editing slow; this was not measured. Smaller improvements are to only lay out and draw again for option changes and, for expanding and collapsing, to lay out only the item and its ancestors; real incremental updates would need the [ambiguous node IDs](#node-ids-are-ambiguous-and-have-many-special-cases) fixed first, so that items can be matched across builds (see [Diagram rendering](diagram-rendering.md#pipeline)).
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
