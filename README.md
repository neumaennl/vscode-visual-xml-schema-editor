# Visual XML Schema Editor Extension for Visual Studio Code
Uses VS Code's [custom editor API](https://code.visualstudio.com/api/extension-guides/custom-editors) to allow editing XML schemas in a visual manner similar to [Altova XMLSpy](https://www.altova.com/xmlspy-xml-editor).

## References
- use [TypeScript decorators and (de-)serializer for xmldom](https://github.com/andersnm/xmldom-decorators)
- port this [free xml schema definition diagram viewer](https://github.com/dgis/xsddiagram) to generate the diagram
- try out [Eclipse diagram editor framework for VS Code](https://eclipsesource.com/de/blogs/2021/04/16/a-diagram-editor-framework-for-vs-code/) to help editing the diagram
- possibly use [React](https://medium.com/younited-tech-blog/reactception-extending-vs-code-extension-with-webviews-and-react-12be2a5898fd) or [Svelte](https://blog.kylekukshtel.com/game-data-editor-vscode-part-2)

## VS Code API

### `vscode` module

- [`window.registerCustomEditorProvider`](https://code.visualstudio.com/api/references/vscode-api#window.registerCustomEditorProvider)
- [`CustomTextEditor`](https://code.visualstudio.com/api/references/vscode-api#CustomTextEditor)
- [`CustomEditor`](https://code.visualstudio.com/api/references/vscode-api#CustomEditor)

## Running the example

This is currently based on the official [Custom Editor API Samples](https://github.com/microsoft/vscode-extension-samples/tree/main/custom-editor-sample) from Microsoft.

- Open this example in VS Code 1.46+
- `npm install`
- `npm run watch` or `npm run compile`
- `F5` to start debugging

Open the example files from the `exampleFiles` directory.