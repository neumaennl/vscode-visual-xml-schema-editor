---
okf_version: "0.2"
---

# Overview

* [Architecture](architecture.md) - How the extension host, the webview and the shared code work together to provide a visual editor for XML Schema (XSD) files, and the design decisions behind the command-based design.
* [ADR 001: Editor transition architecture](architecture/001-editor-transition.md) - The decision to turn the viewer into an editor whose webview sends commands that the extension host validates, executes and writes to the XSD file, with the roadmap and the deviations of the implementation from the design.

# Working on the extension

* [Development guidelines](development-guidelines.md) - Rules for everyone who changes the extension - code size, code quality and ESLint, TypeScript and naming, VS Code and Node versions, TSDoc, tests, documentation and the knowledge bundle, what to check before committing, and commits.
* [Build and packaging](build-and-packaging.md) - How the extension is built, run, linted, packaged and checked - the build outputs and tsconfig files, the npm scripts, running it in VS Code, the VSIX and its check, the generated schema classes, dependencies and the Node version, ESLint, CI, and the planned switch to Vite, NodeNext and native ESM.
* [Testing](testing.md) - How the extension is tested - running the tests, the three Jest projects, mocks and helpers, conventions for tests, mocks, helper functions and helper classes, which tests to write for typical changes, coverage, CI, the planned switch to Vitest, and how the current tests compare with the testing strategy of ADR 001.

# User experience

* [UX concept](ux-concept.md) - The interaction model of the editor - which surface adds, edits and deletes what, how facets work, and how the property panel behaves - with a list of what the current editor does not implement yet.
* [Editor](editor.md) - The custom editor and the webview app - how the editor opens, the page layout, the app that wires palette, diagram and property panel together, navigation, diagram settings, the palette and the property panel tabs.

# Schema and edits

* [Schema model](schema-model.md) - The object model of an XSD file - classes generated from the XSD meta-schema, XML binding with xmlbind-ts, and the path-based IDs that identify schema nodes.
* [Drag and drop](drag-and-drop.md) - How a construct is dragged from the palette onto a diagram node - the responsibilities of palette, renderer, DropCommandFactory and extension host, the event flow, which construct can be dropped on which node with which command, and the generated defaults.
* [Messaging](messaging.md) - The message protocol between the extension host and the webview - the messages in both directions and the order in which they arrive.
* [Commands](commands.md) - The edit commands - payload fields, the rules the validators enforce, what the executors change in the schema, and where the webview sends them.
* [Persistence](persistence.md) - How edits reach the XSD file - the command pipeline, the document edit, what serialization changes, undo and save, and how changes from outside reach the diagram.

# Diagram

* [Diagram rendering](diagram-rendering.md) - How the schema object becomes the SVG diagram - the build, layout and render steps, which schema constructs become which nodes, the layout rules, the notation, the interaction, and the origin in xsddiagram.

# Maintenance

* [Known issues](known-issues.md) - Problems found in the extension that are not fixed yet, with links to GitHub issues where they exist.
