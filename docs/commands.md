---
type: Reference
title: Commands
description: The edit commands - payload fields, the rules the validators enforce, what the executors change in the schema, and where the webview sends them.
tags: [commands, payload, validation, reference]
status: stable
generated: { by: human:neumaennl, at: 2026-10-09T13:20:00Z }
verified: { by: human:neumaennl, at: 2026-10-09T14:03:31Z }
sources:
  - id: commands
    resource: ../shared/commands/index.ts
    title: Command types (SchemaCommand union)
  - id: element
    resource: ../shared/commands/element.ts
    title: Element commands
  - id: attribute
    resource: ../shared/commands/attribute.ts
    title: Attribute commands
  - id: schema-types
    resource: ../shared/commands/schemaTypes.ts
    title: Simple and complex type commands
  - id: group
    resource: ../shared/commands/group.ts
    title: Group and attribute group commands
  - id: metadata
    resource: ../shared/commands/metadata.ts
    title: Annotation and documentation commands
  - id: module
    resource: ../shared/commands/module.ts
    title: Import, include and namespace commands
  - id: validators
    resource: ../src/commandValidators/
    title: Command validators
  - id: executors
    resource: ../src/commandExecutors/
    title: Command executors
  - id: drop-factory
    resource: ../webview-src/drop/DropCommandFactory.ts
    title: DropCommandFactory
---

# Purpose

This reference describes every edit command: its payload, the rules that the validator checks before the command is applied, and what the executor changes in the schema. How a command travels from the webview to the extension is described in [Messaging](messaging.md#commands), how it is applied to the document in [Persistence](persistence.md#command-pipeline), and the node IDs in the payloads in [Schema model](schema-model.md#node-ids).

# Conventions

- **Three verbs.** Each construct has `add*`, `remove*` and `modify*` commands. `add*` names its parent (`parentId`, `targetId`), `remove*` and `modify*` name the node itself (`elementId`, `typeId`, …).
- **Partial updates.** `modify*` payloads have only one required field, the ID. Fields that are omitted stay unchanged. What an empty string does depends on the field and is noted below.
- **Name or reference.** Elements, attributes, groups and attribute groups are either declared with a name or refer to a top-level declaration with `ref`. A payload uses one or the other: `ref` together with a name or type is rejected. In `modify*`, setting `ref` removes the name and type, and setting a name removes `ref`.
- **Top-level or anonymous.** `addSimpleType` and `addComplexType` create a named top-level type when `parentId` is omitted or `/schema`, and an anonymous type inside the element or attribute that `parentId` names. Anonymous types have no `typeName`. (The doc comments in `schemaTypes.ts` say "Omit or set to 'schema'"; only `/schema` works, see [Known issues](known-issues.md#node-ids-are-ambiguous-and-have-many-special-cases).)
- **Definition or reference mode.** `addGroup` and `addAttributeGroup` either define a top-level group (name, no `parentId`) or add a reference to one (`ref` and `parentId`).
- **Occurrences.** `minOccurs` is a non-negative integer, `maxOccurs` a non-negative integer or `"unbounded"`, and `minOccurs` must not exceed `maxOccurs`. They are written only when given, and never on top-level elements.
- **Names.** Names and `ref` values must match `isValidXmlName()`: an ASCII letter or `_`, then letters, digits, `_`, `-` or `.`. Prefixed references such as `tns:Address` are rejected (see [Known issues](known-issues.md#name-validation-is-ascii-only-and-rejects-prefixed-references)).
- **Types.** A type name (`elementType`, `baseType`, `listItemType`, union members) is accepted if it is a built-in XSD type with any prefix, a type defined in the schema, a type whose prefix belongs to an import, or any valid name if the schema has an include. Attribute types are not checked.
- **`documentation` field.** Most add and modify payloads have an optional `documentation` string. `add*` writes it only if it is not empty. `modify*` replaces *all* documentation entries of the node with one entry containing the string, even if it is empty; it does not remove the annotation. To edit single entries, use the [documentation commands](#annotations-and-documentation).
- **Insertion.** New nodes are appended to the end of their parent.
- **Removal.** Removing a group, attribute group or import is rejected while it is still referenced. Removing an element, attribute or type is not checked and can leave references that point nowhere.

# Overview

"Sent by" names where the webview creates the command; commands without an entry are implemented and tested in the extension host, but no UI sends them yet. "Palette drop" means `DropCommandFactory` in `webview-src/drop/`, "Property panel" the files in `webview-src/propertyPanel/`.

| Area (file in `shared/commands/`) | Command | ID in payload | Sent by |
|---|---|---|---|
| Elements (`element.ts`) | `addElement` | `parentId` | Palette drop |
| | `removeElement` | `elementId` | Property panel (delete) |
| | `modifyElement` | `elementId` | Property panel |
| Attributes (`attribute.ts`) | `addAttribute` | `parentId` | Palette drop |
| | `removeAttribute` | `attributeId` | - |
| | `modifyAttribute` | `attributeId` | - |
| Types (`schemaTypes.ts`) | `addSimpleType` | `parentId?` | Palette drop |
| | `removeSimpleType` | `typeId` | Property panel (delete) |
| | `modifySimpleType` | `typeId` | Property panel, palette drop |
| | `addComplexType` | `parentId?` | Palette drop |
| | `removeComplexType` | `typeId` | Property panel (delete) |
| | `modifyComplexType` | `typeId` | Property panel, palette drop |
| Groups (`group.ts`) | `addGroup` | `parentId?` | Palette drop |
| | `removeGroup` | `groupId` | Property panel (delete) |
| | `modifyGroup` | `groupId` | Property panel, palette drop |
| | `addAttributeGroup` | `parentId?` | - |
| | `removeAttributeGroup` | `groupId` | - |
| | `modifyAttributeGroup` | `groupId` | - |
| Annotations (`metadata.ts`) | `addAnnotation` | `targetId` | Property panel (documentation) |
| | `removeAnnotation` | `annotationId` | Property panel (documentation) |
| | `modifyAnnotation` | `annotationId` | - |
| | `addDocumentation` | `targetId` | Property panel (documentation) |
| | `removeDocumentation` | `documentationId` | Property panel (documentation) |
| | `modifyDocumentation` | `documentationId` | Property panel (documentation) |
| Schema (`module.ts`) | `addImport` | none | - |
| | `removeImport` | `importId` | - |
| | `modifyImport` | `importId` | - |
| | `addInclude` | none | - |
| | `removeInclude` | `includeId` | - |
| | `modifyInclude` | `includeId` | - |
| | `modifySchemaNamespaces` | none | Property panel (namespaces) |

A drop on an existing type or group creates a `modify*` command instead of an `add*` command; for example, a compositor dropped on a complex type, or on an element with an anonymous complex type, becomes `modifyComplexType` with a new content model (see [Drag and drop](drag-and-drop.md)).[^drop-factory] That attributes can only be added is listed in [Known issues](known-issues.md#attribute-editing-is-half-implemented).

# Elements

`addElement`, `removeElement` and `modifyElement` are defined in `element.ts`.[^element]

| Field | add | modify | Meaning and rules |
|---|---|---|---|
| `parentId` / `elementId` | required | required | Parent: the schema, a `sequence`, `choice` or `all`. |
| `elementName` | name or `ref` | optional | Must be unique among the siblings when added. |
| `elementType` | optional | optional | Must be a known type (see [Conventions](#conventions)). Omit it to give the element an anonymous type later with `addSimpleType` or `addComplexType`. Setting it removes an anonymous type. |
| `ref` | name or `ref` | optional | Name of a top-level element. Not allowed directly under the schema. |
| `minOccurs`, `maxOccurs` | optional | optional | Ignored for top-level elements. |
| `documentation` | optional | optional | See [Conventions](#conventions). |
| `nillable` | - | optional | |
| `abstract` | - | optional | Only applied to top-level elements. |
| `default_`, `fixed` | - | optional | An empty string removes the attribute. |

`removeElement` takes only `elementId`. Renaming a top-level element also renames the `ref` and `substitutionGroup` values that point to it. Renames do not check for an existing element with the new name (see [Known issues](known-issues.md#renames-do-not-check-for-duplicate-names)).[^validators][^executors]

# Attributes

`addAttribute`, `removeAttribute` and `modifyAttribute` are defined in `attribute.ts`.[^attribute]

| Field | add | modify | Meaning and rules |
|---|---|---|---|
| `parentId` / `attributeId` | required | required | Parent: the schema or a complex type (top-level or anonymous). |
| `attributeName` | name or `ref` | optional | Must be unique within the parent when added. |
| `attributeType` | optional | optional | Not checked. |
| `ref` | name or `ref` | optional | Name of a top-level attribute. Not allowed directly under the schema. |
| `required` | optional | optional | Written as `use="required"` or `use="optional"`, only on attributes inside a complex type. |
| `defaultValue`, `fixedValue` | optional | optional | Not both, and not with `ref`. In `modify*`, setting one removes the other; an empty string is written as an empty value. |
| `documentation` | optional | optional | See [Conventions](#conventions). |

`removeAttribute` takes only `attributeId`.[^validators][^executors]

# Simple types

`addSimpleType`, `removeSimpleType` and `modifySimpleType` are defined in `schemaTypes.ts`.[^schema-types]

| Field | add | modify | Meaning and rules |
|---|---|---|---|
| `parentId` / `typeId` | optional | required | Parent for an anonymous type: an element or attribute without `ref` and without an anonymous type. |
| `typeName` | top-level only | top-level only | Must be unique when added. Renaming updates all unprefixed and target-namespace references in the schema. |
| `baseType` | restriction | restriction | Base of a restriction. |
| `restrictions` | restriction | restriction | Facets, see [Restriction facets](#restriction-facets). |
| `listItemType` | list | list | Item type of a list. |
| `unionMemberTypes` | union | union | Member types of a union; not empty, no empty entries. |
| `documentation` | optional | optional | See [Conventions](#conventions). |

The fields decide the kind of the body (`SimpleTypeDerivationKind`): `baseType` or `restrictions` make a restriction, `listItemType` a list, `unionMemberTypes` a union. Exactly one kind is allowed. `addSimpleType` needs a body. In `modifySimpleType`, body fields replace the body, also with another kind; without body fields, the body stays as it is. `restrictions` always need `baseType` in the same payload, even if the type already is a restriction ("Base type cannot be empty"). `modifySimpleType` accepts a `typeName` for an anonymous type and ignores it (see [Known issues](known-issues.md#modifysimpletype-skips-part-of-its-validation)).

Creating an anonymous simple type removes the `type` attribute and an anonymous complex type of its element. `removeSimpleType` takes only `typeId` and does not check whether the type is still used (see [Known issues](known-issues.md#removing-a-simple-or-complex-type-does-not-check-for-references)).[^validators][^executors]

## Restriction facets

`RestrictionFacets` has 12 optional fields:

| Facet | Type |
|---|---|
| `minInclusive`, `maxInclusive`, `minExclusive`, `maxExclusive` | string |
| `length`, `minLength`, `maxLength`, `totalDigits`, `fractionDigits` | number |
| `pattern` | string (one pattern) |
| `enumeration` | string[] (one `xs:enumeration` per value) |
| `whiteSpace` | `"preserve"`, `"replace"` or `"collapse"` |

A restriction without `restrictions` has no facets, which XSD allows. If `restrictions` is given, it must contain at least one facet ("Restriction simpleType body must include at least one facet"). `restrictions` always replaces all facets: facets that are not in the payload are removed, so a client must send the complete set. A type with several `xs:pattern` facets keeps only the one that is sent (see [Known issues](known-issues.md#editing-facets-drops-all-but-the-first-pattern)). Facets are not checked against the base type; `maxLength` on `xs:integer` or `minLength` greater than `maxLength` are accepted (see [Known issues](known-issues.md#facets-are-not-checked-against-the-base-type)).[^executors]

# Complex types

`addComplexType`, `removeComplexType` and `modifyComplexType` are defined in `schemaTypes.ts`.[^schema-types]

| Field | add | modify | Meaning and rules |
|---|---|---|---|
| `parentId` / `typeId` | optional | required | Parent for an anonymous type: an element without `ref` and without an anonymous type. |
| `typeName` | top-level only | top-level only | Must be unique when added. Renaming updates references like `modifySimpleType`. |
| `contentModel` | required | optional | `sequence`, `choice` or `all` (`ContentModel`). Changing it replaces the compositor and moves its particles into the new one. |
| `baseType` | optional | optional | Wraps the compositor in `complexContent` with an `extension` or `restriction` of this type. |
| `derivationKind` | optional | optional | `extension` (default) or `restriction` (`ComplexTypeDerivationKind`). |
| `mixed` | optional | optional | |
| `abstract` | optional | optional | Only applied to top-level types. |
| `documentation` | optional | optional | See [Conventions](#conventions). |

Creating an anonymous complex type removes the `type` attribute and an anonymous simple type of its element. `removeComplexType` takes only `typeId` and does not check whether the type is still used.[^validators][^executors]

# Groups

`addGroup`, `removeGroup` and `modifyGroup` are defined in `group.ts`.[^group] `addGroup` has two modes:

| Mode | Fields | Rules |
|---|---|---|
| Definition | `groupName`, `contentModel`, `documentation?` | Top-level; the name must be unique. `parentId` and occurrences are not allowed. |
| Reference | `ref`, `parentId`, `minOccurs?`, `maxOccurs?`, `documentation?` | `ref` must name a group definition. Parent: a `sequence`, a `choice`, or a complex type that has no particle yet. |

`groupId` in `removeGroup` and `modifyGroup` can name three kinds of node, and `modifyGroup` accepts different fields for each:

| `groupId` | Example | `modifyGroup` fields |
|---|---|---|
| Group definition | `/group:Address` | `groupName`, `contentModel`, `documentation`. Renaming updates the references. |
| Group reference | `…/group:sequence[0]/groupRef:Address[0]` | `ref`, `minOccurs`, `maxOccurs`, `documentation` |
| Compositor | `…/group:sequence[0]` | `minOccurs`, `maxOccurs`, `documentation` |

A group definition cannot be removed while a reference points to it.[^validators][^executors]

# Attribute groups

`addAttributeGroup`, `removeAttributeGroup` and `modifyAttributeGroup` are defined in `group.ts`.[^group] They work like the group commands with fewer fields: a definition has `groupName`, a reference `ref` and `parentId` (a complex type), both can have `documentation`. `modifyAttributeGroup` changes `groupName`, `ref` or `documentation`; renaming a definition updates the references and checks for an existing attribute group with the new name. A definition cannot be removed while a reference points to it.[^validators][^executors]

# Annotations and documentation

The six commands in `metadata.ts` edit `xs:annotation` and its `xs:documentation` entries.[^metadata] The IDs follow the annotation scheme in [Schema model](schema-model.md#node-ids).

| Command | Fields | Effect |
|---|---|---|
| `addAnnotation` | `targetId`, `documentation?`, `appInfo?` | Adds an annotation to the schema (`/schema`) or replaces the annotation of a node. |
| `removeAnnotation` | `annotationId` | Removes the annotation. |
| `modifyAnnotation` | `annotationId`, `documentation?`, `appInfo?` | `documentation` replaces all documentation entries with one, `appInfo` replaces the content of the first `xs:appinfo`. |
| `addDocumentation` | `targetId`, `content`, `lang?` | Adds a documentation entry to the annotation of a node, creating the annotation if needed. `lang` becomes `xml:lang`. |
| `removeDocumentation` | `documentationId` | Removes one entry. |
| `modifyDocumentation` | `documentationId`, `content?`, `lang?` | Changes one entry; an empty `lang` removes `xml:lang`. |

The property panel uses these commands for the documentation of the selected node, not the `documentation` field of the `modify*` commands.[^validators][^executors]

# Imports, includes and namespaces

The commands in `module.ts` change the schema root.[^module] They have no parent ID; imports and includes are addressed by position (`/import[0]`, `/include[0]`).

| Command | Fields | Rules and effect |
|---|---|---|
| `addImport` | `namespace`, `schemaLocation`, `prefix?` | `namespace` must be an absolute URI without an existing import, `schemaLocation` must not contain whitespace. The prefix must be a valid, unused, non-reserved name; if it is omitted, the executor generates `ns0`, `ns1`, …, and binds it to the namespace. |
| `removeImport` | `importId` | Rejected while a QName still uses a prefix of the namespace. Removes the prefix bindings of the namespace. |
| `modifyImport` | `importId`, `namespace?`, `schemaLocation?`, `oldPrefix?`, `prefix?` | `prefix` with `oldPrefix` renames the binding and rewrites all QNames that use it. `prefix` alone adds another binding for the namespace. `oldPrefix` requires `prefix`. |
| `addInclude` | `schemaLocation` | No other include with the same location. |
| `removeInclude` | `includeId` | |
| `modifyInclude` | `includeId`, `schemaLocation` | Replaces the location. |
| `modifySchemaNamespaces` | `targetNamespace?`, `namespacePrefixes`, `previousNamespacePrefixes?` | `namespacePrefixes` is the complete prefix map; prefixes not in it are removed. `targetNamespace` must be one of the URIs in the map; an empty string removes it. With `previousNamespacePrefixes`, a prefix whose URI did not change but whose name did is treated as a rename, and the QNames are rewritten. Removing a prefix that QNames still use is not checked (see [Known issues](known-issues.md#removing-a-namespace-prefix-does-not-check-for-references)). |

# Example

A top-level simple type for German postal codes, created and then changed. The webview sends each command as `data` of an `executeCommand` message (see [Messaging](messaging.md#example)).

```json
{
  "type": "addSimpleType",
  "payload": {
    "typeName": "PostalCode",
    "baseType": "xs:string",
    "restrictions": { "pattern": "[0-9]{5}", "maxLength": 5 }
  }
}
```

The executor appends to the schema:

```xml
<simpleType name="PostalCode">
  <restriction base="xs:string">
    <maxLength value="5"/>
    <pattern value="[0-9]{5}"/>
  </restriction>
</simpleType>
```

To allow leading letters, the client sends the base type and the complete new set of facets. `maxLength` is not in the payload, so it is removed:

```json
{
  "type": "modifySimpleType",
  "payload": {
    "typeId": "/simpleType:PostalCode",
    "baseType": "xs:string",
    "restrictions": { "pattern": "[A-Z]{0,2}[0-9]{5}" }
  }
}
```

The element prefix `xs:` is missing in the output because serialization drops it (see [Persistence](persistence.md#what-serialization-changes)).

# Files

| File | Content |
|---|---|
| `shared/commands/base.ts` | `BaseCommand` and `CommandResponse` |
| `shared/commands/element.ts`, `attribute.ts`, `schemaTypes.ts`, `group.ts`, `metadata.ts`, `module.ts` | Payloads and command types, one file per area |
| `shared/commands/index.ts` | Re-exports the areas and defines the `SchemaCommand` union |
| `shared/messages.ts` | The messages that carry the commands (see [Messaging](messaging.md)) |
| `shared/types.ts` | Re-exports the generated classes, the commands and the messages |
| `src/commandValidators/` | One validator per command, grouped by area, and `validationUtils.ts` |
| `src/commandExecutors/` | One executor per command, grouped by area, and the shared rename and prefix helpers (`schemaLocalRenamer.ts`, `schemaQNameRewriter.ts`, `schemaPrefixChecker.ts`) |

Each command type has a string literal as `type`, so `SchemaCommand` is a discriminated union: a `switch` on `command.type` narrows the payload to the right type. The type tests in `shared/__tests__/commands/` check that the payloads accept the intended fields; the behaviour is tested next to the validators and executors.[^commands]

**Adding a command** touches these places:

1. Payload and command type in the matching file in `shared/commands/`, and the command in the `SchemaCommand` union in `shared/commands/index.ts`.
2. A validator in `src/commandValidators/` and its case in `src/commandValidator.ts`.
3. An executor in `src/commandExecutors/` and its case in `src/commandExecutor.ts`.
4. The place in `webview-src/` that creates and sends the command.
5. Tests for the validator and the executor next to them, and a pipeline test in `src/__tests__/` if the command needs one.
6. A row in the [Overview](#overview) and a section in this reference.

The switches in `commandValidator.ts` and `commandExecutor.ts` have one case per command type and a `default` branch, so TypeScript does not report a missing case. A command missing in the validator fails validation with "Unknown command type", one missing in the executor fails at runtime with the same message.

[^commands]: [Command types](../shared/commands/index.ts)

[^element]: [Element commands](../shared/commands/element.ts)

[^attribute]: [Attribute commands](../shared/commands/attribute.ts)

[^schema-types]: [Simple and complex type commands](../shared/commands/schemaTypes.ts)

[^group]: [Group and attribute group commands](../shared/commands/group.ts)

[^metadata]: [Annotation and documentation commands](../shared/commands/metadata.ts)

[^module]: [Import, include and namespace commands](../shared/commands/module.ts)

[^validators]: [Command validators](../src/commandValidators/)

[^executors]: [Command executors](../src/commandExecutors/)

[^drop-factory]: [DropCommandFactory](../webview-src/drop/DropCommandFactory.ts)
