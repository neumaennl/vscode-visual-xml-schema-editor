# Contributing

Contributions are welcome: bug reports, ideas and pull requests. This file explains where development happens, how to set up the repository and what a pull request needs.

## Branches

| Branch | Content |
|---|---|
| `main` | The current version: a viewer that shows XML Schema files as a diagram. |
| `copilot/add-editor-capabilities` | The editor in development: it adds a palette, drag and drop and an editable property panel. **Base your work and pull requests on this branch.** |
| `modernization` | Updates the tech stack ([#340](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340)) and is merged into the editor branch later. No contributions are needed there. |

The documentation in [`docs/`](docs/index.md) describes the editor branch.

## Setup

1. Install the Node version in `.nvmrc`, for example with `nvm install`, which also switches to it. nvm-windows does not read `.nvmrc`; there, run `nvm install <version>` and `nvm use <version>` with the version from the file.
2. Set the environment variable `NODE_AUTH_TOKEN` to a GitHub token that can read packages (a classic personal access token with the scope `read:packages`). The dependency `@neumaennl/xmlbind-ts` is published in GitHub Packages, and `npm` cannot install it without the token.
3. Run `npm ci`.
4. Open the folder in VS Code and press F5 (launch configuration "Run Extension"). A second VS Code window opens with the extension loaded. In it, open an `.xsd` file, for example from `exampleFiles/`, with "Open With…" → "XML Schema Visual Editor".

[Build and packaging](docs/build-and-packaging.md) explains the build, the npm scripts and the VSIX.

## Before you start

- Read the [development guidelines](docs/development-guidelines.md). They contain the rules for code, tests, documentation and commits.
- The [documentation index](docs/index.md) lists all documents, starting with the [architecture](docs/architecture.md).
- Check the [known issues](docs/known-issues.md) and the [open issues](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues). For larger changes, open an issue or comment on an existing one before you start, so that the approach can be agreed on first.

## Pull requests

- Open the pull request against `copilot/add-editor-capabilities`, and give it one purpose.
- `npm run lint` and `npm test` must pass. CI does not run for pull requests into this branch yet, so run both locally.
- Update the documentation that the change affects, as described in the [development guidelines](docs/development-guidelines.md#documentation).

## Reporting bugs

Open an [issue](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/new) with the VS Code version, the steps to reproduce the problem and, if possible, a small XSD file that shows it.

## License

By contributing, you agree that your contributions are licensed under the [GNU Affero General Public License v3.0](LICENSE), like the rest of the project.
