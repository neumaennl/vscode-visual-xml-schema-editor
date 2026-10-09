---
type: Data Model
title: Schema model
description: The object model of an XSD file - classes generated from the XSD meta-schema, XML binding with xmlbind-ts, and the path-based IDs that identify schema nodes.
tags: [schema-model, data-model, xmlbind-ts, code-generation, ids, navigation]
status: stable
generated: { by: human:neumaennl, at: 2026-10-07T14:41:24Z }
verified:
  by: human:neumaennl
  at: 2026-10-08T08:46:19Z
sources:
  - id: manifest
    resource: ../package.json
    title: Extension manifest (dependencies and scripts)
  - id: meta-schema
    resource: ../schema/XMLSchema.xsd
    title: W3C XML Schema 1.0 meta-schema
  - id: generated-schema
    resource: ../shared/generated/schema.ts
    title: Generated root class schema
  - id: generated-open-attrs
    resource: ../shared/generated/openAttrs.ts
    title: Generated base class openAttrs
  - id: generated-readme
    resource: ../shared/generated/README.md
    title: Generated XML Schema classes
  - id: shared-types
    resource: ../shared/types.ts
    title: Shared type exports
  - id: schema-utils
    resource: ../shared/schemaUtils.ts
    title: Shared schema utilities
  - id: id-strategy
    resource: ../shared/idStrategy.ts
    title: ID strategy
  - id: annotation-executors
    resource: ../src/commandExecutors/annotationExecutors.ts
    title: Annotation command executors
  - id: model-manager
    resource: ../src/schemaModelManager.ts
    title: SchemaModelManager
  - id: command-processor
    resource: ../src/commandProcessor.ts
    title: CommandProcessor
  - id: webview-provider
    resource: ../src/webviewProvider.ts
    title: Custom editor provider
  - id: navigator
    resource: ../src/schemaNavigator.ts
    title: Schema navigator
  - id: schema-processors
    resource: ../webview-src/diagram/SchemaProcessors.ts
    title: Diagram schema processors
  - id: builder-helpers
    resource: ../webview-src/diagram/DiagramBuilderHelpers.ts
    title: Diagram builder helpers
  - id: schema-executors
    resource: ../src/commandExecutors/schemaExecutors.ts
    title: Schema-level command executors
---

# Purpose

The extension does not work on XML text or DOM nodes. It parses an XSD file into an object model whose classes are generated from the XSD meta-schema, changes those objects, and serializes them back to XML. Schema nodes are identified by path-based IDs, which the webview generates and the extension host resolves. This concept describes the model, the XML binding and the IDs. How commands change the model is described in [Persistence](persistence.md); how the parts fit together in [Architecture](architecture.md).

# Generated classes

The classes in `shared/generated/` are generated from the W3C XML Schema 1.0 meta-schema `schema/XMLSchema.xsd` with the `xsd2ts` generator of `@neumaennl/xmlbind-ts`. The npm script `generate-classes-from-schema` runs `xsd2ts --force -i schema/XMLSchema.xsd -o shared/generated`.[^manifest] The files must not be edited by hand; changes come from regenerating, for example after updating `xmlbind-ts`.[^generated-readme]

The generator creates one class per type and per element declaration of the meta-schema, plus `types.ts` (type aliases for built-in types such as `blockSet`), `enums.ts` (enumerations such as `formChoice`) and the barrel `index.ts`. `shared/types.ts` re-exports all generated classes together with the command and message types, so the rest of the code imports them from there.[^shared-types]

- **Decorators.** Each class carries `xmlbind-ts` decorators: `@XmlRoot` with the XSD namespace and prefixes, `@XmlElement` for child elements (with the element type and whether it is an array) and `@XmlAttribute` for attributes.[^generated-schema]
- **Class names.** The names follow the meta-schema: the root is `schema`, and the type classes are what the code mostly works with, for example `topLevelElement`, `localElement`, `topLevelComplexType`, `localComplexType`, `topLevelSimpleType`, `namedGroup`, `explicitGroup`, `namedAttributeGroup`, `attribute`, `importType` and `includeType`. Element declarations become thin subclasses (`sequence extends explicitGroup`). Names that clash with TypeScript or with each other get a suffix: `import_`, `any_`, `anyType_1`, `restrictionType_1`.
- **Inheritance.** Types derived by extension in the meta-schema become subclasses, for example of `annotated` (which adds `annotation` and `id`) and `openAttrs`. Types derived by restriction, which include most of the types above (`topLevelElement`, `localElement`, `topLevelComplexType`, `explicitGroup`, `namedGroup`), are standalone classes with all their properties, so they cannot be handled through a common base class.
- **Collections.** Repeating children are optional arrays (`element?: topLevelElement[]`). Code reads them through `toArray()` from `shared/schemaUtils.ts`, which turns `undefined`, `null`, a single item or an array into an array.[^schema-utils]

The classes also have properties that are not in the meta-schema and are filled by `xmlbind-ts`:[^generated-schema][^generated-open-attrs]

| Property | Meaning |
|---|---|
| `_namespacePrefixes` | Namespace declarations of the element, as prefix → namespace URI. On the `schema` object this is the list of prefixes used in QNames such as `type="tns:PersonType"`. |
| `_anyAttributes` | Attributes from other namespaces (`openAttrs`). |
| `_any` | Arbitrary child content, for example the content of `xs:documentation` and `xs:appinfo`. |

The executors keep `schema._namespacePrefixes` in sync with the imports: adding an import always registers a prefix (an explicit one or a generated `ns0`, `ns1`, …), and removing or changing an import removes or updates it.[^schema-executors] `getCurrentSchemaPrefixes()` returns the prefixes that map to the schema's own target namespace.[^schema-utils]

# XML binding with xmlbind-ts

`@neumaennl/xmlbind-ts` is a JAXB-like XML binding library. Two functions are used at runtime:[^model-manager]

- `unmarshal(schema, xml)` parses XML into a `schema` object, using the decorators to map elements and attributes to properties.
- `marshal(schemaObj)` serializes a `schema` object back to XML.

The binding only runs in the extension host. The webview uses the generated classes as TypeScript types only: it receives the schema as plain data through `postMessage` and does not bundle `xmlbind-ts` (see [Architecture](architecture.md)).

`unmarshal` is called in two places: in `SchemaModelManager` and directly in `SchemaEditorProvider`, which parses the document to send the schema to the webview.[^webview-provider]

# SchemaModelManager

`SchemaModelManager` holds the schema object for the command pipeline:[^model-manager]

- `loadFromXml()` unmarshals the document text; `getSchema()` and `setSchema()` read and replace the object.
- `toXml()` marshals the object.
- `cloneSchema()` creates a deep copy by marshalling and unmarshalling, so the copy is a set of real class instances with all binding metadata. `CommandProcessor` executes commands on such a copy, so a failing command leaves the original untouched.[^command-processor]
- The query methods (`findElement()`, `getAllComplexTypes()`, `getImports()` and similar) are only used in tests. They work on the schema stored in the manager, while validators and executors get a cloned schema object, and the webview cannot use code from `src/`. Validators, executors, the navigator and the webview therefore repeat these lookups themselves (see [Known issues](known-issues.md#top-level-lookups-are-duplicated-instead-of-shared)).

# Node IDs

Every schema node that the webview shows or a command targets is identified by an XPath-like ID. The format is defined in `shared/idStrategy.ts`; `generateSchemaId()` builds IDs and `parseSchemaId()` splits them into node type, name, position, namespace and parent ID.[^id-strategy] IDs are not stored in the XSD file; they are derived from the position of the node in the schema and are regenerated every time the diagram is built.

The conventions go back to the original protocol design, which was written before the editor was implemented. During implementation they were adapted and made more concrete where the design left gaps, and the scheme gained several special cases. A redesign is planned in [#348](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/348) (see [Known issues](known-issues.md#node-ids-are-ambiguous-and-have-many-special-cases)). This section describes the IDs as implemented.

## Format

An ID is a sequence of segments starting with `/`. Each segment has the form `type:name[position]`:

- `type` is a `SchemaNodeType`.
- `name` is optional. It can carry a namespace as `{namespace}name`; `/` and `:` inside the braces do not split the ID.
- `[position]` is optional and zero-based. It counts siblings of the same kind.

The schema root has the ID `/schema` (`SCHEMA_ROOT_ID`). `isSchemaRoot()` treats `undefined` and `/schema` as the root.[^schema-utils]

`SchemaNodeType` has these values: `schema`, `element`, `complexType`, `simpleType`, `group`, `groupRef`, `attributeGroup`, `attributeGroupRef`, `attribute`, `anonymousComplexType`, `anonymousSimpleType`, `import`, `include`, `annotation`, `documentation`.[^id-strategy]

## Conventions

- **Top-level components** have a name and no position: `/element:person`, `/complexType:PersonType`, `/group:PersonGroup`.
- **Compositors** use the node type `group` with the compositor as the name: `group:sequence[0]`, `group:choice[0]`, `group:all[0]`. This is how the navigator tells a compositor from a named group.[^schema-processors]
- **Anonymous types** are a segment of their own: `/element:person/anonymousComplexType[0]`. The compositor of an anonymous complex type follows it: `/element:person/anonymousComplexType[0]/group:sequence[0]`.
- **Derivation is skipped.** For a complex type with `complexContent`, the compositor of the `extension` or `restriction` is addressed as if it were a direct child of the complex type.[^navigator]
- **Local elements** have both name and position, the position counting only the elements of the same compositor: `/complexType:PersonType/group:sequence[0]/element:first[0]`. Local elements without a name get the name `unnamed`.[^schema-processors]
- **Group references** use `groupRef` with the referenced name: `…/group:sequence[0]/groupRef:SharedGroup[0]`.
- **Annotations of the schema root** have their own IDs: `/schema/annotation[0]` and `/schema/annotation[0]/documentation[1]`. The shorthand `/schema/documentation[N]` addresses the documentation entries of the first schema annotation.[^annotation-executors] For all other components, the annotation ID is the component's ID, and documentation entries are `<component ID>/documentation[N]`.[^builder-helpers]
- **Imports and includes** are addressed by position: `/import[0]`, `/include[0]`.[^schema-executors]

| Node | Example ID |
|---|---|
| Schema root | `/schema` |
| Top-level element | `/element:person` |
| Top-level complex type | `/complexType:PersonType` |
| Sequence of a complex type | `/complexType:PersonType/group:sequence[0]` |
| Element in that sequence | `/complexType:PersonType/group:sequence[0]/element:first[0]` |
| Anonymous complex type | `/element:person/anonymousComplexType[0]` |
| Group reference | `/complexType:PersonType/group:sequence[0]/groupRef:SharedGroup[0]` |
| Schema documentation | `/schema/annotation[0]/documentation[0]` |
| Import | `/import[0]` |

## Who generates and who resolves IDs

- **Generating.** The webview's diagram builder (`DiagramBuilder`, `SchemaProcessors*`, `TypeNodeCreators`, `DiagramBuilderHelpers`) gives every diagram item its ID while building the diagram (see [Diagram rendering](diagram-rendering.md)). The property panel and the drop handling put these IDs into the commands they send.
- **Resolving.** The validators and executors in the extension host resolve IDs against the schema object with `locateNodeById()` from `src/schemaNavigator.ts`.[^navigator]

`locateNodeById()` walks the segments from the schema root and returns the node the ID points to (as `parent`, because commands usually add to or change children of it) together with an internal type name such as `topLevelComplexType` or `sequence`. It supports these steps:[^navigator]

| From | To |
|---|---|
| schema | top-level `element`, `complexType`, `simpleType`, `group`, `attributeGroup`, `attribute` |
| element | `anonymousComplexType`, `anonymousSimpleType` |
| complex type | `group:sequence`, `group:choice`, `group:all` (also through `complexContent`), `attribute` |
| named group | `group:sequence`, `group:choice`, `group:all` |
| attribute | `anonymousSimpleType` |
| compositor | `element`, nested `group:sequence`, `group:choice` |

When a segment has a name, the node is found by name; the position is ignored. A name also matches a node whose `ref` has that value. Without a name, the node is found by position. Annotations, imports, includes, group references and attribute group references are resolved by the respective validators and executors, which resolve the parent with `locateNodeById()` and handle the last segment themselves.

# Limitations

These are listed in [Known issues](known-issues.md#node-ids-are-ambiguous-and-have-many-special-cases) and tracked in [#348](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/348):

- Because names take precedence over positions, two particles with the same name in one compositor always resolve to the first.
- IDs of unnamed elements (such as element references) contain `unnamed`, which the navigator cannot resolve.
- The navigator has its own segment parser that does not handle `{namespace}` names.
- The scheme has special cases: compositors reuse the `group` type, derivation is skipped, schema-root annotations follow other rules than all other annotations, and top-level components are not under `/schema`.

# Citations

[^manifest]: [Extension manifest (dependencies and scripts)](../package.json)

[^generated-readme]: [Generated XML Schema classes](../shared/generated/README.md)

[^shared-types]: [Shared type exports](../shared/types.ts)

[^generated-schema]: [Generated root class schema](../shared/generated/schema.ts)

[^generated-open-attrs]: [Generated base class openAttrs](../shared/generated/openAttrs.ts)

[^schema-utils]: [Shared schema utilities](../shared/schemaUtils.ts)

[^schema-executors]: [Schema-level command executors](../src/commandExecutors/schemaExecutors.ts)

[^model-manager]: [SchemaModelManager](../src/schemaModelManager.ts)

[^webview-provider]: [Custom editor provider](../src/webviewProvider.ts)

[^command-processor]: [CommandProcessor](../src/commandProcessor.ts)

[^id-strategy]: [ID strategy](../shared/idStrategy.ts)

[^annotation-executors]: [Annotation command executors](../src/commandExecutors/annotationExecutors.ts)

[^schema-processors]: [Diagram schema processors](../webview-src/diagram/SchemaProcessors.ts)

[^navigator]: [Schema navigator](../src/schemaNavigator.ts)

[^builder-helpers]: [Diagram builder helpers](../webview-src/diagram/DiagramBuilderHelpers.ts)
