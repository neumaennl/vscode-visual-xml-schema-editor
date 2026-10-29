---
type: Build Process
title: Build and packaging
description: How the extension is built, run, linted, packaged and checked - the build outputs and tsconfig files, the npm scripts, the scripts in TypeScript, running it in VS Code, the VSIX and its check, the generated schema classes, dependencies and the Node version, ESLint, CI, and planned changes.
tags: [build, packaging, vsix, vite, typescript, eslint, ci, dependencies]
status: stable
generated: { by: human:neumaennl, at: 2026-10-29T15:16:40Z }
verified: { by: human:neumaennl, at: 2026-10-29T15:30:22Z }
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

| Part | Tool | Sources | Output |
|---|---|---|---|
| Extension host | `tsc` with `tsconfig.extension.json` | `src/`, `shared/` | `out/src/`, `out/shared/` (ES modules, ES2020, with source maps); the entry point is `out/src/extension.js` (`main` in `package.json`) |
| Webview | Vite with `vite.config.ts`, after a type check with `tsconfig.webview.json` | `webview-src/`, `shared/` | `webview/main.js` (one ES module) and `webview/styles.css` |

The extension host loads `webview/main.js`, `webview/styles.css` and `node_modules/@vscode/codicons/dist/codicon.css` into the webview through `asWebviewUri`. Both output folders are ignored by Git.[^tsconfig][^vite-config]

| tsconfig | Used by | Notes |
|---|---|---|
| `tsconfig.json` | VS Code | A solution file without files of its own: it lists the other seven configurations as references, so VS Code type-checks each file with the configuration that includes it.[^tsconfig-solution] |
| `tsconfig.extension.json` | `tsc` (extension host) | Excludes test files (including the type tests `*.test-d.ts`), `__tests__` and `__mocks__`. `module` and `moduleResolution` are `nodenext`: TypeScript resolves imports the way Node does and writes ES modules, because `package.json` has `"type": "module"`; relative imports therefore need the `.js` extension (also for `.ts` files and for folders, `./folder/index.js`). `types` lists `node` and `vscode`, because TypeScript 6 no longer includes all `@types` packages by default. Decorators are compiled as legacy decorators (`experimentalDecorators`) with `useDefineForClassFields` (see [ADR 002](architecture/002-legacy-decorators.md)).[^adr-002] |
| `tsconfig.webview.json` | `compile-webview` (type check only) | `esnext` modules with `moduleResolution: bundler`, because Vite resolves the imports, and the `DOM` library; `types: ["vite/client"]` declares the import of `styles.css`, which TypeScript 6 checks by default (`noUncheckedSideEffectImports`). No output (`noEmit`), because Vite builds the bundle. The same decorator settings as `tsconfig.extension.json`.[^tsconfig-webview] |
| `tsconfig.extension-test.json`, `tsconfig.webview-test.json`, `tsconfig.shared-test.json` | `npm run typecheck` and ESLint | Extend the two above with the Vitest globals and the Node types for the test files; the webview tests keep `vite/client` (see [Testing](testing.md#vitest-projects)). |
| `tsconfig.nodeTools.json` | `npm run typecheck` and ESLint | TypeScript that Node runs directly, without a build: the scripts in `scripts/` and their tests (see [Scripts](#scripts)), and the configuration files `vite.config.ts` and `vitest.config.ts`. `NodeNext` modules, no output (`noEmit`), `.ts` extensions in imports, and only syntax that Node can remove (`erasableSyntaxOnly`).[^tsconfig-node-tools] |
| `tsconfig.extension-host-test.json` | `pretest:extension-host`, `npm run typecheck` and ESLint | The tests in the extension host in `test/extension-host/`, compiled to `.vscode-test/out/` with the Mocha, Node and `vscode` types and the `DOM` library for the mock webview. `nodenext` like the extension, so the tests and the mock webview (`mockWebview.ts`) are ES modules; the webview loads the mock with `type="module"` (see [Testing](testing.md#tests-in-the-extension-host)).[^tsconfig-extension-host-test] |

ESLint uses all configurations except `tsconfig.json`, so each TypeScript file must belong to at least one of them.

## The webview build

`vite.config.ts` builds the webview in Vite's library mode, which turns one entry file into fixed file names instead of building a web app from an `index.html`:[^vite-config]

- **One ES module.** `webview-src/main.ts` becomes `webview/main.js`, an ES module without chunks and without `import` or `export` statements. The extension host loads it with `<script type="module" nonce="…">`. The content security policy of the webview (`default-src 'none'`, scripts only with the nonce, styles only from `webview.cspSource`) allows nothing else: no second file, no inline script and no `eval`.[^webview-provider]
- **Styles.** `main.ts` imports `./styles.css` only so that Vite writes it as `webview/styles.css`, unminified; the bundle contains no CSS, and the HTML loads the file with a `<link>`.
- **Type check.** Vite only removes the types. `compile-webview` therefore runs `tsc --noEmit -p tsconfig.webview.json` first, as `ts-loader` did with webpack. `watch-webview` does not; in VS Code, type errors show up in the Problems view while you edit.
- **Source map.** Every build embeds its source map in `main.js`. The content security policy blocks loading a separate `.map` file, and the map makes stack traces from the installed extension, for example in bug reports, readable. It makes `main.js` several times larger.
- **Size warning.** A small plugin in `vite.config.ts` warns when a file in `webview/` is larger than 1 MiB as written, including the source map. Vite's own warning (`build.chunkSizeWarningLimit`) does not work in library mode. If the warning appears, decide whether the source map is still worth its size.
- **Output folder.** Vite empties `webview/` before every build, so no file from an earlier build is left behind.
- **Minification.** The production build (`--mode production`) shortens names and code, but in library mode with ES modules Vite keeps line breaks and `/* @__PURE__ */` comments. The watch build (`--mode development`) is not minified.

The whole package is an ES module (`"type": "module"`), so Node and Vite load `vite.config.ts` and `vitest.config.ts` as ES modules.

# npm scripts

| Script | What it does |
|---|---|
| `npm run compile` | `compile-extension` (`tsc -p ./tsconfig.extension.json`) and then `compile-webview` (`tsc --noEmit -p tsconfig.webview.json` and `vite build --mode production`). |
| `npm run watch` | Runs `watch-extension` (`tsc -watch`) and `watch-webview` (`vite build --watch --mode development`) side by side with `concurrently`. |
| `npm run clean` | Deletes `out/` and `webview/`. |
| `npm run lint`, `npm run lint:fix` | Runs ESLint on the repository, or fixes what it can. |
| `npm run package` | Builds the VSIX with `vsce package`; `vscode:prepublish` runs `npm run compile` first. |
| `npm run package:verify` | Checks the VSIX (see [Packaging](#packaging)). |
| `npm run vscode:update`, `npm run vscode:check` | Change the lowest supported VS Code version and the versions derived from it, or check that they match (see [VS Code and Node versions](#vs-code-and-node-versions)). |
| `npm run generate-classes-from-schema` | Generates the schema classes (see [Generated schema classes](#generated-schema-classes)). |

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
- The repository and development files are left out: `.github/`, `scripts/`, `.vscode/`, `docs/`, `exampleFiles/`, `schema/`, `coverage/`, `test-results/`, `AGENTS.md`, `CONTRIBUTING.md`, the configuration files and old VSIX files.
- `README.md` and `LICENSE` are packaged. The README is the page of the extension in the Marketplace; `vsce` turns its relative links into links to the repository given in `repository` in `package.json`.
- `node_modules/` is not listed. `vsce` adds the production dependencies (`dependencies` in `package.json`) and their dependencies, and leaves out the development dependencies. A runtime dependency must therefore be in `dependencies`, and `node_modules/` must not be excluded in `.vscodeignore`.

`npm run package:verify` runs `scripts/verify-vsix.ts`. It unpacks the VSIX into a temporary folder outside the repository (with `unzip`, on Windows with the `tar.exe` of Windows), so that the `node_modules/` of the repository cannot hide a missing file, writes a stub of the `vscode` module as a package into `node_modules/vscode/` of that folder, imports the entry point, an ES module like the extension, with `import()` and checks that it exports `activate()`. Node finds the stub through its normal package lookup in the parent folders, without module hooks; every other package must come from the VSIX. The stub is an ES module whose default export accepts any property access and call; it has no `then`, so that it is not taken for a promise. Because an ES module needs static export names, the stub has no named exports, and `vscode.window` is `undefined`: the check fails, although VS Code would load the extension, if a module uses such a value at the top level (for example `vscode.window.activeTextEditor` or `class X extends vscode.TreeItem`) or uses named imports such as `import { window } from "vscode"`. Uses inside functions are fine, because the check does not call them. Without an argument it checks the first `.vsix` file in the current folder. It finds missing dependencies and errors at load time, but does not start VS Code.[^verify-vsix]

`vsce` refuses to package when `@types/vscode` is newer than the lowest VS Code version in `engines.vscode`. Both are set together, see [VS Code and Node versions](#vs-code-and-node-versions).[^manifest]

# Generated schema classes

The classes in `shared/generated/` describe XML Schema itself and are used to read and write XSD files (see [Schema model](schema-model.md)). `npm run generate-classes-from-schema` creates them with `xsd2ts` from `@neumaennl/xmlbind-ts`, using `schema/XMLSchema.xsd`, after deleting the existing `.ts` files in that folder; the README there stays. They are not edited by hand; ESLint ignores them, and the coverage report leaves them out. `xsd2ts` writes the `.js` extension in relative imports, as ES modules require (`--no-import-extensions` would omit it). After an update of `xmlbind-ts`, they are generated again and committed.[^manifest][^eslint]

# Dependencies and Node

`@neumaennl/xmlbind-ts` is published in GitHub Packages. `.npmrc` takes all `@neumaennl` packages from `npm.pkg.github.com` and everything else from `registry.npmjs.org`. The token comes from the user's npmrc, whose line `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}` reads it from the environment variable `NODE_AUTH_TOKEN`; `npm install` and `npm ci` therefore need that line and `NODE_AUTH_TOKEN` set to a GitHub token that can read packages (see `CONTRIBUTING.md`). In CI, `actions/setup-node` writes the line (`registry-url`, `scope`), and `NODE_AUTH_TOKEN` is the workflow's `GITHUB_TOKEN`. The line is not in the repository's `.npmrc`: Dependabot takes the token of such a line literally, sends `${NODE_AUTH_TOKEN}` and drops its own credential for GitHub Packages, which it gets because the package grants this repository read access.[^npmrc-registries][^ci]

The TypeScript version is 6.0, the last release on TypeScript's JavaScript codebase. TypeScript 7 is not used yet, because `typescript-eslint` supports TypeScript only below 6.1; support is expected with TypeScript 7.1. Dependabot has been told to ignore TypeScript 7.0.x.[^manifest]

Dependabot opens pull requests for npm packages and GitHub Actions every day and groups the ESLint packages, and `vitest` with `@vitest/coverage-*`, which requires exactly the same `vitest` version. It ignores minor and major updates of `@types/vscode` and `@types/node`, which follow the VS Code version (see below); patch updates within their `~` range are allowed. Dependabot reads its configuration only from the default branch `main`.[^dependabot]

`@vscode/test-cli`, which runs the tests in the extension host, still brings Mocha 11 with known vulnerabilities in two of its dependencies; they stay until a release with Mocha 12 is out (see [the known issue](known-issues.md#mocha-brings-dependencies-with-known-vulnerabilities)).

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

- It ignores `out/`, `dist/`, `webview/`, `.vscode-test/`, `node_modules/`, type declarations and generated code.
- `.js` and `.cjs` files are not allowed. `eslint.config.mjs` and `.vscode-test.mjs` are the only JavaScript files and are checked with the recommended JavaScript rules of ESLint; `vscode-test` cannot load a TypeScript configuration. All other code, including the scripts in `scripts/` and the configurations of Vite and Vitest, is TypeScript (`.ts`). ESLint cannot load a TypeScript configuration without the extra dependency `jiti` (Node would need an unstable flag), so `eslint.config.mjs` stays JavaScript for now; check again when ESLint can do it. The rule therefore does not forbid `.mjs` files yet.
- TypeScript files are checked with the type information from the tsconfig files listed in [Build outputs](#build-outputs), with the recommended rules of `typescript-eslint` including those that need type information. Return types must be declared, `any` is an error, non-null assertions are warnings, and `unknown` in type assertions and variable annotations is forbidden (`no-restricted-syntax`); an exception needs an `eslint-disable-next-line` comment with a reason.
- Test files and mocks additionally use the recommended rules of `@vitest/eslint-plugin` and the Vitest globals (see [Testing](testing.md#conventions)), and `vitest/consistent-test-it` requires `test()` instead of `it()`. The tests in the extension host in `test/extension-host/` use Mocha instead and get the Mocha and browser globals.

# CI

The workflow `ci.yml` runs on pushes to `main` and on every pull request, whatever its target branch, on Ubuntu with the Node version from `.nvmrc`. A new push to a pull request cancels the run for the previous one; runs for pushes each have a concurrency group of their own, so none of them is cancelled or held back:[^ci]

1. `npm run vscode:check`, which fails if `@types/vscode`, `@types/node` and `.nvmrc` don't match `engines.vscode` (see [VS Code and Node versions](#vs-code-and-node-versions)).
2. `npm ci`, with `NODE_AUTH_TOKEN` and the auth line that `actions/setup-node` writes for GitHub Packages.
3. `npm run lint`.
4. `npm run package`, the only build: `vscode:prepublish` deletes `out/` and `webview/` and compiles both parts, including the type check of the webview. Then `npm run package:verify`.
5. `npm run typecheck`, and the Vitest tests with coverage (`npx vitest run --coverage`), which fail if a coverage metric is below the threshold in `vitest.config.ts` (see [Testing](testing.md#coverage)). Vitest runs on the sources and needs no build; `npm test` is not used, because its `pretest` would compile again (see [Testing](testing.md#ci)).
6. The [tests in the extension host](testing.md#tests-in-the-extension-host) on the build from step 4: `npm run stage:extension-host` compiles only the tests and assembles `.vscode-test/`, and `xvfb-run -a npx vscode-test --reporter json` runs them, with a virtual display because the runner has none. `npm run test:extension-host` is not used, because its `pretest` would compile the extension again. Mocha's `json` reporter writes `test-results/extension-host.json`, the output file set in `.vscode-test.mjs`. Mocha runs only one reporter at a time, so the test names are then missing from the log. `.vscode-test.mjs` sets no reporter itself, because one there would override `--reporter` from the command line; so `npm run test:extension-host` uses Mocha's default reporter, and the Testing view uses the Extension Test Runner's own. `actions/cache` keeps the downloaded VS Code (`.vscode-test/vscode-linux-x64-<version>/`) under a key with the version from `engines.vscode`, so CI downloads it only when the version changes, or when GitHub has removed the cache after seven days without use.
7. The job summary gets two sections with a title each: "Vitest", with its test report and the coverage report, and "Extension host", with its test report. Vitest marks the lines of failing tests. The test reports come from `dorny/test-reporter`, the coverage report from `davelosert/vitest-coverage-report-action`, which also keeps one comment with the coverage report up to date on pull requests from this repository; for that the workflow has the permission `pull-requests: write`. Pull requests from forks get no write access, so they get no comment. Each report step only runs if its input file exists (`hashFiles()`), for example not when an earlier step failed before the tests ran. The coverage report is also missing when a Vitest test fails, because Vitest then writes no coverage files.

# Planned changes

The [Tech Stack Modernization](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340) plans one more change to the build:[^issue-340]

- Convert `eslint.config.mjs` to TypeScript as soon as ESLint can load a TypeScript configuration without an extra dependency (such as `jiti`) and without an unstable flag. Then the ESLint rule against `.js` and `.cjs` files also forbids `.mjs` files, with an exception for `.vscode-test.mjs`, which stays JavaScript because `vscode-test` only loads `.js`, `.cjs` and `.mjs` configurations. The goal is a repository without JavaScript files.

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

[^nvmrc]: Node version for development and CI

[^adr-002]: ADR 002: Legacy TypeScript decorators

[^vscode-config]: Launch configurations, tasks and settings for VS Code

[^npmrc-registries]: npm registries

[^dependabot]: Dependabot configuration

[^tsconfig-extension-host-test]: TypeScript configuration of the tests in the extension host

[^vscode-test-config]: Configuration of vscode-test

[^eslint]: ESLint configuration

[^ci]: CI workflow

[^issue-340]: Tech Stack Modernization
