---
type: Build Process
title: Build and packaging
description: How the extension is built, run, linted, packaged and checked - the build outputs and tsconfig files, the npm scripts, the scripts in TypeScript, running it in VS Code, the VSIX and its check, the generated schema classes, dependencies and the Node version, ESLint, the checks for duplicated and unused code and for the layers, the formatting with Prettier, CI, and planned changes.
tags: [build, packaging, vsix, vite, typescript, eslint, jscpd, fallow, prettier, ci, dependencies]
status: stable
generated: { by: human:neumaennl, at: 2026-11-18T19:53:10Z }
verified: { by: human:neumaennl, at: 2026-11-18T20:26:45Z }
sources:
  - id: manifest
    resource: ../package.json
    title: Extension manifest (scripts, dependencies, engines)
  - id: tsconfig
    resource: ../tsconfig.extension.json
    title: TypeScript configuration of the extension host
  - id: tsconfig-solution
    resource: ../tsconfig.json
    title: Solution tsconfig that references all TypeScript configurations
  - id: tsconfig-node-tools
    resource: ../tsconfig.nodeTools.json
    title: TypeScript configuration of the scripts and tool configurations
  - id: tsconfig-webview
    resource: ../tsconfig.webview.json
    title: TypeScript configuration of the webview
  - id: vite-config
    resource: ../vite.config.ts
    title: Vite configuration of the webview build
  - id: webview-provider
    resource: ../src/webviewProvider.ts
    title: Custom editor provider (webview HTML and CSP)
  - id: vscodeignore
    resource: ../.vscodeignore
    title: Files left out of the VSIX
  - id: verify-vsix
    resource: ../scripts/verify-vsix.ts
    title: Check that the packaged extension loads
  - id: vscode-version
    resource: ../scripts/vscode-version.ts
    title: Derive the Node and @types versions from the VS Code version
  - id: compiler-target
    resource: ../scripts/lib/compiler-target.ts
    title: ECMAScript edition per Node version
  - id: nvmrc
    resource: ../.nvmrc
    title: Node version for development and CI
  - id: adr-002
    resource: architecture/002-legacy-decorators.md
    title: "ADR 002: Legacy TypeScript decorators"
  - id: vscode-config
    resource: ../.vscode/
    title: Launch configurations, tasks and settings for VS Code
  - id: npmrc-registries
    resource: ../.npmrc
    title: npm registries
  - id: dependabot
    resource: ../.github/dependabot.yml
    title: Dependabot configuration
  - id: tsconfig-extension-host-test
    resource: ../tsconfig.extension-host-test.json
    title: TypeScript configuration of the tests in the extension host
  - id: vscode-test-config
    resource: ../.vscode-test.mjs
    title: Configuration of vscode-test
  - id: eslint
    resource: ../eslint.config.mjs
    title: ESLint configuration
  - id: jscpd
    resource: ../.jscpd.json
    title: jscpd configuration
  - id: fallow
    resource: ../.fallowrc.jsonc
    title: fallow configuration
  - id: prettier
    resource: ../.prettierrc.json
    title: Prettier configuration
  - id: ci
    resource: ../.github/workflows/ci.yml
    title: CI workflow
  - id: issue-340
    resource: https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340
    title: Tech Stack Modernization
---

# Purpose

This document describes how the extension is built, run, linted, packaged and checked: which tools produce which output, what goes into the VSIX, and what CI does. How the tests are run and written is described in [Testing](testing.md).

# Build outputs

The extension consists of two separately built parts (see [Architecture](architecture.md)):

| Part           | Tool                                                                        | Sources                   | Output                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Extension host | `tsc` with `tsconfig.extension.json`                                        | `src/`, `shared/`         | `out/src/`, `out/shared/` (ES modules, ES2024, with source maps); the entry point is `out/src/extension.js` (`main` in `package.json`) |
| Webview        | Vite with `vite.config.ts`, after a type check with `tsconfig.webview.json` | `webview-src/`, `shared/` | `webview/main.js` (one ES module, ES2024) and `webview/styles.css`                                                                     |

The extension host loads `webview/main.js`, `webview/styles.css` and `node_modules/@vscode/codicons/dist/codicon.css` into the webview through `asWebviewUri`. Both output folders are ignored by Git.[^tsconfig][^vite-config]

| tsconfig                                                                                  | Used by                                                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsconfig.json`                                                                           | VS Code                                                  | A solution file without files of its own: it lists the other eight configurations as references, so VS Code type-checks each file with the configuration that includes it.[^tsconfig-solution]                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `tsconfig.extension.json`                                                                 | `tsc` (extension host)                                   | Excludes test files (including the type tests `*.test-d.ts`), `__tests__` and `__mocks__`. `module` and `moduleResolution` are `nodenext`: TypeScript resolves imports the way Node does and writes ES modules, because `package.json` has `"type": "module"`; relative imports therefore need the `.js` extension (also for `.ts` files and for folders, `./folder/index.js`). `types` lists `node` and `vscode`, because TypeScript 6 no longer includes all `@types` packages by default. Decorators are compiled as legacy decorators (`experimentalDecorators`) with `useDefineForClassFields` (see [ADR 002](architecture/002-legacy-decorators.md)).[^adr-002] |
| `tsconfig.webview.json`                                                                   | `compile-webview` (type check only)                      | `esnext` modules with `moduleResolution: bundler`, because Vite resolves the imports, and the `DOM` library; `types: ["vite/client"]` declares the import of `styles.css`, which TypeScript 6 checks by default (`noUncheckedSideEffectImports`). No output (`noEmit`), because Vite builds the bundle. The same decorator settings as `tsconfig.extension.json`.[^tsconfig-webview]                                                                                                                                                                                                                                                                                  |
| `tsconfig.extension-test.json`, `tsconfig.webview-test.json`, `tsconfig.shared-test.json` | `npm run typecheck` and ESLint                           | Extend the two above with the Vitest globals and the Node types for the test files; the webview tests keep `vite/client` (see [Testing](testing.md#vitest-projects)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `tsconfig.integration-test.json`                                                          | `npm run typecheck` and ESLint                           | The integration tests in `test/integration/`, which use the extension host and the webview together. Extends `tsconfig.webview.json`, whose `bundler` resolution accepts both the imports with `.js` of the extension host and those without an extension of the webview, with the Vitest globals and the Node types; like the webview tests, it keeps `vite/client`.                                                                                                                                                                                                                                                                                                 |
| `tsconfig.nodeTools.json`                                                                 | `npm run typecheck` and ESLint                           | TypeScript that Node runs directly, without a build: the scripts in `scripts/` and their tests (see [Scripts](#scripts)), and the configuration files `vite.config.ts` and `vitest.config.ts`. `NodeNext` modules, no output (`noEmit`), `.ts` extensions in imports, and only syntax that Node can remove (`erasableSyntaxOnly`).[^tsconfig-node-tools]                                                                                                                                                                                                                                                                                                              |
| `tsconfig.extension-host-test.json`                                                       | `pretest:extension-host`, `npm run typecheck` and ESLint | The tests in the extension host in `test/extension-host/`, compiled to `.vscode-test/out/` with the Mocha, Node and `vscode` types and the `DOM` library for the mock webview. `nodenext` like the extension, so the tests and the mock webview (`mockWebview.ts`) are ES modules; the webview loads the mock with `type="module"` (see [Testing](testing.md#tests-in-the-extension-host)).[^tsconfig-extension-host-test]                                                                                                                                                                                                                                            |

ESLint takes the type information from the configurations that `tsconfig.json` references (the project service of `typescript-eslint`), so each TypeScript file must belong to at least one of them.

All configurations use the same ECMAScript edition, currently ES2024: `tsconfig.extension.json`, `tsconfig.webview.json`, `tsconfig.nodeTools.json` and `tsconfig.extension-host-test.json` set it as `target` and as the `ESxxxx` entry of `lib`, and the test configurations inherit it. `lib` holds only the edition and, for the webview and the tests in the extension host, `DOM`. The edition follows the lowest supported VS Code version; `npm run vscode:update` changes it and `npm run vscode:check` checks it (see [VS Code and Node versions](#vs-code-and-node-versions)). The code can therefore use only the syntax and library features of that edition, which every supported VS Code version has.[^compiler-target]

## The webview build

`vite.config.ts` builds the webview in Vite's library mode, which turns one entry file into fixed file names instead of building a web app from an `index.html`:[^vite-config]

- **One ES module.** `webview-src/main.ts` becomes `webview/main.js`, an ES module without chunks and without `import` or `export` statements. The extension host loads it with `<script type="module" nonce="…">`. The content security policy of the webview (`default-src 'none'`, scripts only with the nonce, styles only from `webview.cspSource`) allows nothing else: no second file, no inline script and no `eval`.[^webview-provider]
- **Styles.** `main.ts` imports `./styles.css` only so that Vite writes it as `webview/styles.css`, unminified; the bundle contains no CSS, and the HTML loads the file with a `<link>`.
- **Type check.** Vite only removes the types. `compile-webview` therefore runs `tsc --noEmit -p tsconfig.webview.json` first, as `ts-loader` did with webpack. `watch-webview` does not; in VS Code, type errors show up in the Problems view while you edit.
- **Source map.** Every build embeds its source map in `main.js`. The content security policy blocks loading a separate `.map` file, and the map makes stack traces from the installed extension, for example in bug reports, readable. It makes `main.js` several times larger.
- **Size warning.** A small plugin in `vite.config.ts` warns when a file in `webview/` is larger than 1 MiB as written, including the source map. Vite's own warning (`build.chunkSizeWarningLimit`) does not work in library mode. If the warning appears, decide whether the source map is still worth its size.
- **Target.** `build.target` is the `target` of `tsconfig.webview.json` in lower case, so Vite lowers newer syntax to the same edition that the extension host is compiled for, instead of using its default browser baseline, which does not depend on VS Code.
- **Output folder.** Vite empties `webview/` before every build, so no file from an earlier build is left behind.
- **Minification.** The production build (`--mode production`) shortens names and code, but in library mode with ES modules Vite keeps line breaks and `/* @__PURE__ */` comments. The watch build (`--mode development`) is not minified.

The whole package is an ES module (`"type": "module"`), so Node and Vite load `vite.config.ts` and `vitest.config.ts` as ES modules.

# npm scripts

| Script                                          | What it does                                                                                                                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run compile`                               | `compile-extension` (`tsc -p ./tsconfig.extension.json`) and then `compile-webview` (`tsc --noEmit -p tsconfig.webview.json` and `vite build --mode production`).     |
| `npm run watch`                                 | Runs `watch-extension` (`tsc -watch`) and `watch-webview` (`vite build --watch --mode development`) side by side with `concurrently`.                                 |
| `npm run clean`                                 | Deletes `out/` and `webview/`.                                                                                                                                        |
| `npm run lint`, `npm run lint:fix`              | Runs ESLint, jscpd, fallow and the check of the formatting on the repository (see [Lint](#lint)), or fixes what ESLint can.                                           |
| `npm run format`                                | Formats all files with Prettier (see [Formatting](#formatting)).                                                                                                      |
| `npm run package`                               | Builds the VSIX with `vsce package`; `vscode:prepublish` runs `npm run compile` first.                                                                                |
| `npm run package:verify`                        | Checks the VSIX (see [Packaging](#packaging)).                                                                                                                        |
| `npm run vscode:update`, `npm run vscode:check` | Change the lowest supported VS Code version and the versions derived from it, or check that they match (see [VS Code and Node versions](#vs-code-and-node-versions)). |
| `npm run generate-classes-from-schema`          | Generates the schema classes (see [Generated schema classes](#generated-schema-classes)).                                                                             |

The test scripts and `npm run typecheck` are described in [Testing](testing.md#running-the-tests).[^manifest]

# Scripts

`scripts/` contains the scripts behind `package:verify`, `vscode:check` and `vscode:update`: `verify-vsix.ts`, `vscode-version.ts`, and their modules in `scripts/lib/`. They are TypeScript, and Node runs them directly: it removes the types before it runs a file ("type stripping", without a flag since Node 23.6 and 22.18; the scripts run on the version from `.nvmrc`). This needs no build step, but sets three rules, which `tsconfig.nodeTools.json` checks:[^tsconfig-node-tools]

- Relative imports name the file with its extension, for example `./lib/node-setup.ts`.
- Imports of types only use `import type`.
- Only syntax that disappears with the types is allowed; an `enum`, for example, is not.

The scripts are ES modules because the whole package is one (`"type": "module"`). The scripts have tests of their own (see [Testing](testing.md#mocks-and-helpers)).

# Running in VS Code

`.vscode/launch.json` has the configuration "Run Extension", which starts a second VS Code window (Extension Development Host) with the extension loaded from the repository and without the other installed extensions (`--disable-extensions`), so that they cannot interfere with manual tests; VS Code's built-in extensions still run. Before it starts, it runs the default build task "Watch All" from `.vscode/tasks.json`, which runs both watch scripts. VS Code recognizes from their output when a watch build is finished: the task of `watch-webview` has a problem matcher for Vite's output, which also reports build errors with file, line and column. "Build All" compiles once without watching. `.vscode/settings.json` uses the TypeScript version from `node_modules`, and `.vscode/extensions.json` recommends the ESLint extension and the Extension Test Runner (see [Testing](testing.md#tests-in-the-extension-host)). The second launch configuration, "Extension Tests", runs the [tests in the extension host](testing.md#tests-in-the-extension-host) in the VS Code you work in: VS Code's JavaScript debugger reads `.vscode-test.mjs` (`testConfiguration`), and the task `npm: pretest:extension-host` compiles and assembles them first.[^vscode-config][^vscode-test-config]

# Packaging

`vsce package` builds `visual-xml-schema-editor-<version>.vsix` in the repository root. Before packaging it runs `vscode:prepublish`, which deletes `out/` and `webview/` (`npm run clean`) and then compiles both parts, so no file from an earlier build ends up in the VSIX.[^manifest]

What goes into the VSIX is controlled by `.vscodeignore`:[^vscodeignore]

- The sources (`src/`, `shared/`, `webview-src/`), all `.ts` and `.map` files, the tests and mocks in `out/`, and the tests in the extension host (`test/`, `.vscode-test/`) are left out.
- The repository and development files are left out: `.github/`, `.drafts/` (local drafts that git does not track), `scripts/`, `.vscode/`, `docs/`, `exampleFiles/`, `schema/`, `coverage/`, `test-results/`, `AGENTS.md`, `CONTRIBUTING.md`, `.git-blame-ignore-revs`, the configuration files and old VSIX files.
- `README.md` and `LICENSE` are packaged. The README is the page of the extension in the Marketplace; `vsce` turns its relative links into links to the repository given in `repository` in `package.json`.
- `node_modules/` is not listed. `vsce` adds the production dependencies (`dependencies` in `package.json`) and their dependencies, and leaves out the development dependencies. A runtime dependency must therefore be in `dependencies`, and `node_modules/` must not be excluded in `.vscodeignore`.

`npm run package:verify` runs `scripts/verify-vsix.ts`. It unpacks the VSIX into a temporary folder outside the repository (with `unzip`, on Windows with the `tar.exe` of Windows), so that the `node_modules/` of the repository cannot hide a missing file, writes a stub of the `vscode` module as a package into `node_modules/vscode/` of that folder, imports the entry point, an ES module like the extension, with `import()` and checks that it exports `activate()`. Node finds the stub through its normal package lookup in the parent folders, without module hooks; every other package must come from the VSIX. The stub is an ES module whose default export accepts any property access and call; it has no `then`, so that it is not taken for a promise. Because an ES module needs static export names, the stub has no named exports, and `vscode.window` is `undefined`: the check fails, although VS Code would load the extension, if a module uses such a value at the top level (for example `vscode.window.activeTextEditor` or `class X extends vscode.TreeItem`) or uses named imports such as `import { window } from "vscode"`. Uses inside functions are fine, because the check does not call them. Without an argument it checks the first `.vsix` file in the current folder. It finds missing dependencies and errors at load time, but does not start VS Code.[^verify-vsix]

`vsce` refuses to package when `@types/vscode` is newer than the lowest VS Code version in `engines.vscode`. Both are set together, see [VS Code and Node versions](#vs-code-and-node-versions).[^manifest]

# Generated schema classes

The classes in `shared/generated/` describe XML Schema itself and are used to read and write XSD files (see [Schema model](schema-model.md)). `npm run generate-classes-from-schema` creates them with `xsd2ts` from `@neumaennl/xmlbind-ts`, using `schema/XMLSchema.xsd`, after deleting the existing `.ts` files in that folder; the README there stays. They are not edited by hand; ESLint, jscpd, fallow and Prettier ignore them, and the coverage report leaves them out. `xsd2ts` writes the `.js` extension in relative imports, as ES modules require (`--no-import-extensions` would omit it). After an update of `xmlbind-ts`, they are generated again and committed.[^manifest][^eslint]

# Dependencies and Node

`@neumaennl/xmlbind-ts` is published in GitHub Packages. `.npmrc` takes all `@neumaennl` packages from `npm.pkg.github.com` and everything else from `registry.npmjs.org`. The token comes from the user's npmrc, whose line `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}` reads it from the environment variable `NODE_AUTH_TOKEN`; `npm install` and `npm ci` therefore need that line and `NODE_AUTH_TOKEN` set to a GitHub token that can read packages (see `CONTRIBUTING.md`). In CI, `actions/setup-node` writes the line (`registry-url`, `scope`), and `NODE_AUTH_TOKEN` is the workflow's `GITHUB_TOKEN`. The line is not in the repository's `.npmrc`: Dependabot takes the token of such a line literally, sends `${NODE_AUTH_TOKEN}` and drops its own credential for GitHub Packages, which it gets because the package grants this repository read access.[^npmrc-registries][^ci]

The TypeScript version is 6.0, the last release on TypeScript's JavaScript codebase. TypeScript 7 is not used yet, because `typescript-eslint` supports TypeScript only below 6.1; support is expected with TypeScript 7.1. Dependabot has been told to ignore TypeScript 7.0.x.[^manifest]

Dependabot opens pull requests for npm packages and GitHub Actions every day and groups the ESLint packages, and `vitest` with `@vitest/coverage-*`, which requires exactly the same `vitest` version. It ignores minor and major updates of `@types/vscode` and `@types/node`, which follow the VS Code version (see below); patch updates within their `~` range are allowed. Dependabot reads its configuration only from the default branch `main`. An update of Prettier can change the formatting (see [Formatting](#formatting)).[^dependabot]

`@vscode/test-cli`, which runs the tests in the extension host, still brings Mocha 11 with known vulnerabilities in two of its dependencies; they stay until a release with Mocha 12 is out (see [the known issue](known-issues.md#mocha-brings-dependencies-with-known-vulnerabilities)).

## VS Code and Node versions

The extension runs in the extension host of VS Code, which uses the Node version of the Electron that VS Code ships, not the Node installed on the machine. The lowest supported VS Code version in `engines.vscode` therefore decides which Node version the extension runs on, and four other values are derived from it:[^manifest][^nvmrc][^vscode-version]

| Value              | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `engines.vscode`   | `^` and the lowest supported VS Code version, a release `x.y.0`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `@types/vscode`    | `~` and the highest published version that is not newer than that VS Code version, so that `vsce` packages and the types offer no API that this version lacks.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `@types/node`      | `~` and the highest published version with the major version of the extension host's Node and a minor version that is not higher, so that the types offer no Node API that the extension host lacks.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `.nvmrc`           | The exact Node version of the extension host. Development and CI use it, so the tests run on that version.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ECMAScript edition | The `target` of the [`@tsconfig/bases`](https://github.com/tsconfig/bases) configuration for the major version of the extension host's Node, for example `es2024` for Node 24 (`@tsconfig/node24`), in `target` and `lib` of the tsconfig files and in `ecmaVersion` in `eslint.config.mjs` (see [Build outputs](#build-outputs)). The `ESNext.*` libraries of the base are left out, because their content changes with every TypeScript release and could allow APIs that this Node version lacks. The webview gets the same edition: it runs in the Chromium of the same Electron, which shares the V8 engine with Node. |

VS Code builds a release with the Electron version in the `target` of the `.npmrc` at its tag in `microsoft/vscode`; the `electron` entry in its `package.json` can differ or be missing. The Electron release list gives the Node version of each Electron version. Inside VS Code, `process.versions` in the developer tools shows both.

The runtime dependencies must accept the Node version of the extension host. `@neumaennl/xmlbind-ts` declares `>=24`, which fits; nothing checks this automatically yet (see [Known issues](known-issues.md#vscodecheck-does-not-check-the-node-versions-that-runtime-dependencies-require)).

To change the lowest supported VS Code version, run `npm run vscode:update`. It lists the VS Code releases from the current minimum on, with their release date, Electron and Node version, the matching `@types/vscode` and `@types/node`, the ECMAScript edition, and the end of life of the Node version, and asks for the new minimum; `npm run vscode:update -- <version>` skips the question. It refuses a version whose Node version has no `@tsconfig/bases` configuration. It writes the four values to `package.json` and `.nvmrc`, with the line endings that `package.json` has, and replaces the edition in all `tsconfig*.json` files and in `eslint.config.mjs`, changing nothing else in them.[^compiler-target] After asking, it installs the Node version with nvm, nvm-windows or fnm (or uses the running Node if it already has that version) and runs `npm install`, `npm run lint`, `npm test`, `npm run package` and `npm run package:verify` with it. Without a terminal, or if no version manager can install the Node version, it prints these steps instead. Then fix what fails, update the requirements in `README.md`, and commit the changes together.[^vscode-version]

A Node version past its end of life is a poor choice: Node no longer fixes it, and current development tools stop supporting it.

The script reads the GitHub API, `raw.githubusercontent.com` (VS Code's `.npmrc`, the Node release schedule and the `@tsconfig/bases` configurations), the Electron release list and the npm registry. It sends `GITHUB_TOKEN` or `GH_TOKEN` to the GitHub API if one of them is set. `npm run vscode:check` derives the values from `engines.vscode` in the same way and fails if `@types/vscode`, `@types/node` or `.nvmrc` differ, if there is no `@tsconfig/bases` configuration for the Node version, or if a `target`, an `ESxxxx` entry of `lib` or an `ecmaVersion` names another edition; CI runs it (see [CI](#ci)). If `@tsconfig/bases` raises the edition for a Node version, the check fails until `npm run vscode:update -- <current version>` has taken it over. The check does not ask TypeScript whether it supports the edition; `npm test` and `npm run lint` fail if it does not.[^vscode-version][^compiler-target][^ci]

# Lint

`npm run lint` runs these checks in parallel, with `concurrently`:[^manifest]

- ESLint;
- the copy-paste detector jscpd (see [Duplicated code](#duplicated-code));
- fallow, once for the whole project and once in production mode (see [Unused code](#unused-code));
- Prettier, which checks the formatting with `prettier --check .` (see [Formatting](#formatting)).

How `concurrently` runs them:

- all checks always run to the end, so one run reports all problems;
- the run fails if one of them fails;
- `--group` prints the output of each check as one block, labeled `[eslint]`, `[jscpd]`, `[fallow]`, `[fallow-production]`, `[fallow-architecture]` and `[prettier]`.

To run one check alone, use `npx eslint .`, `npx jscpd`, `npx fallow dead-code --no-cache --fail-on-issues`, `npx fallow dead-code --production --no-cache --fail-on-issues`, `npx fallow architecture --no-cache` or `npx prettier --check .`. They read the same configuration as `npm run lint`. `npm run lint:fix` runs only ESLint, because jscpd and fallow fix nothing; `npm run format` fixes the formatting.

## ESLint

`eslint.config.mjs` is a flat configuration:[^eslint]

- It ignores the build outputs `out/` and `webview/`, the reports of the tests in `coverage/` and `test-results/`, `.vscode-test/`, `node_modules/` and generated code.
- Only `.ts` and `.mjs` files are allowed; `.js`, `.cjs`, `.mts` and `.cts` files are errors. Without this rule, ESLint would skip `.mts` and `.cts` files without notice, because no other part of the configuration matches them. `eslint.config.mjs` and `.vscode-test.mjs` are the only JavaScript files; `.mjs` files in every folder are checked with the recommended JavaScript rules of ESLint; `vscode-test` cannot load a TypeScript configuration. All other code, including the scripts in `scripts/` and the configurations of Vite and Vitest, is TypeScript (`.ts`). ESLint cannot load a TypeScript configuration without the extra dependency `jiti` (Node would need an unstable flag), so `eslint.config.mjs` stays JavaScript for now; check again when ESLint can do it. The rule therefore does not forbid `.mjs` files yet.
- TypeScript files are checked with the type information from the tsconfig files listed in [Build outputs](#build-outputs), with the recommended rules of ESLint and the strict and stylistic rules of `typescript-eslint`, including the ones that need type information (`strict-type-checked` and `stylistic-type-checked`). Among them, checks that the types make unnecessary are errors (`no-unnecessary-condition`, for example `x ?? []` on an array that is never `undefined`), and so are non-null assertions (`x!`), `||` where `??` is meant (`prefer-nullish-coalescing`) and promises that are neither awaited nor handled. In addition, return types must be declared, `any` is an error, types are imported with `import type` (`consistent-type-imports`), template literals may contain strings and numbers but not values such as `undefined` (`restrict-template-expressions`), a `switch` on a union or enum must handle every case, by listing it or with a `default` branch (`switch-exhaustiveness-check` with `considerDefaultExhaustiveForUnions`), and `unknown` in type assertions and variable annotations is forbidden (`no-restricted-syntax`); an exception needs an `eslint-disable-next-line` comment with a reason.
- Unused code within a file is found by ESLint: unused variables, imports and parameters (`@typescript-eslint/no-unused-vars`; names that start with `_` are allowed) and private class members that are never used (`@typescript-eslint/no-unused-private-class-members`, which unlike the rule of ESLint also checks members declared with `private`). TypeScript reports unreachable code: all tsconfig files set `allowUnreachableCode: false`, and none sets `noUnusedLocals`, which would report the same as ESLint. They also set `noUncheckedIndexedAccess`, so that an index access may return `undefined`; this also gives `no-unnecessary-condition` the right types for checks such as `items[0]?.name`. Unused code across files is found by fallow (see [Unused code](#unused-code)).
- The size limits of the [development guidelines](development-guidelines.md#code-size): `max-lines` allows 500 lines per file and `max-lines-per-function` 120 lines per function, blank lines and comments included. Test helpers and mocks have the same limits; test files have their own (see below).
- TSDoc, as the [development guidelines](development-guidelines.md#tsdoc) ask: `tsdoc/syntax` of `eslint-plugin-tsdoc` checks the syntax of the comments, which includes the hyphen between the name and the description of a parameter; the rules of `eslint-plugin-jsdoc` check that function declarations, methods and classes have a comment, and that it describes every parameter, the return value and the errors thrown. Arrow functions and function expressions, mostly small local helpers and callbacks, need no comment. Destructured parameters are not checked, because TSDoc describes their fields at their type.
- Some of the strict and stylistic rules change code in ways that are not obvious:
  - `no-confusing-void-expression`: an arrow function whose body is a call that returns nothing gets braces, `() => { save(); }` instead of `() => save()`. Without braces, the arrow function returns the value of its body, so the short form looks as if it returned something; with braces, it is clear that nothing is returned.
  - `prefer-regexp-exec`: a regular expression is applied with `re.exec(text)`, not `text.match(re)`. What `match` returns depends on the flag `g`: without it, the first match with its groups, like `exec`; with it, all matches without groups. `exec` always returns the same kind of result, so adding `g` later cannot change it silently.
  - `array-type` with `array-simple`: `T[]` for simple element types, `Array<…>` and `ReadonlyArray<…>` for complex ones, which would need parentheses otherwise (`Array<keyof T>` instead of `(keyof T)[]`).
  - `consistent-type-definitions`: object types are declared as `interface`; `type` stays for unions, mapped and conditional types. Both describe object shapes alike, but interfaces can be extended with `extends`, and two interfaces of the same name merge instead of failing.
- The local rule `style/max-ternary-lines`, defined in `eslint.config.mjs`, reports conditional expressions that span more than three lines, which the guidelines ask to write as `if`/`else` (see [Code quality](development-guidelines.md#code-quality)).
- `no-restricted-imports` enforces the [project boundaries](development-guidelines.md#project-boundaries): code in `shared/` may not import from `src/`, `webview-src/`, `test/` or `scripts/`, code in `src/` not from `webview-src/`, `test/` or `scripts/`, code in `webview-src/` not from `src/`, `test/` or `scripts/`, and code in `scripts/` not from `src/`, `webview-src/`, `shared/` or `test/`. The integration tests in `test/integration/` are not restricted. In the tests of the webview, the rule also rejects `unmarshal` from `xmlbind-ts` and the helpers of `shared/__tests__/schemaTestHelpers.ts` that return schema objects as `unmarshal()` creates them, so that these tests get the schema through JSON like the webview (see [Testing](testing.md#mocks-and-helpers)). Because a later setting of a rule replaces an earlier one, this setting repeats the project boundary of `webview-src/`.
- Test files, their helpers in `__tests__` and mocks additionally use the recommended rules of `@vitest/eslint-plugin` and the Vitest globals (see [Testing](testing.md#conventions)), `vitest/consistent-test-it` requires `test()` instead of `it()`, `vitest/valid-title` requires the names of tests to start with "should ", and `vitest/no-importing-vitest-globals` forbids importing the API of Vitest, which the tests get as globals (`globals: true` in `vitest.config.ts`); types are still imported with `import type`. `vitest/valid-expect` allows a message as second argument of `expect()`, and `vitest/expect-expect` counts calls of functions whose names match `expect*` or `runCommandExpect*` as assertions. Empty arrow functions, such as `mockImplementation(() => {})`, are allowed there, and non-null assertions in test files (see [TypeScript](development-guidelines.md#typescript)). The type tests (`*.test-d.ts`) may produce the empty object type `{}`, which `Omit<…>` gives for a payload with one field (`no-generated-empty-object-type` is off). `max-lines` limits test files to 1000 lines, and the local rule `tests/max-lines-per-test`, defined in `eslint.config.mjs`, limits single tests to 50 lines instead of `max-lines-per-function`, which would also count the `describe` callbacks that hold the tests (see [Code size](development-guidelines.md#code-size)). The tests in the extension host in `test/extension-host/` use Mocha instead and get the Mocha and browser globals; the same size limits and the exception for non-null assertions apply to them, with their `suite` callbacks in place of `describe`.

## Duplicated code

jscpd checks the TypeScript and JavaScript files of the whole repository, including the tests. It skips what `.gitignore` excludes, such as `out/`, `webview/`, `coverage/` and `node_modules/`, and the generated schema classes in `shared/generated/`. Its settings are the same as in [xmlbind-ts](https://github.com/neumaennl/xmlbind-ts/blob/reimplementation/docs/build-and-release.md#duplicated-code), except for imports:[^jscpd]

- **Size.** A clone is a block of at least 50 tokens and 5 lines that appears more than once. Tokens are keywords, names, operators, punctuation and literals; whitespace and comments do not count. 50 tokens are about 5 to 7 lines of code. Below that, jscpd mostly finds repetition that is fine, such as the setup of tests.
- **Names.** Names are ignored, so a copy with renamed variables is found. Each name must stand for one name in the other block: `a = b + c` matches `x = y + z`, but not `x = x + x`.
- **Literals.** Strings and numbers are compared. Code that differs only in them is not a clone, such as the cases of a `switch` or tests with different data.
- **Imports.** Import statements are skipped (`ignorePattern`). [Prettier](#formatting) puts each name of a long import on its own line, and since names are ignored, any two long imports would match.
- **Failing.** Every clone fails the run. There is no threshold of duplicated lines, because a percentage changes as the code grows.
- **No files.** A run that finds no files fails, so that a broken configuration does not pass unnoticed.

jscpd only finds code that is written the same way. Logic that the extension and the webview each implement in their own way is not found (see [Duplicated and dead code](known-issues.md#duplicated-and-dead-code)).

Code that has to stay duplicated is put between `// jscpd:ignore-start` and `// jscpd:ignore-end`, with a comment that gives the reason (see [Code quality](development-guidelines.md#code-quality)). There are two such blocks: the list of flags in `DiagramItem`, which are distinct fields of the same type, and the calls in `DiagramBuilder` that process the top-level components of each kind with one function.

fallow, which checks for [unused code](#unused-code), can find duplicates as well. The installed version cannot check that renamed names map one to one, and it does not compare the text of template literals. So jscpd stays until a released version of fallow can do both ([#460](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/460)).

## Unused code

ESLint and TypeScript only find unused code within one file (see [ESLint](#eslint)). [fallow](https://fallow.tools) checks the whole project.[^fallow] It finds:

- files that nothing imports;
- exports and types that no other module imports, also when the same file uses them;
- public and static class members and enum members that nothing uses;
- dependencies in `package.json` that no code uses, and packages that code uses but `package.json` does not list.

fallow finds the entry points itself, in `package.json` and in the configurations of the tools, such as Vite and Vitest. It reads the code without type information. Its rules are the same as in [xmlbind-ts](https://github.com/neumaennl/xmlbind-ts/blob/reimplementation/docs/build-and-release.md#unused-code). `.fallowrc.jsonc` adds what fallow cannot find by itself, each with a comment that gives the reason:[^fallow]

- It leaves out the generated schema classes in `shared/generated/`.
- `src/extension.ts` is an entry point, because `package.json` names the compiled file in `out/`.
- Files that only tests and tools use are support entry points: `.vscode-test.mjs`, the tests in the extension host and the mock webview in `test/extension-host/`, the `vscode` mock in `src/__mocks__/` and the type tests (`*.test-d.ts`). Vitest uses the last two through settings that fallow does not read.
- Two dependencies count as used: `@vscode/codicons`, whose stylesheet `webviewProvider.ts` loads by path, and `@vscode/test-electron`, which `@vscode/test-cli` imports without declaring it.
- `resolveCustomTextEditor()` counts as used in a class that implements `vscode.CustomTextEditorProvider`, because VS Code calls it.

`npm run lint` runs fallow three times:

- **`fallow dead-code`** checks the whole project, including the tests.
- **`fallow dead-code --production`** leaves out the tests, the support entry points, the configurations of the tools and the devDependencies. It finds code that only tests use, such as an export that only a test imports, or a method that only tests call.
- **`fallow architecture`** checks the layers within the extension host (see [Layers](#layers)) and that there are no import cycles.

The two runs of `fallow dead-code` use `--fail-on-issues`, so every finding fails the run, also the kinds that fallow only reports as warnings by default, such as an unused devDependency. There is no baseline. `--no-cache` keeps fallow from writing a cache into the checkout.

`.fallowrc.jsonc` sets two rules:[^fallow]

- `require-suppression-reason`: an ignore comment must give its reason after `--`, as in `// fallow-ignore-next-line unused-export -- <reason>`;
- `stale-suppressions` as an error: an ignore comment that no longer suppresses anything fails the run, so it is removed when it is no longer needed.

Its limits:

- fallow does not check protected class members (see [Unused protected class members are not detected](known-issues.md#unused-protected-class-members-are-not-detected)). ESLint checks private members.
- Without type information, fallow does not see that a member is used when it is called by a computed name, such as `obj[name]()`. Such a member needs an ignore comment with the reason.
- Members with decorators are not checked, because a decorator can use them.
- The production mode also leaves out the configurations of the build tools. `readTarget()` in `scripts/lib/compiler-target.ts`, which only `vite.config.ts` uses, therefore has an ignore comment.
- fallow finds unused files, exports and members, not unused branches within a function, such as the cases of a `switch` that no caller reaches. The coverage report shows them (see [Testing](testing.md#coverage)), so compare it before and after a change that removes code.

## Layers

ESLint checks which projects may use which (see [ESLint](#eslint)). Within a project, `boundaries` in `.fallowrc.jsonc` checks the layers of [ADR 006](architecture/006-module-structure.md#layers):[^fallow] each zone lists the files of a layer, and each rule the zones that a zone may import from besides itself. In the extension host, each layer may use the layer directly below it, the schema access (`src/schemaReferences/`, `schemaNavigator.ts`, `commandUtils.ts`, `schemaXml.ts`) and `shared/`: `extension.ts` and `webviewProvider.ts` the pipeline, the pipeline the dispatch, the dispatch the validators and the executors. Validators and executors may only use the schema access and `shared/`, and not each other; the schema access may only use `shared/`. Files that are in no zone, such as the test helpers in `src/__tests__`, are not checked. A new module of the extension host is added to a zone; a module that would need a layer above it moves its code down (see [ADR 006](architecture/006-module-structure.md#consequences)).

## Formatting

Prettier formats TypeScript, `.mjs`, JSON, JSONC, YAML and Markdown, with the same settings as [xmlbind-ts](https://github.com/neumaennl/xmlbind-ts/blob/reimplementation/docs/build-and-release.md#formatting).[^prettier]

- `npm run format` formats all files.
- `npm run lint` checks them with `prettier --check .`, so CI does too.
- VS Code formats these files on save with the Prettier extension, which `.vscode/extensions.json` recommends.[^vscode-config] The settings name the languages one by one, so that VS Code does not format other files, such as XSD, with another formatter.

The settings in `.prettierrc.json`:[^prettier]

- Lines have at most 120 characters.
- Trailing commas are written in arrays, objects, imports and exports, and type parameters (`"trailingComma": "es5"`). They are not written after the parameters of a function, because a comma there looks strange. Prettier cannot tell definitions from calls, so the arguments of a call get none either.
- Everything else is Prettier's default: double quotes, semicolons, two spaces and LF line endings.

Prettier skips what `.gitignore` excludes. `.prettierignore` adds three more:

- `package-lock.json`, which npm writes;
- `.drafts/`, for local drafts. It is excluded in `.git/info/exclude`, which Prettier does not read;
- `shared/generated/`, the [generated schema classes](#generated-schema-classes). The next generation would undo their formatting.

The version of Prettier is pinned, without `^`, because a patch release can format differently. When Dependabot updates it and CI reports unformatted files, run `npm run format` on its branch.

No ESLint rule clashes with Prettier. This was checked with the command-line check of `eslint-config-prettier`, `npx eslint-config-prettier <file>`, for a file of each block of `eslint.config.mjs`: the configuration itself, the extension, the webview, the scripts, tests, type tests, mocks and the tests in the extension host; run it again when rules are added. It only names `no-unexpected-multiline`, which it cannot check automatically:

- The rule reports statements that a missing semicolon joins with the next line. It stays on.
- In rare cases, Prettier breaks a chain of calls before an index access such as `[i]`, and the rule reports that. Then split the expression into two statements.

The size rules count lines, including the line breaks that Prettier adds (see [ESLint](#eslint)). Code that the formatting pushes past a limit is split like any other code that is too long. The same holds for jscpd: code that Prettier spreads over more lines can become a clone (see [Duplicated code](#duplicated-code)).

`.git-blame-ignore-revs` lists the commits that only reformat the code, such as the one that formatted the whole repository with Prettier:

- GitHub skips them in its blame view.
- Locally, `git blame` skips them after `git config blame.ignoreRevsFile .git-blame-ignore-revs`.
- The file names the commits by their hashes, so these commits must not be rewritten: a branch with them is merged without squashing or rebasing.

# CI

The workflow `ci.yml` runs on pushes to `main` and on every pull request, whatever its target branch, on Ubuntu with the Node version from `.nvmrc`. A new push to a pull request cancels the run for the previous one; runs for pushes each have a concurrency group of their own, so none of them is cancelled or held back:[^ci]

1. `npm run vscode:check`, which fails if `@types/vscode`, `@types/node`, `.nvmrc` or the ECMAScript edition of the configurations don't match `engines.vscode` (see [VS Code and Node versions](#vs-code-and-node-versions)).
2. `npm ci`, with `NODE_AUTH_TOKEN` and the auth line that `actions/setup-node` writes for GitHub Packages.
3. `npm run lint`, which runs ESLint, jscpd, fallow and Prettier.
4. `npm run package`, the only build: `vscode:prepublish` deletes `out/` and `webview/` and compiles both parts, including the type check of the webview. Then `npm run package:verify`.
5. `npm run typecheck`, and the Vitest tests with coverage (`npx vitest run --coverage`), which fail if a coverage metric is below the threshold in `vitest.config.ts` (see [Testing](testing.md#coverage)). Vitest runs on the sources and needs no build; `npm test` is not used, because its `pretest` would compile again (see [Testing](testing.md#ci)).
6. The [tests in the extension host](testing.md#tests-in-the-extension-host) on the build from step 4: `npm run stage:extension-host` compiles only the tests and assembles `.vscode-test/`, and `xvfb-run -a npx vscode-test --reporter json` runs them, with a virtual display because the runner has none. `npm run test:extension-host` is not used, because its `pretest` would compile the extension again. Mocha's `json` reporter writes `test-results/extension-host.json`, the output file set in `.vscode-test.mjs`. Mocha runs only one reporter at a time, so the test names are then missing from the log. `.vscode-test.mjs` sets no reporter itself, because one there would override `--reporter` from the command line; so `npm run test:extension-host` uses Mocha's default reporter, and the Testing view uses the Extension Test Runner's own. `actions/cache` keeps the downloaded VS Code (`.vscode-test/vscode-linux-x64-<version>/`) under a key with the version from `engines.vscode`, so CI downloads it only when the version changes, or when GitHub has removed the cache after seven days without use.
7. The job summary gets two sections with a title each: "Vitest", with its test report and the coverage report, and "Extension host", with its test report. Vitest marks the lines of failing tests. The test reports come from `dorny/test-reporter`, the coverage report from `davelosert/vitest-coverage-report-action`, which also keeps one comment with the coverage report up to date on pull requests from this repository; for that the workflow has the permission `pull-requests: write`. Pull requests from forks get no write access, so they get no comment. Each report step only runs if its input file exists (`hashFiles()`), for example not when an earlier step failed before the tests ran. The coverage report is also missing when a Vitest test fails, because Vitest then writes no coverage files.

# Planned changes

The [Tech Stack Modernization](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340) plans one more change to the build:[^issue-340]

- Convert `eslint.config.mjs` to TypeScript as soon as ESLint can load a TypeScript configuration without an extra dependency (such as `jiti`) and without an unstable flag. Then the ESLint rule that allows only `.ts` and `.mjs` files also forbids `.mjs` files, with an exception for `.vscode-test.mjs`, which stays JavaScript because `vscode-test` only loads `.js`, `.cjs` and `.mjs` configurations. The goal is a repository without JavaScript files.

[^manifest]: Extension manifest (scripts, dependencies, engines)

[^tsconfig]: TypeScript configuration of the extension host

[^tsconfig-solution]: Solution tsconfig that references all TypeScript configurations

[^tsconfig-node-tools]: TypeScript configuration of the scripts and tool configurations

[^tsconfig-webview]: TypeScript configuration of the webview

[^vite-config]: Vite configuration of the webview build

[^webview-provider]: Custom editor provider (webview HTML and CSP)

[^vscodeignore]: Files left out of the VSIX

[^verify-vsix]: Check that the packaged extension loads

[^vscode-version]: Derive the Node and @types versions from the VS Code version

[^compiler-target]: ECMAScript edition per Node version

[^nvmrc]: Node version for development and CI

[^adr-002]: ADR 002: Legacy TypeScript decorators

[^vscode-config]: Launch configurations, tasks and settings for VS Code

[^npmrc-registries]: npm registries

[^dependabot]: Dependabot configuration

[^tsconfig-extension-host-test]: TypeScript configuration of the tests in the extension host

[^vscode-test-config]: Configuration of vscode-test

[^eslint]: ESLint configuration

[^jscpd]: jscpd configuration

[^fallow]: fallow configuration

[^prettier]: Prettier configuration

[^ci]: CI workflow

[^issue-340]: Tech Stack Modernization
