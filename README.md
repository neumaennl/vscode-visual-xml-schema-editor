# Visual XML Schema Editor Extension for Visual Studio Code

[![CI](https://github.com/neumaennl/vscode-visual-xml-schema-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/neumaennl/vscode-visual-xml-schema-editor/actions/workflows/ci.yml)

Uses VS Code's [custom editor API](https://code.visualstudio.com/api/extension-guides/custom-editors) to allow editing XML schemas in a visual manner similar to [Altova XMLSpy](https://www.altova.com/xmlspy-xml-editor).

## References

- uses [Typescript class generator from XML schemas and XML (de-)serializer](https://github.com/neumaennl/xmlbind-ts)
- ported this [free xml schema definition diagram viewer](https://github.com/dgis/xsddiagram) to generate the diagram
- try out [Eclipse diagram editor framework for VS Code](https://eclipsesource.com/de/blogs/2021/04/16/a-diagram-editor-framework-for-vs-code/) to help editing the diagram
- possibly use [React](https://medium.com/younited-tech-blog/reactception-extending-vs-code-extension-with-webviews-and-react-12be2a5898fd) or [Svelte](https://blog.kylekukshtel.com/game-data-editor-vscode-part-2)

## VS Code API

### `vscode` module

- [`window.registerCustomEditorProvider`](https://code.visualstudio.com/api/references/vscode-api#window.registerCustomEditorProvider)
- [`CustomTextEditor`](https://code.visualstudio.com/api/references/vscode-api#CustomTextEditor)
- [`CustomEditor`](https://code.visualstudio.com/api/references/vscode-api#CustomEditor)

## Configuration

The extension provides the following settings to customize the diagram display:

- **`xmlSchemaVisualEditor.showDocumentation`** (default: `false`)  
  Show documentation annotations in the diagram. When enabled, documentation elements from the XSD will be displayed alongside the diagram elements.

- **`xmlSchemaVisualEditor.alwaysShowOccurrence`** (default: `false`)  
  Always show occurrence constraints (minOccurs/maxOccurs) in the diagram, even for default values (1..1). When disabled, default occurrence values are hidden to reduce clutter.

- **`xmlSchemaVisualEditor.showType`** (default: `false`)  
  Show type information for elements in the diagram. When enabled, the type of each element will be displayed in the diagram.

To change these settings:
1. Open VS Code Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "XML Schema Visual Editor"
3. Toggle the desired options

Changes to settings are applied immediately to all open XML Schema editors.

## Running the example

This is currently based on the official [Custom Editor API Samples](https://github.com/microsoft/vscode-extension-samples/tree/main/custom-editor-sample) from Microsoft.

- Open this example in VS Code 1.74+
- `npm install`
- `npm run watch` or `npm run compile`
- `F5` to start debugging

Open the example files from the `exampleFiles` directory.
