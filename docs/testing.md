---
type: Testing Strategy
title: Testing
description: How the extension is tested - running the tests and the type check, the four Vitest projects, mocks and helpers, conventions for tests, mocks, helper functions and helper classes, which tests to write for typical changes, coverage, CI, the smoke tests in the extension host with a mock webview, and how the current tests compare with the testing strategy of ADR 001.
tags: [testing, vitest, mocks, coverage, ci, conventions]
status: stable
generated: { by: human:neumaennl, at: 2026-10-19T08:59:00Z }
verified: { by: human:neumaennl, at: 2026-10-19T09:11:14Z }
sources:
  - id: manifest
    resource: ../package.json
    title: Extension manifest (test scripts)
  - id: vitest-config
    resource: ../vitest.config.mts
    title: Vitest configuration
  - id: vscode-mock
    resource: ../src/__mocks__/vscode.ts
    title: Mock of the VS Code API
  - id: test-helpers
    resource: ../src/__tests__/testHelpers.ts
    title: Schema constants and pipeline helpers
  - id: scripts-test-helpers
    resource: ../scripts/__tests__/testHelpers.ts
    title: Helpers for the tests of the scripts
  - id: svg-test-utils
    resource: ../webview-src/__tests__/svgTestUtils.ts
    title: getBBox mock for jsdom
  - id: workspace-edit-test
    resource: ../src/__tests__/pipeline.workspaceEdit.test.ts
    title: Integration tests for the WorkspaceEdit path
  - id: main-test
    resource: ../webview-src/main.test.ts
    title: Tests of the webview app
  - id: eslint
    resource: ../eslint.config.mjs
    title: ESLint configuration
  - id: ci
    resource: ../.github/workflows/ci.yml
    title: CI workflow
  - id: vscode-test-config
    resource: ../.vscode-test.mjs
    title: Configuration of vscode-test
  - id: stage-script
    resource: ../scripts/stage-extension-host-test.ts
    title: Script that assembles the extension-host tests
  - id: smoke-test
    resource: ../test/extension-host/smoke.test.ts
    title: Smoke tests in the extension host
  - id: mock-webview
    resource: ../test/extension-host/mockWebview.mts
    title: Mock webview for the extension-host tests
  - id: vscode-test-cli
    resource: https://github.com/microsoft/vscode-test-cli
    title: "@vscode/test-cli"
  - id: vscode-test-download
    resource: https://github.com/microsoft/vscode-test/blob/main/lib/download.ts
    title: "@vscode/test-electron: download of VS Code"
  - id: issue-369
    resource: https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/369
    title: Smoke tests in the VS Code extension host
  - id: adr-001
    resource: architecture/001-editor-transition.md
    title: "ADR 001: Editor Transition Architecture (Testing Strategy)"
  - id: adr-002
    resource: architecture/002-legacy-decorators.md
    title: "ADR 002: Legacy TypeScript decorators"
  - id: vitest-vi-mock
    resource: https://vitest.dev/api/vi#vi-mock
    title: "Vitest: vi.mock"
  - id: issue-340
    resource: https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340
    title: Tech Stack Modernization
---

# Purpose

This document describes how the extension is tested today and the conventions for new tests. Almost all tests are Vitest tests that run in Node.js with a mocked VS Code API; a small smoke suite runs inside VS Code (see [Tests in the extension host](#tests-in-the-extension-host)).

# Running the tests

| Script | What it does |
|---|---|
| `npm test` | Compiles the extension and the webview and runs the type check (`pretest` runs `npm run compile` and `npm run typecheck`), then runs all tests. |
| `npm run typecheck` | Type-checks the tests and the scripts with `tsc` (see below). |
| `npm run test:watch` | Runs Vitest in watch mode, without compiling and without the type check. |
| `npm run test:coverage` | Runs all tests with a coverage report in `coverage/`, without compiling and without the type check. |
| `npm run test:extension-host` | Runs the smoke tests inside VS Code (see [Tests in the extension host](#tests-in-the-extension-host)). `npm test` does not run them. |

Vitest only removes the types from the TypeScript files; it does not check them. `npm run typecheck` runs `tsc --noEmit` with the test configurations `tsconfig.extension-test.json`, `tsconfig.webview-test.json` and `tsconfig.shared-test.json`, with `tsconfig.nodeTools.json` (the scripts and the configurations of Vite and Vitest), and with `tsconfig.extension-host-test.json` (the tests in the extension host), so a type error in a test or in the code it tests fails `npm test`.[^manifest]

`npx vitest run` runs the tests without compiling and without the type check; `npx vitest run --project webview` or a path such as `npx vitest run src/commandValidators` runs a part of them. Each run writes a JUnit report to `test-results/vitest-junit.xml`. Both `coverage/` and `test-results/` are ignored by Git.[^vitest-config]

Use the Node version from `.nvmrc`, which CI also uses. It is the Node version of the extension host of the lowest supported VS Code version, so the tests run on the Node version the extension runs on (see [Build and packaging](build-and-packaging.md#vs-code-and-node-versions)).

# Vitest projects

`vitest.config.mts` defines four projects, one for each part of the code (see [Architecture](architecture.md#components)), on top of one shared base:[^vitest-config]

| Project | Tests | Environment | Aliases | Type-checked with |
|---|---|---|---|---|
| `extension` | `src/**/*.test.ts` | Node.js | `vscode` to the mock | `tsconfig.extension-test.json` |
| `shared` | `shared/**/*.test.ts` | Node.js | `vscode` to the mock | `tsconfig.shared-test.json` |
| `webview` | `webview-src/**/*.test.ts` | jsdom | none | `tsconfig.webview-test.json` |
| `scripts` | `scripts/**/*.test.ts` | Node.js | none | `tsconfig.nodeTools.json` |

- **Shared base.** The base enables the globals (`describe`, `it`, `expect`, `vi` without an import), defines the reporters and the coverage. The projects only add their name, environment, test files and the `vscode` alias.
- **Compiling.** Vitest compiles TypeScript with Vite's compiler (Oxc). It takes the decorator settings from the tsconfig, so the generated schema classes are compiled with legacy decorators as in the build (see [ADR 002](architecture/002-legacy-decorators.md)).[^adr-002]
- **tsconfig files.** The test configurations are only used for the type check, by ESLint and by VS Code. `tsconfig.json` lists them as references, so VS Code type-checks each test file with the configuration that includes it, with the Vitest globals (see [Build and packaging](build-and-packaging.md#build-outputs)).

# Mocks and helpers

- **VS Code API.** `src/__mocks__/vscode.ts` replaces the `vscode` module in the `extension` and `shared` projects through an alias in `vitest.config.mts`. It provides `vi.fn()` mocks for the parts the code uses: `Uri`, `workspace` (including `applyEdit` and `getConfiguration`), `window`, `commands`, `languages`, `EventEmitter`, `WorkspaceEdit`, `Range` and a few more. Classes of the API whose instances need members, such as `WorkspaceEdit`, are mocked with a class (`vi.fn(class { … })`): the code creates them with `new`, Vitest passes `new` on to the implementation, and arrow functions cannot be called with `new`.[^vscode-mock]
- **VS Code objects.** Tests of `SchemaEditorProvider` build partial stubs of `ExtensionContext`, `Webview`, `WebviewPanel` and `TextDocument` with only the members the provider uses.[^workspace-edit-test]
- **Webview API.** `main.test.ts` sets `acquireVsCodeApi` on `globalThis` before the app is loaded, with mocks for `postMessage`, `getState` and `setState`, and builds the page with `document.body.innerHTML`. Each test loads the app again with `vi.resetModules()` and `await import("./main")`.[^main-test]
- **SVG measuring.** jsdom has no layout engine, so `setupGetBBoxMock()` in `webview-src/__tests__/svgTestUtils.ts` gives every element a `getBBox()` that assumes 6 pixels per character and a height of 10 pixels.[^svg-test-utils]
- **Pipeline helpers.** `src/__tests__/testHelpers.ts` has small schemas as constants (`MINIMAL_SCHEMA`, `SCHEMA_WITH_ELEMENTS` and others) and runs a command through a new `CommandProcessor`: `runCommand()`, `runCommandExpectSuccess()` (returns the XML), `runCommandExpectSuccessSchema()` (returns the unmarshalled schema) and `runCommandExpectValidationFailure()`.[^test-helpers]
- **Scripts.** The tests of the scripts send no request and install nothing. `scripts/__tests__/testHelpers.ts` replaces `fetch` with `stubFetch()`, which answers each URL with a given body, and builds GitHub releases with `release()` and `releasesPage()`. The tests of `vscode-version.ts` and `scripts/lib/node-setup.ts` mock `node:child_process`, `node:fs` and `node:readline/promises` where the script would start programs, check files or ask in the terminal, and work in a temporary folder. The tests of `verify-vsix.ts` unpack three tiny VSIX files from `scripts/__tests__/test-resources/` with the same tool as the script (`unzip`, on Windows `tar.exe`), because unpacking is what the script checks.[^scripts-test-helpers]

## The `__mocks__` folder

Vitest treats a folder named `__mocks__` specially. A file in it is a manual mock: it replaces the module with the same file name.

- **Mocks of the project's own modules** sit in a `__mocks__` folder next to the module, for example `src/foo/__mocks__/bar.ts` for `src/foo/bar.ts`. Vitest uses them only in test files that call `vi.mock("./bar")` without a factory.
- **Mocks of packages** sit in a `__mocks__` folder in the project root, and Vitest uses them only after `vi.mock()`.

The `vscode` mock is not used through this mechanism: `src/__mocks__/vscode.ts` is not in the root, and the alias in the configuration loads it in every test of the `extension` and `shared` projects, without `vi.mock()`. Because of the special meaning of `__mocks__`, nothing but replacements of whole modules goes there.[^vitest-vi-mock][^vitest-config]

# Kinds of tests

- **Unit tests** test one module and sit next to it: `src/commandProcessor.ts` is tested in `src/commandProcessor.test.ts`.
- **Integration tests** test several modules together and sit in the `__tests__` folder of the part. The `src/__tests__/pipeline.*.test.ts` files send commands through the real `CommandProcessor`, which validates, executes and serializes them (see [Persistence](persistence.md#command-pipeline)), and check the resulting XML or schema; `pipeline.chained.test.ts` runs several commands in a row. `pipeline.workspaceEdit.test.ts` starts one step earlier: it sends an `executeCommand` message to `SchemaEditorProvider` and checks the `WorkspaceEdit`, the `applyEdit` call and the reply.[^workspace-edit-test]
- `shared/__tests__/` contains unit tests of the command and message types (see [Known issues](known-issues.md#command-and-message-type-tests-only-check-object-literals)).

| Area | Tests | Details |
|---|---|---|
| Command and message types, IDs, schema utilities | `shared/__tests__/`, `shared/idStrategy.test.ts`, `shared/schemaUtils.test.ts` | [Commands](commands.md#files), [Schema model](schema-model.md#node-ids) |
| Validators and executors | `src/commandValidators/`, `src/commandExecutors/`, `src/commandValidator.test.ts`, `src/commandExecutor.test.ts` | [Commands](commands.md) |
| Processor, schema model, navigation | `src/commandProcessor.test.ts`, `src/schemaModelManager.test.ts`, `src/schemaNavigator.test.ts` | [Persistence](persistence.md), [Schema model](schema-model.md) |
| Command pipeline | `src/__tests__/pipeline.*.test.ts` | [Persistence](persistence.md#command-pipeline) |
| Extension and editor provider | `src/extension.test.ts`, `src/webviewProvider.test.ts` | [Messaging](messaging.md) |
| Webview app | `webview-src/main.test.ts` | [Editor](editor.md) |
| Diagram | `webview-src/diagram/`, `webview-src/renderer.test.ts` | [Diagram rendering](diagram-rendering.md#tests) |
| Palette and drag and drop | `webview-src/drop/DropCommandFactory.test.ts`, `webview-src/palette/PaletteView.test.ts`, `webview-src/renderer.test.ts` | [Drag and drop](drag-and-drop.md#adding-a-draggable-construct) |
| Property panel | `webview-src/propertyPanel/propertyPanel.test.ts` | [UX concept](ux-concept.md) |
| Scripts | `scripts/**/*.test.ts` | [Build and packaging](build-and-packaging.md#vs-code-and-node-versions) |

# Conventions

Existing tests that do not follow these conventions yet are listed in [Known issues](known-issues.md#code). They are fixed on the editor branch in Phase 9 of the [Tech Stack Modernization](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340), which has more of the affected tests.[^issue-340]

## Files and structure

- A test file tests one feature, usually one module. Test cases for a feature are not spread over several files, and no two test cases test the same thing.
- Unit tests sit next to the source file and have its name with `.test.ts`. Integration tests sit in the `__tests__` folder of the part (`shared/`, `src/`, `webview-src/`, `scripts/`), in subfolders that mirror the source folders if needed.
- Files that several tests use sit in the `test-resources` folder in `__tests__`: larger XML snippets in `src/__tests__/test-resources` (see [Known issues](known-issues.md#test-xml-is-inline-instead-of-in-test-resources)), the VSIX files of the script tests in `scripts/__tests__/test-resources`.
- A file has a `describe` block for the feature and nested blocks for methods or cases. Test cases use `it("should …")` and follow Arrange, Act, Assert. Some files use `test(…)` instead; a file uses one of the two, not both.

## Mocks

- **Mock only the boundaries.** Mock the VS Code API, the webview API (`acquireVsCodeApi`), browser features that jsdom lacks (such as `getBBox()`), the network and other programs, and calls that are needed to force an error path. Everything else runs for real: the `CommandProcessor`, the XML binding, the DOM in jsdom.
- **One mock of the VS Code API.** Tests use `src/__mocks__/vscode.ts` through the alias and do not call `vi.mock("vscode")`. If a test needs a part of the API that is missing, it is added to the mock. A test changes the behavior of a mock function with `mockReturnValue()` or `mockImplementation()`.
- **Partial stubs of VS Code objects.** Objects that the code receives (`TextDocument`, `Webview`, `WebviewPanel`, `ExtensionContext`) are stubbed with only the members the code under test uses, and cast with `as unknown as`. The lint rule `no-restricted-syntax` forbids this cast, so each one gets `// eslint-disable-next-line no-restricted-syntax -- <reason>`.[^eslint]
- **Types of mocks.** `vi.fn()` does not take the parameter types from the variable or property it is assigned to; a mock that needs them gets the function type, for example `vi.fn<CommandExecutor["execute"]>(…)`. A cast to a mock type uses `Mock` or `MockedFunction`, imported with `import type { Mock } from "vitest"`; the other Vitest functions are globals.
- **Spies.** `vi.spyOn()` changes the result of a real method, for example to make `CommandProcessor.execute()` fail. Spies are restored with `vi.restoreAllMocks()` in `afterEach`.
- **Clean state.** No test sees the calls of another. Mocks are created in the test or in `beforeEach` where possible. A file whose tests share mocks (mocks created once for the file, and the functions of the `vscode` mock) calls `vi.clearAllMocks()` in `beforeEach`. Globals such as `acquireVsCodeApi` are set before the module under test is imported; if the module reads them when it is loaded, the test calls `vi.resetModules()` and imports it again with `await import()`. Replaced globals and environment variables are restored with `vi.unstubAllGlobals()` and `vi.unstubAllEnvs()`.
- **Shared mocks.** A mock that only one test file needs is created in that file. A mock that several test files need is not copied:
  - A replacement of a whole module lives in a `__mocks__` folder and has the name of the module it replaces, like `src/__mocks__/vscode.ts`. Because of the [special meaning of `__mocks__`](#the-__mocks__-folder), nothing else goes there.
  - Functions that build stubs of objects (such as a `WebviewPanel`) and fakes are helpers: they live in a `<topic>TestHelpers.ts` module, as described in [Helper functions](#helper-functions) and [Helper classes](#helper-classes).

## Helper functions

- **One file.** A helper that only one test file uses is defined at the top of that file, after the imports, with a TSDoc comment.
- **Several files.** A helper that more than one test file needs is moved to a helper module in the `__tests__` folder of the part and imported from there; it is not copied. Helper modules are named `<topic>TestHelpers.ts`, for example `schemaTestHelpers.ts`. Files in `__tests__` are excluded from the build and from the coverage report, and production code never imports them.
- **Fresh fixtures.** Helpers that build test data return a new object on every call (for example `schemaWith(body)`, which unmarshals a schema with the given content), so that one test cannot change the data of another. Constants are only used for strings, such as XML snippets.
- **Assertion helpers.** A helper that contains the assertions of a test has a name that starts with `expect` or contains `Expect` (`expectValidationFailure()`, `runCommandExpectSuccess()`). Its name is added to `assertFunctionNames` of the rule `vitest/expect-expect` in `eslint.config.mjs`; otherwise ESLint warns that the tests that use it have no assertion.[^eslint]

## Helper classes

There are no helper classes in the tests today. Factory functions and plain objects are preferred. A class is only used for a fake that has to keep state between calls, for example a webview that records the messages it receives. It is named `Fake<Thing>`, for example `FakeWebview`, and lives in a helper module like a shared helper function.

# Tests for typical changes

- **A new or changed command:** the command type in `shared/commands/`, validator tests in `src/commandValidators/<area>Validators.test.ts`, executor tests in `src/commandExecutors/<area>Executors.test.ts`, and a pipeline test in `src/__tests__/pipeline.<area>.test.ts` that runs the command on XML (see [Commands](commands.md#files) for the other places a new command touches).
- **A new message:** `webviewProvider.test.ts` for the extension host side and `main.test.ts` for the webview side.
- **A new draggable construct:** placement and payload in `DropCommandFactory.test.ts`; `renderer.test.ts` only if the event handling changes (see [Drag and drop](drag-and-drop.md#adding-a-draggable-construct)).
- **Changes to the webview UI:** a jsdom test next to the changed module that builds the needed DOM, triggers the event and checks the DOM and the posted messages. Tests that measure text call `setupGetBBoxMock()`.
- **Changes to activation, the registration of the custom editor or the message handling:** besides the Vitest tests, run `npm run test:extension-host`; extend the smoke tests only if the change adds a path that they do not reach.
- **Changes to a script:** a test next to the script, with the network, the terminal and other programs mocked, except a program that the script's own task depends on, such as `unzip` for `verify-vsix.ts`.

# Coverage

The coverage report (`@vitest/coverage-v8`) includes all TypeScript files in `shared/`, `src/` and `webview-src/` except type declarations, generated classes (`shared/generated/`), test files, `__tests__` folders and `__mocks__` folders. The scripts in `scripts/` are not part of it. Files that contain only types, such as `webview-src/webviewTypes.ts`, appear with no statements and do not change the totals. CI writes the current totals to the job summary (see [CI](#ci)).[^vitest-config]

No threshold is enforced; the goal is more than 80% for business logic.

# CI

The workflow `ci.yml` runs on pushes and pull requests to `main` and `modernization` with the Node version from `.nvmrc`. It first checks that this version and the `@types` packages match the lowest supported VS Code version, then installs the dependencies and runs ESLint. It builds the extension once, by packaging it, and checks that the VSIX loads. Then it runs the type check and the Vitest tests with coverage, and the [tests in the extension host](#tests-in-the-extension-host) on the packaged build, with a virtual display (`xvfb-run`) and the VS Code build from the cache. It runs the steps of `npm test` and `npm run test:extension-host` separately, because their `pretest` scripts would compile again (see [Build and packaging](build-and-packaging.md#ci)).[^ci]

- **Report.** The job summary shows the coverage totals and, as "Vitest", the test report that `dorny/test-reporter` creates from the JUnit file: the tests per file, and for a failing test its message.
- **Annotations.** In GitHub Actions, Vitest also adds its `github-actions` reporter, which marks the line of each failing test in the run and in the changed files of a pull request. Its own job summary is off, because the report step writes one.[^vitest-config]

On `copilot/add-editor-capabilities`, the workflow runs only for `main` and has no packaging steps.

# Tests in the extension host

A small smoke suite runs inside VS Code, with the real `vscode` API instead of the mock. It checks the path that the Vitest tests can only check piece by piece: VS Code loads and activates the extension, opens a schema in the custom editor, a message from the webview becomes a `WorkspaceEdit`, and VS Code's undo reverts it. Phase 6 of the [Tech Stack Modernization](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340), which makes the extension a native ES module, relies on it.[^issue-369]

- **Runner.** `vscode-test` from `@vscode/test-cli` reads `.vscode-test.mjs`, starts VS Code with the extension and a workspace, and runs the compiled tests with Mocha (TDD interface: `suite`, `test`) in the extension host. Other extensions are disabled, and VS Code keeps its settings and extensions in `.vscode-test/`, apart from the VS Code you work in. The configuration is a JavaScript file because `vscode-test` only loads `.js`, `.cjs` and `.mjs` configurations.[^vscode-test-cli][^vscode-test-config]
- **VS Code version and download.** The tests run on the lowest supported version from `engines.vscode`. `@vscode/test-electron` downloads it once into `.vscode-test/vscode-<platform>-<version>/` and uses the existing copy afterwards without contacting the server. After `npm run vscode:update` the next run downloads the new version; the old folder stays until you delete it.[^vscode-test-download]
- **Mock webview.** Tests in the extension host cannot see or operate the webview. The suite therefore runs a copy of the extension whose webview bundle is replaced by `test/extension-host/mockWebview.mts`: as soon as the extension sends the parsed schema (`updateSchema`), the mock sends one fixed `executeCommand` message (`addElement`). The mock runs under the real content security policy and uses the real message passing; no test code is part of the extension.[^mock-webview]
- **Assembling.** `pretest:extension-host` compiles the extension and runs `stage:extension-host`, which compiles the tests (with `tsconfig.extension-host-test.json` into `.vscode-test/out/`) and runs `scripts/stage-extension-host-test.ts`. The script assembles the copy of the extension in `.vscode-test/extension/` (`package.json`, a copy of `out/` and the mock as `webview/main.js`) and a workspace in `.vscode-test/workspace/` with a copy of `exampleFiles/example.xsd`, so the tests never change `exampleFiles/`. The workspace settings keep the secondary side bar with the chat view closed (`workbench.secondarySideBar.defaultVisibility: hidden`): otherwise the chat input box takes the focus at startup, and when the test window does not get the focus of the operating system, it keeps it, so that `undo` goes to the chat input instead of the custom editor. Focusing the custom editor explicitly before `undo` does not help, not even reopening it with the focus: as long as the window has no focus, the chat input keeps it. This was reproduced under `xvfb` with a second window that kept the focus. `out/` is copied, not linked: with a link the extension activated, but the edit from the mock never reached the document.[^stage-script]
- **The tests.** Before the tests, `test/extension-host/smoke.test.ts` opens `example.xsd` in the custom editor and starts waiting for the edit from the mock. The tests check that the extension is active, that the custom editor is the active tab, that the edit from the mock arrives as a change of the document, and that the command `undo` restores the original text. The last two wait for the edit themselves, so each test can also run on its own, for example from the Testing view, and a missing edit fails these two tests instead of all four. At the end the editor is reverted and closed.[^smoke-test]
- **Not covered.** Whether the real webview bundle loads and draws the diagram, and anything the user does in the webview. End-to-end tests of the webview UI are planned on the editor branch ([#377](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/377)).
- **Locally.** VS Code opens a window for a few seconds. On Linux without a display, run `xvfb-run -a npm run test:extension-host`. Under WSL, WSLg provides the display.
- **Debugging.** The launch configuration "Extension Tests" runs the suite in the VS Code you work in, after the task `npm: pretest:extension-host`. The results appear in the Debug Console of the window that started it; the test window closes whether the tests pass or fail. For a quick pass or fail, `npm run test:extension-host` in a terminal is simpler. Breakpoints work in the test files. In the extension code they do not bind, because the source maps of the copied `out/` point to paths that do not exist in the copy; use "Run Extension" to debug the extension itself.
- **Testing view.** The recommended extension "Extension Test Runner" (`ms-vscode.extension-test-runner`) finds `.vscode-test.mjs` and shows the tests in VS Code's Testing view, where they can be run and debugged one by one. It runs the compiled tests as they are, so run `npm run pretest:extension-host` after changing the extension or the tests.

# Compared with ADR 001

ADR 001 plans six levels of testing. The current state:[^adr-001]

| Level in the ADR | Current state |
|---|---|
| Unit tests (Jest or Mocha, VS Code API mocked, 80% coverage of business logic) | Done with Vitest instead of Jest or Mocha (see [ADR 001, section 9](architecture/001-editor-transition.md#9-deviations-from-this-design)) and [Coverage](#coverage). The tests for the State Reconciler and the selection manager do not exist, because these parts are not built. |
| Integration tests (VS Code Extension Test Runner) | Mostly done in Vitest with the mocked VS Code API: the pipeline tests and the message handling of `SchemaEditorProvider`. A smoke suite with `@vscode/test-cli` checks activation, the custom editor, a `WorkspaceEdit` from a webview message and undo inside VS Code, with a mock webview (see [Tests in the extension host](#tests-in-the-extension-host)). |
| End-to-end tests (Playwright or Selenium) | None. Planned on the editor branch ([#377](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/377)). |
| Performance tests | None. |
| Manual tests | No defined process. |
| Regression tests (CI on every commit) | CI runs lint, build, type check and all tests on pushes and pull requests to `main` and `modernization`. |

[^manifest]: Extension manifest (test scripts)

[^vitest-config]: Vitest configuration

[^vscode-mock]: Mock of the VS Code API

[^test-helpers]: Schema constants and pipeline helpers

[^scripts-test-helpers]: Helpers for the tests of the scripts

[^svg-test-utils]: getBBox mock for jsdom

[^workspace-edit-test]: Integration tests for the WorkspaceEdit path

[^main-test]: Tests of the webview app

[^eslint]: ESLint configuration

[^ci]: CI workflow

[^adr-001]: ADR 001: Editor Transition Architecture (Testing Strategy)

[^adr-002]: ADR 002: Legacy TypeScript decorators

[^vitest-vi-mock]: Vitest: vi.mock

[^issue-340]: Tech Stack Modernization

[^vscode-test-config]: Configuration of vscode-test

[^stage-script]: Script that assembles the extension-host tests

[^smoke-test]: Smoke tests in the extension host

[^mock-webview]: Mock webview for the extension-host tests

[^vscode-test-cli]: @vscode/test-cli

[^vscode-test-download]: @vscode/test-electron: download of VS Code

[^issue-369]: Smoke tests in the VS Code extension host
