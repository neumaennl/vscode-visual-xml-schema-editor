# Visual XML Schema Editor Extension for Visual Studio Code

[![CI](https://github.com/neumaennl/vscode-visual-xml-schema-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/neumaennl/vscode-visual-xml-schema-editor/actions/workflows/ci.yml)

Edits XML Schema (`.xsd`) files in VS Code as an interactive diagram, similar to the schema view of [Altova XMLSpy](https://www.altova.com/xmlspy-xml-editor). Add constructs by dragging them from the palette onto the diagram, edit them in the properties panel, and every change is written to the XSD file.

## Features

- **Diagram of the schema.** Elements, groups and types are drawn as a tree, with their content models (sequence, choice and all). Expand and collapse nodes to focus on the part you are working on.
- **Adding by drag and drop.** The palette on the left lists elements, attributes, groups, compositors, simple and complex types, extensions, restrictions and facets. Drag an item onto a node in the diagram to add it there; the diagram only accepts drops where the construct is allowed.
- **Editing in the properties panel.** Click a node to select it. The panel on the right shows it in four tabs: **General** (name, type, cardinality, default and fixed values, namespace declarations, attributes), **Facets** (the restrictions of a simple type), **Docs** (its documentation) and **XML** (a read-only preview of its XML). Nodes that can be deleted have a delete button in the panel header.
- **Changes go to the file.** Every edit changes the XSD file as one step, so you save it, undo and redo it as in the text editor. The diagram also follows changes that you make to the file in the text editor. If an edit is not possible, a message above the diagram says why.
- **Navigation.** Zoom with the mouse wheel or the toolbar buttons, use "Fit View" to see the whole diagram, and pan by dragging the background, with the middle mouse button or with Ctrl and the left mouse button.

## Usage

The visual editor opens next to the normal text editor; it does not replace it. To open an `.xsd` file in it:

- right-click the file in the Explorer and choose **Open in Visual XML Schema Editor**,
- run **Open in Visual XML Schema Editor** from the Command Palette while the file is open in the text editor, or
- run **View: Reopen Editor With…** and choose **Visual XML Schema Editor**.

## Settings

| Setting | Default | Effect |
|---|---|---|
| `visualXmlSchemaEditor.showDocumentation` | `false` | Shows the documentation annotations of the schema in the diagram. |
| `visualXmlSchemaEditor.alwaysShowOccurrence` | `false` | Shows the occurrence (`minOccurs`..`maxOccurs`) of every item, including the default `1..1`. |
| `visualXmlSchemaEditor.showType` | `false` | Shows the type of each element in the diagram. |

Changes to the settings apply immediately to all open diagrams.

## Requirements

VS Code 1.125 or later.

## Status

The editor is in development and not published yet. Some constructs cannot be added or edited yet, for example attribute groups, the properties of attributes, imports and includes; there is no context menu and there are no keyboard shortcuts. Every edit formats the whole file anew, so the original indentation and attribute order are lost. The [known issues](docs/known-issues.md) list these limitations and the known bugs, and the [issues](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues) track the planned work.

## Contributing

Contributions are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) explains where development happens, how to set up the repository and what a pull request needs.

## Acknowledgements

- The diagram is a port of [XSD Diagram](https://github.com/dgis/xsddiagram) by Régis Cosnier.
- XSD files are read and written with [xmlbind-ts](https://github.com/neumaennl/xmlbind-ts).

## License

[GNU Affero General Public License v3.0](LICENSE)
