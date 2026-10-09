---
type: Build Process
title: Build and packaging
description: How the extension is built, run, linted, packaged and checked - the build outputs and tsconfig files, the npm scripts, running it in VS Code, the VSIX and its check, the generated schema classes, dependencies and the Node version, ESLint, CI, and the planned switch to Vite, NodeNext and native ESM.
tags: [build, packaging, vsix, webpack, typescript, eslint, ci, dependencies]
status: stable
generated: { by: human:neumaennl, at: 2026-10-09T20:13:13Z }
verified: { by: human:neumaennl, at: 2026-10-09T20:26:25Z }
sources:
  - id: manifest
    resource: ../package.json
    title: Extension manifest (scripts, dependencies, engines)
  - id: tsconfig
    resource: ../tsconfig.json
    title: TypeScript configuration of the extension host
  - id: tsconfig-webview
    resource: ../tsconfig.webview.json
    title: TypeScript configuration of the webview
  - id: webpack
    resource: ../webpack.config.mjs
    title: Webview bundle configuration
  - id: vscodeignore
    resource: ../.vscodeignore
    title: Files left out of the VSIX
  - id: verify-vsix
    resource: ../scripts/verify-vsix.mjs
    title: Check that the packaged extension loads
  - id: vscode-version
    resource: ../scripts/vscode-version.mjs
    title: Derive the Node and @types versions from the VS Code version
  - id: nvmrc
    resource: ../.nvmrc
    title: Node version for development and CI
  - id: vscode-config
    resource: ../.vscode/
    title: Launch configurations, tasks and settings for VS Code
  - id: npmrc-registries
    resource: ../.npmrc
    title: npm registries
  - id: dependabot
    resource: ../.github/dependabot.yml
    title: Dependabot configuration
  - id: eslint
    resource: ../eslint.config.mjs
    title: ESLint configuration
  - id: ci
    resource: ../.github/workflows/ci.yml
    title: CI workflow
  - id: pr-343
    resource: https://github.com/neumaennl/vscode-visual-xml-schema-editor/pull/343
    title: "Require VS Code 1.100 and fix VSIX packaging (#343)"
  - id: issue-340
    resource: https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340
    title: Tech Stack Modernization
  - id: issue-357
    resource: https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/357
    title: Align Node version, @types and CI with the supported VS Code version (#357)
---

# Purpose

This document describes how the extension is built, run, linted, packaged and checked: which tools produce which output, what goes into the VSIX, and what CI does. How the tests are run and written is described in [Testing](testing.md).

The packaging described here is the state after [#343](https://github.com/neumaennl/vscode-visual-xml-schema-editor/pull/343) on the branch `modernization`. The branch `copilot/add-editor-capabilities` does not have it yet (see [The editor branch](#the-editor-branch)).[^pr-343]

# Build outputs

The extension consists of two separately built parts (see [Architecture](architecture.md)):

| Part | Tool | Sources | Output |
|---|---|---|---|
| Extension host | `tsc` with `tsconfig.json` | `src/`, `shared/` | `out/src/`, `out/shared/` (CommonJS, ES2020, with source maps); the entry point is `out/src/extension.js` (`main` in `package.json`) |
| Webview | webpack with `ts-loader` and `tsconfig.webview.json` | `webview-src/`, `shared/` | `webview/main.js` (one bundle, including the CSS imported by the code) and `webview/styles.css` (copied) |

The extension host loads `webview/main.js`, `webview/styles.css` and `node_modules/@vscode/codicons/dist/codicon.css` into the webview through `asWebviewUri`. Both output folders are ignored by Git.[^tsconfig][^webpack]

The production build of the webview contains an inline source map (see [the known issue](known-issues.md#the-production-webview-bundle-contains-an-inline-source-map)).

| tsconfig | Used by | Notes |
|---|---|---|
| `tsconfig.json` | `tsc` (extension host) | Excludes test files, `__tests__`, `__mocks__` and `*TestHelpers.ts`. The path `shared/*` points to `shared/`. |
| `tsconfig.webview.json` | webpack | `ESNext` modules and the `DOM` library; output goes to webpack, not to disk.[^tsconfig-webview] |
| `tsconfig.extension-test.json`, `tsconfig.webview-test.json`, `tsconfig.shared-test.json` | ts-jest and ESLint | Extend the two above with the Jest and Node types for the test files (see [Testing](testing.md#jest-projects)). |

ESLint checks all five, so each TypeScript file must belong to at least one.

# npm scripts

| Script | What it does |
|---|---|
| `npm run compile` | `compile-extension` (`tsc -p ./tsconfig.json`) and then `compile-webview` (`webpack --mode production`). |
| `npm run watch` | Runs `watch-extension` (`tsc -watch`) and `watch-webview` (`webpack --mode development --watch`) side by side with `concurrently`. |
| `npm run clean` | Deletes `out/` and `webview/`. |
| `npm run lint`, `npm run lint:fix` | Runs ESLint on the repository, or fixes what it can. |
| `npm run package` | Builds the VSIX with `vsce package`; `vscode:prepublish` runs `npm run compile` first. |
| `npm run package:verify` | Checks the VSIX (see [Packaging](#packaging)). |
| `npm run vscode:update`, `npm run vscode:check` | Change the lowest supported VS Code version and the versions derived from it, or check that they match (see [VS Code and Node versions](#vs-code-and-node-versions)). |
| `npm run generate-classes-from-schema` | Generates the schema classes (see [Generated schema classes](#generated-schema-classes)). |

The test scripts are described in [Testing](testing.md#running-the-tests).[^manifest]

# Running in VS Code

`.vscode/launch.json` has the configuration "Run Extension", which starts a second VS Code window (Extension Development Host) with the extension loaded from the repository. Before it starts, it runs the default build task "Watch All" from `.vscode/tasks.json`, which runs both watch scripts. "Build All" compiles once without watching. `.vscode/settings.json` uses the TypeScript version from `node_modules`, and `.vscode/extensions.json` recommends the ESLint extension. The second launch configuration, "Extension Tests", does not work (see [the known issue](known-issues.md#the-launch-configuration-extension-tests-does-not-work)).[^vscode-config]

# Packaging

`vsce package` builds `xml-schema-visual-editor-<version>.vsix` in the repository root. Before packaging it runs `vscode:prepublish`, which compiles both parts; it does not run `clean`, so files left in `out/` or `webview/` by earlier builds are packaged too (see [the known issue](known-issues.md#stale-build-output-is-packaged)).[^manifest]

What goes into the VSIX is controlled by `.vscodeignore`:[^vscodeignore]

- The sources (`src/`, `shared/`, `webview-src/`), all `.ts` and `.map` files, and the tests and mocks in `out/` are left out.
- The repository and development files are left out: `.github/`, `scripts/`, `.vscode/`, `docs/`, `exampleFiles/`, `schema/`, `coverage/`, `test-results/`, `AGENTS.md`, `CONTRIBUTING.md`, the configuration files and old VSIX files.
- `README.md` and `LICENSE` are packaged. The README is the page of the extension in the Marketplace; `vsce` turns its relative links into links to the repository given in `repository` in `package.json`.
- `node_modules/` is not listed. `vsce` adds the production dependencies (`dependencies` in `package.json`) and their dependencies, and leaves out the development dependencies. A runtime dependency must therefore be in `dependencies`, and `node_modules/` must not be excluded in `.vscodeignore`.

`npm run package:verify` runs `scripts/verify-vsix.mjs`. It unpacks the VSIX into a temporary folder outside the repository (with `unzip`, on Windows with the `tar.exe` of Windows), so that the `node_modules/` of the repository cannot hide a missing file, replaces the `vscode` module with a stub, loads the entry point and checks that it exports `activate()`. Without an argument it checks the first `.vsix` file in the current folder. It finds missing dependencies and errors at load time, but does not start VS Code.[^verify-vsix]

`vsce` refuses to package when `@types/vscode` is newer than the lowest VS Code version in `engines.vscode`. Both are set together, see [VS Code and Node versions](#vs-code-and-node-versions).[^manifest]

## The editor branch

On `copilot/add-editor-capabilities`, packaging fails or produces a VSIX that does not work:

- `engines.vscode` is `^1.74.0` and `@types/vscode` is `^1.137.0`, so `vsce package` stops with an error. `@types/node` (`^26`) and `.nvmrc` (`24`) do not follow the Node version of VS Code 1.74 (Node 16.14) either, and `vscode:update` and `vscode:check` do not exist.
- `.vscodeignore` excludes `node_modules/**` except `@neumaennl/xmlbind-ts`. The dependencies of `xmlbind-ts` (for example `reflect-metadata` and `@xmldom/xmldom`) and `@vscode/codicons` are missing from the VSIX, so the extension cannot be loaded.
- `package:verify` and the packaging steps in CI do not exist.
- `@neumaennl/xmlbind-ts` 2.x is an ES module only, which the CommonJS extension loads with `require()`. Node supports this without a flag from version 20.19 on, which VS Code 1.100 ships; VS Code 1.74 ships Node 16.

The fixes from #343 and #357 are applied when the editor branch and `modernization` are merged (Phase 9 of the [Tech Stack Modernization](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340)).[^pr-343][^issue-357][^issue-340]

# Generated schema classes

The classes in `shared/generated/` describe XML Schema itself and are used to read and write XSD files (see [Schema model](schema-model.md)). `npm run generate-classes-from-schema` creates them with `xsd2ts` from `@neumaennl/xmlbind-ts`, using `schema/XMLSchema.xsd`, after deleting the existing `.ts` files in that folder; the README there stays. They are not edited by hand; ESLint ignores them, and the coverage report leaves them out. After an update of `xmlbind-ts`, they are generated again and committed.[^manifest][^eslint]

# Dependencies and Node

`@neumaennl/xmlbind-ts` is published in GitHub Packages. `.npmrc` takes all `@neumaennl` packages from `npm.pkg.github.com` and everything else from `registry.npmjs.org`, and reads the token from the environment variable `NODE_AUTH_TOKEN`. `npm install` and `npm ci` therefore need `NODE_AUTH_TOKEN` set to a GitHub token that can read packages; CI uses the workflow's `GITHUB_TOKEN`.[^npmrc-registries][^ci]

Dependabot opens pull requests for npm packages and GitHub Actions every day and groups the ESLint packages. It ignores minor and major updates of `@types/vscode` and `@types/node`, which follow the VS Code version (see below); patch updates within their `~` range are allowed. Dependabot reads its configuration only from the default branch `main`.[^dependabot]

## VS Code and Node versions

The extension runs in the extension host of VS Code, which uses the Node version of the Electron that VS Code ships, not the Node installed on the machine. The lowest supported VS Code version in `engines.vscode` therefore decides which Node version the extension runs on, and three other values are derived from it:[^manifest][^nvmrc][^vscode-version]

| Value | Rule |
|---|---|
| `engines.vscode` | `^` and the lowest supported VS Code version, a release `x.y.0`. |
| `@types/vscode` | `~` and the highest published version that is not newer than that VS Code version, so that `vsce` packages and the types offer no API that this version lacks. |
| `@types/node` | `~` and the highest published version with the major version of the extension host's Node and a minor version that is not higher, so that the types offer no Node API that the extension host lacks. |
| `.nvmrc` | The exact Node version of the extension host. Development and CI use it, so the tests run on that version. |

VS Code builds a release with the Electron version in the `target` of the `.npmrc` at its tag in `microsoft/vscode`; the `electron` entry in its `package.json` can differ or be missing. The Electron release list gives the Node version of each Electron version. Inside VS Code, `process.versions` in the developer tools shows both.

To change the lowest supported VS Code version, run `npm run vscode:update`. It lists the VS Code releases from the current minimum on, with their release date, Electron and Node version, the matching `@types/vscode` and `@types/node`, and the end of life of the Node version, and asks for the new minimum; `npm run vscode:update -- <version>` skips the question. It writes the four values to `package.json` and `.nvmrc`, with the line endings that `package.json` has. After asking, it installs the Node version with nvm, nvm-windows or fnm (or uses the running Node if it already has that version) and runs `npm install`, `npm run lint`, `npm test`, `npm run package` and `npm run package:verify` with it. Without a terminal, or if no version manager can install the Node version, it prints these steps instead. Then fix what fails, update the requirements in `README.md`, and commit the changes together.[^vscode-version]

A Node version past its end of life is a poor choice: Node no longer fixes it, and current development tools stop supporting it.

The script reads the GitHub API, `raw.githubusercontent.com`, the Electron release list, the Node release schedule and the npm registry. It sends `GITHUB_TOKEN` or `GH_TOKEN` to the GitHub API if one of them is set. `npm run vscode:check` derives the values from `engines.vscode` in the same way and fails if `@types/vscode`, `@types/node` or `.nvmrc` differ; CI runs it (see [CI](#ci)).[^vscode-version][^ci]

# Lint

`eslint.config.mjs` is a flat configuration:[^eslint]

- It ignores `out/`, `dist/`, `webview/`, `node_modules/`, type declarations and generated code.
- `.js` and `.cjs` files are not allowed. Configuration files in the repository root and the scripts in `scripts/` are `.mjs` and are checked with the recommended JavaScript rules of ESLint.
- TypeScript files are checked with the type information from all five tsconfig files, with the recommended rules of `typescript-eslint` including those that need type information. Return types must be declared, `any` is an error, non-null assertions are warnings, and `unknown` in type assertions and variable annotations is forbidden (`no-restricted-syntax`); an exception needs an `eslint-disable-next-line` comment with a reason.
- Test files and mocks additionally use the recommended rules of `eslint-plugin-jest` (see [Testing](testing.md#conventions)).

# CI

The workflow `ci.yml` runs on pushes and pull requests to `main` and `modernization`, on Ubuntu with the Node version from `.nvmrc`:[^ci]

1. `npm run vscode:check`, which fails if `@types/vscode`, `@types/node` and `.nvmrc` don't match `engines.vscode` (see [VS Code and Node versions](#vs-code-and-node-versions)).
2. `npm ci`, with `NODE_AUTH_TOKEN` for GitHub Packages.
3. `npm run lint`.
4. `npm run compile`.
5. The tests with coverage, which compile again through `pretest` (see [Testing](testing.md#ci)).
6. `npm run package` and `npm run package:verify`.
7. The coverage totals go to the job summary, and the JUnit report is published as the check "Jest".

Pull requests into other branches are not checked (see [the known issue](known-issues.md#ci-compiles-twice-and-skips-pull-requests-into-other-branches)).

# Planned changes

The [Tech Stack Modernization](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340) changes the build in several phases:[^issue-340]

- Phase 3 replaces Jest with Vitest (see [Testing](testing.md#planned-switch-to-vitest)).
- Phase 4 then replaces webpack with Vite for the webview. Vitest is built on Vite, so after Phase 3 Vite is already a dependency. The switch has to check the content security policy of the webview, the loading of assets, source maps, the production build and the VSIX.
- Phase 5 switches TypeScript to `NodeNext` modules, and Phase 6 makes the package a native ES module (`"type": "module"`).
- Phase 7 updates CI to the new tools.

[^manifest]: Extension manifest (scripts, dependencies, engines)

[^tsconfig]: TypeScript configuration of the extension host

[^tsconfig-webview]: TypeScript configuration of the webview

[^webpack]: Webview bundle configuration

[^vscodeignore]: Files left out of the VSIX

[^verify-vsix]: Check that the packaged extension loads

[^vscode-version]: Derive the Node and @types versions from the VS Code version

[^nvmrc]: Node version for development and CI

[^vscode-config]: Launch configurations, tasks and settings for VS Code

[^npmrc-registries]: npm registries

[^dependabot]: Dependabot configuration

[^eslint]: ESLint configuration

[^ci]: CI workflow

[^pr-343]: Require VS Code 1.100 and fix VSIX packaging (#343)

[^issue-357]: Align Node version, @types and CI with the supported VS Code version (#357)

[^issue-340]: Tech Stack Modernization
