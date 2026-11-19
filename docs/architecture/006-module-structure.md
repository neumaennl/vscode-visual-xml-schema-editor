---
type: Architecture Decision Record
title: "ADR 006: Module structure"
description: The decision how the code within the extension host, the webview and the shared code is split into layers, in which direction the layers may depend on each other, what belongs into the shared code and what it may rely on, how files are named, and how fallow checks the layers.
tags: [adr, architecture, structure, dependencies, shared]
status: stable
generated: { by: human:neumaennl, at: 2026-11-19T14:50:08Z }
verified: { by: human:neumaennl, at: 2026-11-19T15:32:47Z }
sources:
  - id: guidelines
    resource: ../development-guidelines.md
    title: Development guidelines
  - id: fallow-config
    resource: ../../.fallowrc.jsonc
    title: fallow configuration
  - id: eslint-config
    resource: ../../eslint.config.mjs
    title: ESLint configuration
  - id: vscode-api
    resource: https://code.visualstudio.com/api/references/vscode-api#Webview
    title: "VS Code API: `Webview.postMessage()`"
  - id: issue-448
    resource: https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/448
    title: "Review the structure of the editor code (#448)"
---

# ADR 006: Module structure

**Status:** Accepted  
**Date:** 2026-11-18

## Context

The [project boundaries](../development-guidelines.md#project-boundaries) say which of the projects `shared/`, `src/` and `webview-src/` may use which, and ESLint checks them.[^guidelines][^eslint-config] Within a project, nothing said which modules may use which. The first structure review ([#448](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/448)) found no import cycles, but:[^issue-448]

- a validator imported a module from `commandExecutors/`, because the code that finds QNames in a schema lived there although validators and executors both need it;
- knowledge about XML Schema was written down several times, and the copies had drifted apart: the list of built-in types in the extension host had 46 names, the one in the webview 27; the facet names were listed in about seven places; the prefixes of QNames were resolved in six places;
- the webview kept facts about the schema twice, on the `Diagram` and in the schema object;
- the handling of the canvas was split between `main.ts` and `renderer.ts`;
- the command types, the validators and the executors grouped the schema constructs in three different ways.

## Decision

### Layers

Each project is split into layers. A module may import from its own layer and from the layer directly below it; it does not import from a layer above it and does not skip a layer. The exceptions are the schema access in the extension host and the diagram in the webview, which any layer above them may use, the shared code, which both projects may use, and the facet icons in the webview, which lie below the surfaces and are used only by the palette and by the properties panel, the two places that show facets. Two modules of the same layer that serve different purposes do not import each other: what both need goes into a layer below them.

**Extension host (`src/`), from top to bottom:**

| Layer         | Modules                                                                          | Responsibility                                                                               |
| ------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| VS Code       | `extension.ts`, `webviewProvider.ts`                                             | Activation, the webview, messages and the document. Only these use VS Code.                  |
| Pipeline      | `commandProcessor.ts`                                                            | Parse, validate, execute, serialize.                                                         |
| Dispatch      | `commandValidator.ts`, `commandExecutor.ts`, `commandHandlers.ts`                | Find the validator or executor of a command.                                                 |
| Commands      | `commandValidators/`, `commandExecutors/`                                        | One module per schema construct and side; validators and executors do not import each other. |
| Schema access | `schemaReferences/`, `schemaNavigator.ts`, `commandUtils.ts`, the XML conversion | Finding and rewriting references, resolving IDs, parsing and serializing.                    |

**Webview (`webview-src/`), from top to bottom:**

| Layer         | Modules                                   | Responsibility                                                                                                                                                        |
| ------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App           | `main.ts`                                 | Wiring, messages and the saved state.                                                                                                                                 |
| Surfaces      | `canvas/`, `palette/`, `propertiesPanel/` | Drawing and handling the canvas, which turns drops into commands; showing the palette and starting drags; turning edits into commands. They do not import each other. |
| Drag and drop | `dragAndDrop/`                            | The schema constructs that can be dragged, the dragged schema construct and the drop rules.                                                                           |
| Facet icons   | `facetIcons.ts`                           | The icon and color of each facet, for the palette and the properties panel.                                                                                           |
| Diagram       | `diagram/`                                | Schema → diagram items → layout → SVG. Knows nothing about commands or the palette.                                                                                   |

**Shared (`shared/`):** the generated classes at the bottom, then the command and message types, then the pure functions about XML Schema, which use both.

### What belongs into `shared/`

Knowledge about XML Schema that both sides need is written down once, in `shared/`: the node IDs, the QNames and their prefixes, the built-in types, the facets and where a complex type holds its content. The functions there are pure. As long as the schema objects of `xmlbind-ts` 3 are not known (see [Schema objects on both sides](#schema-objects-on-both-sides)), new functions in `shared/` work on values such as strings, names and the map of namespace prefixes rather than on schema objects. A table that only one side needs, such as the labels and icons of the facets in the webview, stays on that side, but is derived from the shared list or checked against it with `satisfies Record<…>`, so that the compiler reports a missing or unknown entry.

The webview reads facts about the schema from the schema object it received, not from copies on the diagram.

### Schema objects on both sides

The two sides do not see the same objects. The extension host works with the objects that `unmarshal()` creates. `postMessage()` sends the schema to the webview as JSON, and `setState()` saves it as JSON, so the webview gets plain objects.[^vscode-api] With `xmlbind-ts` 2, a comparison of the 30 test and example schemas with their JSON round trip found two differences:

- **The classes are gone.** Every object is a plain object; `instanceof`, the constructor and the metadata of the decorators, which `xmlbind-ts` keeps per class, are not available. The generated classes have no methods or getters, so no behavior is lost.
- **Fields without a value are gone.** With `useDefineForClassFields`, every field that a generated class declares is an own property of its instances, also when its value is `undefined`: in one of the test schemas, 50 of 106 properties. JSON leaves these out. So `"pattern" in restriction` is always true in the extension host and true in the webview only if the restriction has a pattern.

`xmlbind-ts` is being reimplemented as version 3 ([#444](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/444)). It will still generate classes from XML Schemas and use them to marshal and unmarshal documents, but how its objects look inside is not known yet; they might, for example, link children to their parents, which JSON cannot carry. So the code assumes as little as possible about them:

- Code that reads schema objects takes structural types, such as `{ name?: string }`, decides by values (`value !== undefined`), never by whether a key exists (`in`, `Object.hasOwn()`, `Object.keys()`) or by the class (`instanceof`), and does not create instances of the generated classes outside the executors.
- In the webview, only the diagram builder and one module of accessor functions read the schema objects (see [#360](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/360)).
- Tests of the webview use the schema in the form the webview gets it: a test helper in `shared/__tests__/` sends the result of `unmarshal()` through JSON.
- Functions that read schema objects and that both sides need, such as the lookup of top-level components and the rules where a schema construct may be placed, move into `shared/` with the move to version 3, when the objects are known. #444 then also checks what the webview receives.

### Names

- The command types in `shared/commands/`, the validators and the executors are split by the same schema constructs and named after them: `element`, `attribute`, `simpleType`, `complexType`, `group`, `attributeGroup`, `annotation` (with documentation) and `schema` (imports, includes and namespaces). There are no barrel modules within a project besides `shared/types.ts`, `shared/commands/index.ts` and `webview-src/diagram/index.ts`.
- A module is named after what it does, not after the module that uses it: helpers that several modules use get a name of their own instead of `…Utils` or `…Helpers` of one user.

### Checks

fallow checks the layers of the extension host and of the webview with `boundaries` in `.fallowrc.jsonc`, and the absence of import cycles, in `npm run lint` (`fallow architecture`).[^fallow-config] The configuration allows each part exactly the parts that its code uses, within the rules above, so that a new dependency changes the configuration and shows in a review. ESLint keeps checking the project boundaries.

## Consequences

- The modules that find, check and rewrite QNames move from `commandExecutors/` and `commandValidators/` into `src/schemaReferences/`.
- The built-in types, the facets and the handling of QNames move into `shared/`; the copies in the extension host and the webview are removed.
- The canvas becomes one module below `main.ts`, which keeps the view state once.
- The facts about the schema on `Diagram` are removed; the properties panel reads them from the schema object.
- The command types of simple and complex types, groups and attribute groups, annotations and the schema are split into files per schema construct, and the barrel `commandExecutors/typeExecutors.ts` is removed.
- A new module is placed into a layer; if it needs a layer above it, the code it needs moves down.
- The tests of the webview get the schema through JSON, like the webview. The checks by key, `hasSimpleTypeFacets()` in the webview and `"use" in attr` and `hasAnnotationProperty()` in the extension host, decide by values or by the kind of the node.
- #444 gets the task to move the functions that read schema objects and that both sides need into `shared/`, and to check what the webview receives.

## Rejected alternatives

- **Rules without a check.** The layers would only be checked in reviews. The import of an executor module by a validator went through reviews before.
- **One folder per layer.** The folders would show the layers, but moving all modules would touch every import and the history of every file, for little gain over the configuration of fallow.

## Review

Review this decision at the next structure review (see [Structure reviews](../development-guidelines.md#structure-reviews)), or when a new part, such as a context menu or a symbol table of included and imported schemas, does not fit into a layer.

[^guidelines]: [Development guidelines](../development-guidelines.md)

[^vscode-api]: [VS Code API: `Webview.postMessage()`](https://code.visualstudio.com/api/references/vscode-api#Webview)

[^fallow-config]: [fallow configuration](../../.fallowrc.jsonc)

[^eslint-config]: [ESLint configuration](../../eslint.config.mjs)

[^issue-448]: [Review the structure of the editor code (#448)](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/448)
