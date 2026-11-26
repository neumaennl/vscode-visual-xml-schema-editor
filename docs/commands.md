---
type: Reference
title: Commands
description: The edit commands - payload fields, the rules the validators enforce, what the executors change in the schema, and where the webview sends them.
tags: [commands, payload, validation, reference]
status: draft
generated: { by: human:neumaennl, at: 2026-11-25T14:29:17Z }
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
  - id: simple-type
    resource: ../shared/commands/simpleType.ts
    title: Simple type commands
  - id: complex-type
    resource: ../shared/commands/complexType.ts
    title: Complex type commands
  - id: group
    resource: ../shared/commands/group.ts
    title: Group commands
  - id: compositor
    resource: ../shared/commands/compositor.ts
    title: Compositor commands
  - id: attribute-group
    resource: ../shared/commands/attributeGroup.ts
    title: Attribute group commands
  - id: annotation
    resource: ../shared/commands/annotation.ts
    title: Annotation and documentation commands
  - id: schema
    resource: ../shared/commands/schema.ts
    title: Import, include and namespace commands
  - id: validators
    resource: ../src/commandValidators/
    title: Command validators
  - id: executors
    resource: ../src/commandExecutors/
    title: Command executors
  - id: drop-factory
    resource: ../webview-src/dragAndDrop/DropCommandFactory.ts
    title: DropCommandFactory
---

# Purpose

This reference describes every edit command: its payload, the rules that the validator checks before the command is applied, and what the executor changes in the schema. How a command travels from the webview to the extension is described in [Messaging](messaging.md#commands), how it is applied to the document in [Persistence](persistence.md#command-pipeline), and the node IDs in the payloads in [Schema model](schema-model.md#node-ids).

# Conventions

- **Three verbs.** Each schema construct has `add*`, `remove*` and `modify*` commands. `add*` names its parent (`parentId`, `targetId`), `remove*` and `modify*` name the node itself (`elementId`, `typeId`, …).
- **Partial updates.** `modify*` payloads have only one required field, the ID. Fields that are omitted stay unchanged. What an empty string does depends on the field and is noted below.
- **Name or reference.** Elements, attributes, groups and attribute groups are either declared with a name or refer to a top-level declaration with `ref`. A payload uses one or the other: `ref` together with a name or type is rejected. In `modify*`, setting `ref` removes the name and type, and setting a name removes `ref`.
- **Top-level or anonymous.** `addSimpleType` and `addComplexType` create a named top-level type when `parentId` is omitted or `/schema`, and an anonymous type inside the element or attribute that `parentId` names. Anonymous types have no `typeName`. (The doc comments in `simpleType.ts` and `complexType.ts` say "Omit or set to 'schema'"; only `/schema` works, see [Known issues](known-issues.md#node-ids-are-ambiguous-and-have-many-special-cases).)
- **Definition or reference mode.** `addGroup` and `addAttributeGroup` either define a top-level group (name, no `parentId`) or add a reference to one (`ref` and `parentId`).
- **Occurrences.** `minOccurs` is a non-negative integer, `maxOccurs` a non-negative integer or `"unbounded"`, and `minOccurs` must not exceed `maxOccurs`. They are written only when given, and never on top-level elements. XML Schema 1.0 restricts them for an `all` to `minOccurs` 0 or 1 and `maxOccurs` 1, and for the elements in an `all` to 0 or 1 each.
- **Names.** Names must match `isValidXmlName()` in `shared/qNames.ts`: an ASCII letter or `_`, then letters, digits, `_`, `-` or `.` (see [Known issues](known-issues.md#name-validation-is-ascii-only)). A `ref` is a QName whose prefix and local name each match it. It must name a top-level component of the schema itself, so it must resolve to the target namespace with the namespace declarations of the schema: with a prefix declared for the target namespace, such as `tns:Address`, or without a prefix if the default namespace is the target namespace, or if the schema has neither. Renames, the check for references before a removal, the constraints of XML Schema and the validation of `ref` all resolve references this way (`localNameIfInTargetNamespace()` in `shared/qNames.ts`).
- **Types.** A type name (`elementType`, `baseType`, `listItemType`, union members) is accepted if it is a built-in XSD type with any prefix, a type defined in the schema, a type whose prefix belongs to an import, or any valid name if the schema has an include. Attribute types are not checked.
- **`documentation` field.** Most add payloads have an optional `documentation` string, which becomes the first documentation entry of the new node if it is not empty. The modify payloads have none: documentation entries are changed one by one with the [documentation commands](#annotations-and-documentation), which keep the other entries and their languages.
- **Insertion.** New nodes are appended to the end of their parent.
- **Validator and executor.** The validator checks everything the executor relies on, and the executor does not check it again. Where the executor assumes something, it fails with an error such as "Element person not found, although the validator accepted the command" if the assumption does not hold ([ADR 003](architecture/003-validators-check-executors-assume.md)).
- **Constraints on the result.** Besides its validator, every command is checked on its result: it is rejected if the schema would newly violate one of these constraints of XML Schema ([ADR 003](architecture/003-validators-check-executors-assume.md)):
  - Elements with the same name in the content model of a complex type, including its nested compositors, referenced groups and the content of an extended base type, have the same type. So a sequence `a, b, a` is allowed if both `a` have the same type.
  - A complex type, including its attribute groups and an extended base type, and an attribute group have each attribute only once.
  - A group definition whose compositor is an `all` is only referenced as the whole content of a complex type, with `minOccurs` 0 or 1 and `maxOccurs` 1, not in a sequence or a choice.
  - Unique Particle Attribution is not checked yet (see [Known issues](known-issues.md#unique-particle-attribution-is-not-checked)).
- **Removal.** Removing a group, attribute group or import is rejected while it is still referenced, however the reference is written. Removing an element, attribute or type is not checked and can leave references that point nowhere.

# Overview

"Sent by" names where the webview creates the command; commands without an entry are implemented and tested in the extension host, but no UI sends them yet. "Palette drop" means `DropCommandFactory` in `webview-src/dragAndDrop/`, "Properties panel" the files in `webview-src/propertiesPanel/`.

| Area (file in `shared/commands/`)      | Command                  | ID in payload     | Sent by                          |
| -------------------------------------- | ------------------------ | ----------------- | -------------------------------- |
| Elements (`element.ts`)                | `addElement`             | `parentId`        | Palette drop                     |
|                                        | `removeElement`          | `elementId`       | Properties panel (delete)        |
|                                        | `modifyElement`          | `elementId`       | Properties panel                 |
| Attributes (`attribute.ts`)            | `addAttribute`           | `parentId`        | Palette drop                     |
|                                        | `removeAttribute`        | `attributeId`     | -                                |
|                                        | `modifyAttribute`        | `attributeId`     | -                                |
| Simple types (`simpleType.ts`)         | `addSimpleType`          | `parentId?`       | Palette drop                     |
|                                        | `removeSimpleType`       | `typeId`          | Properties panel (delete)        |
|                                        | `modifySimpleType`       | `typeId`          | Properties panel, palette drop   |
| Complex types (`complexType.ts`)       | `addComplexType`         | `parentId?`       | Palette drop                     |
|                                        | `removeComplexType`      | `typeId`          | Properties panel (delete)        |
|                                        | `modifyComplexType`      | `typeId`          | Properties panel, palette drop   |
| Groups (`group.ts`)                    | `addGroup`               | `parentId?`       | Palette drop                     |
|                                        | `removeGroup`            | `groupId`         | Properties panel (delete)        |
|                                        | `modifyGroup`            | `groupId`         | Properties panel, palette drop   |
| Compositors (`compositor.ts`)          | `addCompositor`          | `parentId`        | Palette drop                     |
|                                        | `removeCompositor`       | `compositorId`    | Properties panel (delete)        |
|                                        | `modifyCompositor`       | `compositorId`    | Properties panel                 |
| Attribute groups (`attributeGroup.ts`) | `addAttributeGroup`      | `parentId?`       | -                                |
|                                        | `removeAttributeGroup`   | `groupId`         | -                                |
|                                        | `modifyAttributeGroup`   | `groupId`         | -                                |
| Annotations (`annotation.ts`)          | `addAnnotation`          | `targetId`        | Properties panel (documentation) |
|                                        | `removeAnnotation`       | `annotationId`    | Properties panel (documentation) |
|                                        | `modifyAnnotation`       | `annotationId`    | -                                |
|                                        | `addDocumentation`       | `targetId`        | Properties panel (documentation) |
|                                        | `removeDocumentation`    | `documentationId` | Properties panel (documentation) |
|                                        | `modifyDocumentation`    | `documentationId` | Properties panel (documentation) |
| Schema (`schema.ts`)                   | `addImport`              | none              | -                                |
|                                        | `removeImport`           | `importId`        | -                                |
|                                        | `modifyImport`           | `importId`        | -                                |
|                                        | `addInclude`             | none              | -                                |
|                                        | `removeInclude`          | `includeId`       | -                                |
|                                        | `modifyInclude`          | `includeId`       | -                                |
|                                        | `modifySchemaNamespaces` | none              | Properties panel (namespaces)    |

A drop on an existing type or group creates a `modify*` command instead of an `add*` command; for example, a compositor dropped on a complex type, or on an element with an anonymous complex type, becomes `modifyComplexType` with a new compositor (see [Drag and drop](drag-and-drop.md)).[^drop-factory] That attributes can only be added is listed in [Known issues](known-issues.md#attribute-editing-is-half-implemented).

# Elements

`addElement`, `removeElement` and `modifyElement` are defined in `element.ts`.[^element]

| Field                    | add           | modify   | Meaning and rules                                                                                                                                                                           |
| ------------------------ | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parentId` / `elementId` | required      | required | Parent: the schema, a `sequence`, `choice` or `all`.                                                                                                                                        |
| `elementName`            | name or `ref` | optional | A top-level element needs a name that no other top-level element has, also when renamed. Local elements may share a name (see [Conventions](#conventions)).                                 |
| `elementType`            | optional      | optional | Must be a known type (see [Conventions](#conventions)). Omit it to give the element an anonymous type later with `addSimpleType` or `addComplexType`. Setting it removes an anonymous type. |
| `ref`                    | name or `ref` | optional | Name of a top-level element. Not allowed directly under the schema.                                                                                                                         |
| `minOccurs`, `maxOccurs` | optional      | optional | Ignored for top-level elements.                                                                                                                                                             |
| `documentation`          | optional      | —        | See [Conventions](#conventions).                                                                                                                                                            |
| `nillable`               | -             | optional |                                                                                                                                                                                             |
| `abstract`               | -             | optional | Only applied to top-level elements.                                                                                                                                                         |
| `default_`, `fixed`      | -             | optional | Not both, and not on a reference. Setting one removes the other; an empty string removes the attribute. Turning an element into a reference also removes `default`, `fixed` and `nillable`. |

`removeElement` takes only `elementId`. Renaming a top-level element also renames the `ref` and `substitutionGroup` values that point to it.[^validators][^executors]

# Attributes

`addAttribute`, `removeAttribute` and `modifyAttribute` are defined in `attribute.ts`.[^attribute]

| Field                        | add           | modify   | Meaning and rules                                                                                                                                                                                    |
| ---------------------------- | ------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parentId` / `attributeId`   | required      | required | Parent: the schema or a complex type (top-level or anonymous). In a complex type with `xs:complexContent` or `xs:simpleContent`, the attributes are those of its `xs:extension` or `xs:restriction`. |
| `attributeName`              | name or `ref` | optional | A top-level attribute needs a name that no other top-level attribute has, also when renamed. For local attributes, see [Conventions](#conventions).                                                  |
| `attributeType`              | optional      | optional | Not checked.                                                                                                                                                                                         |
| `ref`                        | name or `ref` | optional | Name of a top-level attribute. Not allowed directly under the schema.                                                                                                                                |
| `required`                   | optional      | optional | Written as `use="required"` or `use="optional"`, only on attributes inside a complex type.                                                                                                           |
| `defaultValue`, `fixedValue` | optional      | optional | Not both, and not with `ref`. In `modify*`, setting one removes the other; an empty string is written as an empty value.                                                                             |
| `documentation`              | optional      | —        | See [Conventions](#conventions).                                                                                                                                                                     |

`removeAttribute` takes only `attributeId`.[^validators][^executors]

New attributes and attribute group references (`addAttributeGroup`) are written before an existing `xs:anyAttribute`, as XML Schema requires. One case is accepted although it makes the schema invalid, for attributes and for attribute group references: an attribute in an `xs:restriction` is not checked against the attributes of the base type (see [Known issues](known-issues.md#attributes-in-a-restriction-are-not-checked-against-the-base-type)).

# Simple types

`addSimpleType`, `removeSimpleType` and `modifySimpleType` are defined in `simpleType.ts`.[^simple-type]

| Field                 | add            | modify         | Meaning and rules                                                                                                                                                             |
| --------------------- | -------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parentId` / `typeId` | optional       | required       | Parent for an anonymous type: an element or attribute without `ref` and without an anonymous type.                                                                            |
| `typeName`            | top-level only | top-level only | Must be unique among the simple and complex types, which share their names, also when renamed. Renaming updates all unprefixed and target-namespace references in the schema. |
| `baseType`            | restriction    | restriction    | Base of a restriction.                                                                                                                                                        |
| `restrictions`        | restriction    | restriction    | Facets, see [Restriction facets](#restriction-facets).                                                                                                                        |
| `listItemType`        | list           | list           | Item type of a list.                                                                                                                                                          |
| `unionMemberTypes`    | union          | union          | Member types of a union; not empty, no empty entries.                                                                                                                         |
| `documentation`       | optional       | —              | See [Conventions](#conventions).                                                                                                                                              |

The fields decide the kind of the body (`SimpleTypeDerivationKind`): `baseType` or `restrictions` make a restriction, `listItemType` a list, `unionMemberTypes` a union. Exactly one kind is allowed. `addSimpleType` needs a body. In `modifySimpleType`, body fields replace the body, also with another kind; without body fields, the body stays as it is. `restrictions` without `baseType` change only the facets of an existing restriction, which keeps its base, also an inline simple type; a list, a union or a new type needs `baseType` ("Cannot apply restrictions without a base type", "Base type cannot be empty"). A `baseType` replaces the base, also an inline simple type. `modifySimpleType` rejects a `typeName` for an anonymous type.

Creating an anonymous simple type removes the `type` attribute and an anonymous complex type of its element. `removeSimpleType` takes only `typeId` and does not check whether the type is still used (see [Known issues](known-issues.md#removing-a-simple-or-complex-type-does-not-check-for-references)).[^validators][^executors]

## Restriction facets

`RestrictionFacets` has 12 optional fields:

| Facet                                                               | Type                                                                              |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `minInclusive`, `maxInclusive`, `minExclusive`, `maxExclusive`      | string                                                                            |
| `length`, `minLength`, `maxLength`, `totalDigits`, `fractionDigits` | number                                                                            |
| `pattern`                                                           | string[] (one `xs:pattern` per value; a value of the type must match one of them) |
| `enumeration`                                                       | string[] (one `xs:enumeration` per value)                                         |
| `whiteSpace`                                                        | `"preserve"`, `"replace"` or `"collapse"`                                         |

A restriction without `restrictions` has no facets, which XSD allows. If `restrictions` is given, it must contain at least one facet ("Restriction simpleType body must include at least one facet"). `restrictions` always replaces all facets: facets that are not in the payload are removed, so a client must send the complete set. Facets are not checked against the base type; `maxLength` on `xs:integer` or `minLength` greater than `maxLength` are accepted (see [Known issues](known-issues.md#facets-are-not-checked-against-the-base-type)).[^executors]

# Complex types

`addComplexType`, `removeComplexType` and `modifyComplexType` are defined in `complexType.ts`.[^complex-type]

| Field                 | add            | modify         | Meaning and rules                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | -------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parentId` / `typeId` | optional       | required       | Parent for an anonymous type: an element without `ref` and without an anonymous type.                                                                                                                                                                                                                                                                                               |
| `typeName`            | top-level only | top-level only | Must be unique among the simple and complex types like in `addSimpleType`, also when renamed. Renaming updates references like `modifySimpleType`.                                                                                                                                                                                                                                  |
| `compositor`          | required       | optional       | `sequence`, `choice` or `all` (`Compositor`). Changing it replaces the compositor with one of the new kind, which takes over its particles, annotation and occurrences; an `all` only takes elements whose occurrences an `all` allows (see [Conventions](#conventions)). Rejected for a type whose particle is a group reference, because a complex type has at most one particle. |
| `baseType`            | optional       | optional       | Checked like the other type names (see [Conventions](#conventions)). Wraps the content in `complexContent` with an `extension` or `restriction` of this type: the compositor, or for a type without one, its group reference and attributes as they are. An empty string removes the base and unwraps the content.                                                                  |
| `derivationKind`      | optional       | optional       | `extension` (default) or `restriction` (`ComplexTypeDerivationKind`). Needs a base type, from the payload or the existing type ("Derivation kind requires a base type").                                                                                                                                                                                                            |
| `mixed`               | optional       | optional       |                                                                                                                                                                                                                                                                                                                                                                                     |
| `abstract`            | optional       | optional       | Only applied to top-level types.                                                                                                                                                                                                                                                                                                                                                    |
| `documentation`       | optional       | —              | See [Conventions](#conventions).                                                                                                                                                                                                                                                                                                                                                    |

The complex type commands cannot create or change simple content: for a complex type with `simpleContent`, `modifyComplexType` rejects `baseType`, `derivationKind` and `compositor` (see [Known issues](known-issues.md#complex-types-with-simple-content-cannot-be-created-or-derived)). Creating an anonymous complex type removes the `type` attribute and an anonymous simple type of its element. `removeComplexType` takes only `typeId` and does not check whether the type is still used.[^validators][^executors]

# Groups

`addGroup`, `removeGroup` and `modifyGroup` are defined in `group.ts`.[^group] `addGroup` has two modes:

| Mode       | Fields                                                          | Rules                                                                                                             |
| ---------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Definition | `groupName`, `compositor`, `documentation?`                     | Top-level; the name must be unique. `parentId` and occurrences are not allowed.                                   |
| Reference  | `ref`, `parentId`, `minOccurs?`, `maxOccurs?`, `documentation?` | `ref` must name a group definition. Parent: a `sequence`, a `choice`, or a complex type that has no particle yet. |

`groupId` in `removeGroup` and `modifyGroup` names a group definition or a group reference, and `modifyGroup` accepts different fields for each. Compositors have commands of their own (see [Compositors](#compositors)).

| `groupId`        | Example                             | `modifyGroup` fields                                                                     |
| ---------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| Group definition | `/group:Address`                    | `groupName`, `compositor`. The new name must be unique. Renaming updates the references. |
| Group reference  | `…/sequence[0]/groupRef:Address[0]` | `ref`, `minOccurs`, `maxOccurs`                                                          |

A group definition cannot be removed while a reference points to it.[^validators][^executors]

# Compositors

`addCompositor`, `removeCompositor` and `modifyCompositor` are defined in `compositor.ts`.[^compositor] The compositor that a complex type or a group definition holds directly is set and replaced through the `compositor` field of the complex type and group commands; the compositor commands handle the compositors in other compositors and the occurrences.

- `addCompositor` adds a `sequence` or a `choice` with optional occurrences to the `sequence` or `choice` that `parentId` names. XML Schema allows no `all` there and no compositor in an `all`. The new compositor comes after the compositors of its kind, so the diagram and the file can show it in a different place among the other particles (see [Known issues](known-issues.md#particles-are-not-shown-in-document-order)).
- `removeCompositor` removes the compositor that `compositorId` names, such as `…/sequence[0]`, from the complex type or the compositor that contains it. The compositor of a group definition cannot be removed, because a group definition needs one.
- `modifyCompositor` changes the kind of the compositor with `compositor`, and `minOccurs` and `maxOccurs`. The new compositor takes over the particles, the annotation and the occurrences, as when the compositor of a complex type changes (see [Complex types](#complex-types)). A compositor in another compositor cannot become an `all` and moves to the end of the compositors of its new kind. The compositor of a group definition (`/group:Address/sequence[0]`) has no occurrences in XML Schema, so they cannot be set.[^validators][^executors]

# Attribute groups

`addAttributeGroup`, `removeAttributeGroup` and `modifyAttributeGroup` are defined in `attributeGroup.ts`.[^attribute-group] They work like the group commands with fewer fields: a definition has `groupName`, a reference `ref` and `parentId` (a complex type or an attribute group), both can have `documentation`. Like attributes, the references of a complex type with complex or simple content are those of its extension or restriction. `modifyAttributeGroup` changes the `groupName` of a definition or the `ref` of a reference; renaming a definition updates the references and checks for an existing attribute group with the new name. A definition cannot be removed while a reference points to it.[^validators][^executors]

# Annotations and documentation

The six commands in `annotation.ts` edit `xs:annotation` and its `xs:documentation` entries.[^annotation] The IDs follow the annotation scheme in [Schema model](schema-model.md#node-ids).

| Command               | Fields                                   | Effect                                                                                                                |
| --------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `addAnnotation`       | `targetId`, `documentation?`, `appInfo?` | Adds an annotation to the schema (`/schema`) or replaces the annotation of a node.                                    |
| `removeAnnotation`    | `annotationId`                           | Removes the annotation.                                                                                               |
| `modifyAnnotation`    | `annotationId`, `appInfo?`               | `appInfo` replaces the content of the first `xs:appinfo`.                                                             |
| `addDocumentation`    | `targetId`, `content`, `lang?`           | Adds a documentation entry to the annotation of a node, creating the annotation if needed. `lang` becomes `xml:lang`. |
| `removeDocumentation` | `documentationId`                        | Removes one entry.                                                                                                    |
| `modifyDocumentation` | `documentationId`, `content?`, `lang?`   | Changes one entry; an empty `lang` removes `xml:lang`.                                                                |

A `lang` must be a value of `xs:language`, such as `en` or `de-CH`; the empty string removes `xml:lang` (`modifyDocumentation`) or adds none (`addDocumentation`). The properties panel checks its language field with the same rule. The properties panel uses these commands for the documentation of the selected node.[^validators][^executors]

# Imports, includes and namespaces

The commands in `schema.ts` change the schema root.[^schema] They have no parent ID; imports and includes are addressed by position (`/import[0]`, `/include[0]`).

| Command                  | Fields                                                                | Rules and effect                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addImport`              | `namespace`, `schemaLocation`, `prefix?`                              | `namespace` must be an absolute URI without an existing import, `schemaLocation` must not contain whitespace. The prefix must be a valid, unused, non-reserved name; if it is omitted, the executor generates `ns0`, `ns1`, …, and binds it to the namespace.                                                                                                                                                                                                          |
| `removeImport`           | `importId`                                                            | Rejected while a QName still uses a prefix of the namespace. Removes the prefix bindings of the namespace.                                                                                                                                                                                                                                                                                                                                                             |
| `modifyImport`           | `importId`, `namespace?`, `schemaLocation?`, `oldPrefix?`, `prefix?`  | `prefix` with `oldPrefix` renames the binding and rewrites all QNames that use it, also in the `xpath` of the selectors and fields of identity constraints. `prefix` alone adds another binding for the namespace. `oldPrefix` requires `prefix`. An import without a namespace cannot get a prefix.                                                                                                                                                                   |
| `addInclude`             | `schemaLocation`                                                      | No other include with the same location.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `removeInclude`          | `includeId`                                                           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `modifyInclude`          | `includeId`, `schemaLocation`                                         | Replaces the location.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `modifySchemaNamespaces` | `targetNamespace?`, `namespacePrefixes`, `previousNamespacePrefixes?` | `namespacePrefixes` is the complete prefix map; prefixes not in it are removed. `targetNamespace` must be one of the URIs in the map; an empty string removes it. With `previousNamespacePrefixes`, a prefix whose URI did not change but whose name did is treated as a rename, and the QNames are rewritten. Removing a prefix that QNames still use is not checked (see [Known issues](known-issues.md#removing-a-namespace-prefix-does-not-check-for-references)). |

# Example

A top-level simple type for German postal codes, created and then changed. The webview sends each command as `data` of an `executeCommand` message (see [Messaging](messaging.md#example)).

```json
{
  "type": "addSimpleType",
  "payload": {
    "typeName": "PostalCode",
    "baseType": "xs:string",
    "restrictions": { "pattern": ["[0-9]{5}"], "maxLength": 5 }
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

To allow leading letters, the client sends the complete new set of facets. Without `baseType`, the type keeps `xs:string`; `maxLength` is not in the payload, so it is removed:

```json
{
  "type": "modifySimpleType",
  "payload": {
    "typeId": "/simpleType:PostalCode",
    "restrictions": { "pattern": ["[A-Z]{0,2}[0-9]{5}"] }
  }
}
```

The element prefix `xs:` is missing in the output because serialization drops it (see [Persistence](persistence.md#what-serialization-changes)).

# Files

| File                                                                                                                                           | Content                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/commands/base.ts`                                                                                                                      | `BaseCommand`                                                                                                                                                                                                                                                                                                                                                       |
| `shared/commands/element.ts`, `attribute.ts`, `simpleType.ts`, `complexType.ts`, `group.ts`, `attributeGroup.ts`, `annotation.ts`, `schema.ts` | Payloads, command types and the union of the commands of each kind of component, such as `ElementCommand`, one file per kind, named like the modules of the validators and executors                                                                                                                                                                                |
| `shared/commands/index.ts`                                                                                                                     | Re-exports the areas and defines the `SchemaCommand` union, which combines the unions of the areas                                                                                                                                                                                                                                                                  |
| `shared/messages.ts`                                                                                                                           | The messages that carry the commands, and `CommandResponse`, the result of a command (see [Messaging](messaging.md))                                                                                                                                                                                                                                                |
| `shared/types.ts`                                                                                                                              | Re-exports the generated classes, the commands and the messages                                                                                                                                                                                                                                                                                                     |
| `src/commandHandlers.ts`                                                                                                                       | `findCommandHandler()`, which finds the validator or executor of a command by its name                                                                                                                                                                                                                                                                              |
| `src/commandValidators/`                                                                                                                       | One validator per command, grouped by area; the checks that validators of several areas share in `commonValidators.ts`, and `validationUtils.ts`. The checks of single values, which the properties panel uses too, are in `shared/`: `validation.ts` (the result type), `qNames.ts` (names, prefixes, URIs), `typeReferences.ts`, `occurrences.ts` and `facets.ts` |
| `src/commandExecutors/`                                                                                                                        | One executor per command, grouped by area; helpers for optional properties and arrays (`nodeProperties.ts`), for anonymous and top-level types (`typeTargets.ts`) and for documentation (`annotationUtils.ts`)                                                                                                                                                      |
| `src/schemaReferences/`                                                                                                                        | The walk over every QName of the schema (`qNameReferences.ts`), the checks whether the schema refers to one of its components or uses a prefix (`referenceChecks.ts`), and the renames of references and prefixes (`referenceRewrites.ts`), which validators and executors both use                                                                                 |

Each command type has a string literal as `type`, so `SchemaCommand` is a discriminated union: a `switch` on `command.type` narrows the payload to the right type. The type tests in `shared/commands/commandTypes.test-d.ts` check the required fields, the allowed values of `maxOccurs` and that the union rejects unknown types and mismatched payloads (see [Testing](testing.md#kinds-of-tests)); the behaviour is tested next to the validators and executors.[^commands]

**Adding a command** touches these places:

1. Payload and command type in the matching file in `shared/commands/`, and the command in the union of its kind of component in that file, such as `ElementCommand`, which the `SchemaCommand` union in `shared/commands/index.ts` contains. Required fields and restricted values of the payload get cases in `commandTypes.test-d.ts`.
2. A validator `validate<Type>` in a module of `src/commandValidators/`, such as `validateAddElement` for `addElement`. `src/commandValidator.ts` takes all functions of the modules it imports; a new module is added there.
3. An executor `execute<Type>` in a module of `src/commandExecutors/`, which `src/commandExecutor.ts` takes in the same way.
4. The place in `webview-src/` that creates and sends the command.
5. Tests for the validator and the executor next to them, a pipeline test in `src/__tests__/` if the command needs one, and the command in the agreement test `test/integration/commandAgreement.test.ts`, with a schema in `src/__tests__/test-resources` that contains its node.
6. A row in the [Overview](#overview) and a section in this reference.

`ValidatorFunctions` in `commandValidator.ts` and `ExecutorFunctions` in `commandExecutor.ts` require one function per command type, named after the type, so TypeScript reports a command without a validator or an executor. `findCommandHandler()` finds the function by the name; a command of an unknown type, which only a message at runtime can contain, fails validation with "Unknown command type", and the executor throws the same message.

[^commands]: [Command types](../shared/commands/index.ts)

[^element]: [Element commands](../shared/commands/element.ts)

[^attribute]: [Attribute commands](../shared/commands/attribute.ts)

[^simple-type]: [Simple type commands](../shared/commands/simpleType.ts)

[^complex-type]: [Complex type commands](../shared/commands/complexType.ts)

[^group]: [Group commands](../shared/commands/group.ts)

[^compositor]: [Compositor commands](../shared/commands/compositor.ts)

[^attribute-group]: [Attribute group commands](../shared/commands/attributeGroup.ts)

[^annotation]: [Annotation and documentation commands](../shared/commands/annotation.ts)

[^schema]: [Import, include and namespace commands](../shared/commands/schema.ts)

[^validators]: [Command validators](../src/commandValidators/)

[^executors]: [Command executors](../src/commandExecutors/)

[^drop-factory]: [DropCommandFactory](../webview-src/dragAndDrop/DropCommandFactory.ts)
