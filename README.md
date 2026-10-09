# XML Schema Visual Editor

[![CI](https://github.com/neumaennl/vscode-visual-xml-schema-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/neumaennl/vscode-visual-xml-schema-editor/actions/workflows/ci.yml)

Shows XML Schema (`.xsd`) files in VS Code as an interactive diagram, similar to the schema view of [Altova XMLSpy](https://www.altova.com/xmlspy-xml-editor).

The extension is currently a viewer. It is being developed into a full visual editor, in which you add constructs to the diagram by drag and drop and edit their properties in a side panel; every change is written back to the XSD file. See [Status](#status).

## Features

- **Diagram of the schema.** Elements and types are drawn as a tree, with their content models (sequence, choice and all). Expand and collapse nodes to focus on the part you are working on.
- **Properties of the selected node.** Click a node to see its name, type, namespace, occurrence, documentation, attributes and restrictions (facets) in the properties panel.
- **Navigation.** Zoom with the mouse wheel or the toolbar buttons, use "Fit View" to see the whole diagram, and pan by dragging the background, with the middle mouse button or with Ctrl and the left mouse button.
- **Always current.** The diagram follows changes that you make to the file in the text editor.

## Usage

The visual editor opens next to the normal text editor; it does not replace it. To open an `.xsd` file in it:

- right-click the file in the Explorer and choose **Open in XML Schema Visual Editor**,
- run **Open in XML Schema Visual Editor** from the Command Palette while the file is open in the text editor, or
- run **View: Reopen Editor With…** and choose **XML Schema Visual Editor**.

## Settings

| Setting | Default | Effect |
|---|---|---|
| `xmlSchemaVisualEditor.showDocumentation` | `false` | Shows the documentation annotations of the schema in the diagram. |
| `xmlSchemaVisualEditor.alwaysShowOccurrence` | `false` | Shows the occurrence (`minOccurs`..`maxOccurs`) of every item, including the default `1..1`. |
| `xmlSchemaVisualEditor.showType` | `false` | Shows the type of each element in the diagram. |

Changes to the settings apply immediately to all open diagrams.

## Requirements

VS Code 1.100 or later.

## Status

The editing features are developed on the branch [`copilot/add-editor-capabilities`](https://github.com/neumaennl/vscode-visual-xml-schema-editor/tree/copilot/add-editor-capabilities). The design and the roadmap are described in [ADR 001](docs/architecture/001-editor-transition.md). Bugs and planned work are tracked in the [issues](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues).

## Contributing

Contributions are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) explains where development happens, how to set up the repository and what a pull request needs.

## Acknowledgements

- The diagram is a port of [XSD Diagram](https://github.com/dgis/xsddiagram) by Régis Cosnier.
- XSD files are read and written with [xmlbind-ts](https://github.com/neumaennl/xmlbind-ts).

## License

[GNU Affero General Public License v3.0](LICENSE)