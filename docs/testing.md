---
type: Testing Strategy
title: Testing
description: How the extension is tested - running the tests, the three Jest projects, mocks and helpers, conventions for tests, mocks, helper functions and helper classes, which tests to write for typical changes, coverage, CI, the planned switch to Vitest, and how the current tests compare with the testing strategy of ADR 001.
tags: [testing, jest, mocks, coverage, ci, conventions]
status: stable
generated: { by: human:neumaennl, at: 2026-10-09T11:30:00Z }
verified:
  by: human:neumaennl
  at: 2026-10-09T12:02:50Z
sources:
  - id: manifest
    resource: ../package.json
    title: Extension manifest (test scripts)
  - id: jest-config
    resource: ../jest.config.mjs
    title: Jest configuration
  - id: vscode-mock
    resource: ../src/__mocks__/vscode.ts
    title: Mock of the VS Code API
  - id: test-helpers
    resource: ../src/__tests__/testHelpers.ts
    title: Schema constants and pipeline helpers
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
  - id: adr-001
    resource: architecture/001-editor-transition.md
    title: "ADR 001: Editor Transition Architecture (Testing Strategy)"
  - id: jest-manual-mocks
    resource: https://jestjs.io/docs/manual-mocks
    title: "Jest: Manual Mocks"
  - id: vitest-vi-mock
    resource: https://vitest.dev/api/vi#vi-mock
    title: "Vitest: vi.mock"
---

# Purpose

This document describes how the extension is tested today and the conventions for new tests. All tests are Jest tests that run in Node.js; there are no tests that start VS Code.

# Running the tests

| Script | What it does |
|---|---|
| `npm test` | Compiles the extension and the webview (`pretest` runs `npm run compile`), then runs all tests. |
| `npm run test:watch` | Runs Jest in watch mode, without compiling first. |
| `npm run test:coverage` | Runs all tests with a coverage report in `coverage/`, without compiling first. |

`npx jest` runs the tests without compiling; `npx jest --selectProjects webview` or a path such as `npx jest src/commandValidators` runs a part of them. Each run writes a JUnit report to `test-results/jest-junit.xml`. Both `coverage/` and `test-results/` are ignored by Git.[^manifest][^jest-config]

Use the Node version from `.nvmrc`, which CI also uses.

# Jest projects

`jest.config.mjs` defines three projects, one for each part of the code (see [Architecture](architecture.md#components)). Each project compiles its tests with `ts-jest` and a tsconfig of its own:

| Project | Tests | Environment | tsconfig | Module mapping |
|---|---|---|---|---|
| `webview` | `webview-src/**/*.test.ts` | jsdom | `tsconfig.webview-test.json` | `shared/…` to the `shared` folder |
| `extension` | `src/**/*.test.ts` | Node.js | `tsconfig.extension-test.json` | `shared/…` to the `shared` folder, `vscode` to the mock |
| `shared` | `shared/**/*.test.ts` | Node.js | `tsconfig.shared-test.json` | `vscode` to the mock |

The `webview` and `extension` projects strip a `.js` suffix from relative imports, and all three also compile `@neumaennl/xmlbind-ts` from `node_modules`. The root of the configuration contributes the options that apply to the whole run: the files for the coverage report and the reporters. The other options at the root and `jest.setup.mjs` are not used (see [Planned switch to Vitest](#planned-switch-to-vitest)).[^jest-config]

# Mocks and helpers

- **VS Code API.** `src/__mocks__/vscode.ts` replaces the `vscode` module in the `extension` and `shared` projects. It provides `jest.fn()` mocks for the parts the code uses: `Uri`, `workspace` (including `applyEdit` and `getConfiguration`), `window`, `commands`, `languages`, `EventEmitter`, `WorkspaceEdit`, `Range` and a few more.[^vscode-mock]
- **VS Code objects.** Tests of `SchemaEditorProvider` build partial stubs of `ExtensionContext`, `Webview`, `WebviewPanel` and `TextDocument` with only the members the provider uses.[^workspace-edit-test]
- **Webview API.** `main.test.ts` sets `acquireVsCodeApi` on `globalThis` before the app is loaded, with mocks for `postMessage`, `getState` and `setState`, and builds the page with `document.body.innerHTML`.[^main-test]
- **SVG measuring.** jsdom has no layout engine, so `setupGetBBoxMock()` in `webview-src/__tests__/svgTestUtils.ts` gives every element a `getBBox()` that assumes 6 pixels per character and a height of 10 pixels.[^svg-test-utils]
- **Pipeline helpers.** `src/__tests__/testHelpers.ts` has small schemas as constants (`MINIMAL_SCHEMA`, `SCHEMA_WITH_ELEMENTS` and others) and runs a command through a new `CommandProcessor`: `runCommand()`, `runCommandExpectSuccess()` (returns the XML), `runCommandExpectSuccessSchema()` (returns the unmarshalled schema) and `runCommandExpectValidationFailure()`.[^test-helpers]

## The `__mocks__` folder

Jest and Vitest treat a folder named `__mocks__` specially. A file in it is a manual mock: it replaces the module with the same file name.

- **Mocks of the project's own modules** sit in a `__mocks__` folder next to the module, for example `src/foo/__mocks__/bar.ts` for `src/foo/bar.ts`. Both tools use them only in test files that call `jest.mock("./bar")` or `vi.mock("./bar")` without a factory.
- **Mocks of packages** sit in a `__mocks__` folder at the root. Jest looks in the folders listed in `roots` and uses these mocks in every test, without a `jest.mock()` call (except for built-in Node modules such as `fs`). Vitest looks in the project root and uses them only after `vi.mock()`.
- Jest warns about "duplicate manual mock found" when two `__mocks__` folders contain files with the same name.

Here the root configuration lists `shared/`, `src/` and `webview-src/` in `roots`, but no project inherits it (see [Jest projects](#jest-projects)). The `extension` and `shared` projects load `src/__mocks__/vscode.ts` through their module mapping, not through this mechanism. For Vitest, the mock has to be either an alias in the configuration or a call to `vi.mock("vscode")` in a setup file.[^jest-manual-mocks][^vitest-vi-mock][^jest-config]

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

# Conventions

Existing tests that do not follow these conventions yet are listed in [Known issues](known-issues.md#code).

## Files and structure

- A test file tests one feature, usually one module. Test cases for a feature are not spread over several files, and no two test cases test the same thing.
- Unit tests sit next to the source file and have its name with `.test.ts`. Integration tests sit in the `__tests__` folder of the part (`shared/`, `src/`, `webview-src/`), in subfolders that mirror the source folders if needed.
- Larger XML snippets that several tests use belong in `src/__tests__/test-resources` (see [Known issues](known-issues.md#test-xml-is-inline-instead-of-in-test-resources)).
- A file has a `describe` block for the feature and nested blocks for methods or cases. Test cases use `it("should …")` and follow Arrange, Act, Assert. Some files use `test(…)` instead; a file uses one of the two, not both.

## Mocks

- **Mock only the boundaries.** Mock the VS Code API, the webview API (`acquireVsCodeApi`), browser features that jsdom lacks (such as `getBBox()`), and calls that are needed to force an error path. Everything else runs for real: the `CommandProcessor`, the XML binding, the DOM in jsdom.
- **One mock of the VS Code API.** Tests use `src/__mocks__/vscode.ts` through the module mapping and do not call `jest.mock("vscode")`. If a test needs a part of the API that is missing, it is added to the mock. A test changes the behavior of a mock function with `mockReturnValue()` or `mockImplementation()`.
- **Partial stubs of VS Code objects.** Objects that the code receives (`TextDocument`, `Webview`, `WebviewPanel`, `ExtensionContext`) are stubbed with only the members the code under test uses, and cast with `as unknown as`. The lint rule `no-restricted-syntax` forbids this cast, so each one gets `// eslint-disable-next-line no-restricted-syntax -- <reason>`.[^eslint]
- **Spies.** `jest.spyOn()` changes the result of a real method, for example to make `CommandProcessor.execute()` fail. Spies are restored with `jest.restoreAllMocks()` in `afterEach`.
- **Clean state.** No test sees the calls of another. Mocks are created in the test or in `beforeEach` where possible. A file whose tests share mocks (mocks created once for the file, and the functions of the `vscode` mock) calls `jest.clearAllMocks()` in `beforeEach`. Globals such as `acquireVsCodeApi` are set before the module under test is imported; if the module reads them when it is loaded, the test calls `jest.resetModules()` and imports it again.
- **Shared mocks.** A mock that only one test file needs is created in that file. A mock that several test files need is not copied:
  - A replacement of a whole module lives in a `__mocks__` folder and has the name of the module it replaces, like `src/__mocks__/vscode.ts`. Because of the [special meaning of `__mocks__`](#the-__mocks__-folder), nothing else goes there.
  - Functions that build stubs of objects (such as a `WebviewPanel`) and fakes are helpers: they live in a `<topic>TestHelpers.ts` module, as described in [Helper functions](#helper-functions) and [Helper classes](#helper-classes).

## Helper functions

- **One file.** A helper that only one test file uses is defined at the top of that file, after the imports, with a TSDoc comment.
- **Several files.** A helper that more than one test file needs is moved to a helper module in the `__tests__` folder of the part and imported from there; it is not copied. Helper modules are named `<topic>TestHelpers.ts`, for example `schemaTestHelpers.ts`. Files in `__tests__` are excluded from the build and from the coverage report, and production code never imports them.
- **Fresh fixtures.** Helpers that build test data return a new object on every call (for example `schemaWith(body)`, which unmarshals a schema with the given content), so that one test cannot change the data of another. Constants are only used for strings, such as XML snippets.
- **Assertion helpers.** A helper that contains the assertions of a test has a name that starts with `expect` or contains `Expect` (`expectValidationFailure()`, `runCommandExpectSuccess()`). Its name is added to `assertFunctionNames` of the rule `jest/expect-expect` in `eslint.config.mjs`; otherwise ESLint warns that the tests that use it have no assertion.[^eslint]

## Helper classes

There are no helper classes in the tests today. Factory functions and plain objects are preferred. A class is only used for a fake that has to keep state between calls, for example a webview that records the messages it receives. It is named `Fake<Thing>`, for example `FakeWebview`, and lives in a helper module like a shared helper function.

# Tests for typical changes

- **A new or changed command:** the command type in `shared/commands/`, validator tests in `src/commandValidators/<area>Validators.test.ts`, executor tests in `src/commandExecutors/<area>Executors.test.ts`, and a pipeline test in `src/__tests__/pipeline.<area>.test.ts` that runs the command on XML (see [Commands](commands.md#files) for the other places a new command touches).
- **A new message:** `webviewProvider.test.ts` for the extension host side and `main.test.ts` for the webview side.
- **A new draggable construct:** placement and payload in `DropCommandFactory.test.ts`; `renderer.test.ts` only if the event handling changes (see [Drag and drop](drag-and-drop.md#adding-a-draggable-construct)).
- **Changes to the webview UI:** a jsdom test next to the changed module that builds the needed DOM, triggers the event and checks the DOM and the posted messages. Tests that measure text call `setupGetBBoxMock()`.

# Coverage

The coverage report includes all TypeScript files in `shared/`, `src/` and `webview-src/` except type declarations, generated classes (`shared/generated/`), test files and `__tests__` folders. CI writes the current totals to the job summary (see [CI](#ci)).

No threshold is enforced; the goal is more than 80% for business logic. The report has two flaws (see [Planned switch to Vitest](#planned-switch-to-vitest)).[^jest-config]

# CI

The workflow `ci.yml` runs on pushes and pull requests to `main` and `modernization` with Node 24. It installs the dependencies, runs ESLint and the build, and then the tests with coverage. After the tests it packages the extension and checks that the VSIX loads (see [Build and packaging](build-and-packaging.md#ci)). It writes the coverage totals to the job summary and publishes the JUnit report as the check "Jest". On `copilot/add-editor-capabilities`, the workflow runs only for `main` and has no packaging steps.[^ci]

# Planned switch to Vitest

Phase 3 of the [Tech Stack Modernization](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/340) replaces Jest with Vitest. Unit tests, integration tests and tests in the VS Code extension host stay separate categories. The Jest configuration has flaws that are not worth fixing before the switch, but the Vitest configuration should not repeat them:

- With `projects`, each project is a configuration of its own, and only the options for the whole run (coverage files, reporters) apply at the root. `setupFilesAfterEnv: ["<rootDir>/jest.setup.mjs"]` and the root's `preset`, `testEnvironment`, `roots`, `testMatch`, `testPathIgnorePatterns`, `modulePathIgnorePatterns`, `moduleFileExtensions` and `moduleNameMapper` have no effect; `jest --showConfig` lists no setup file for any project. The setup file would mock `vscode`, which the module mapping of the `extension` and `shared` projects already does. `jest.setup.mjs` and these options should not be carried over, and the options the three projects repeat should be one shared object.
- `webview-src/webviewTypes.ts` contains only interfaces, and its imports are removed when TypeScript compiles, so no test loads it. Jest then compiles it for the coverage report with the root settings, which use `tsconfig.json` without the DOM types, so every coverage run (also in CI) prints "Failed to collect coverage from …/webviewTypes.ts" with the error TS2304 for `SVGGElement`. The numbers are not affected.
- `src/__mocks__/vscode.ts` matches `src/**/*.ts` and is counted as source code. The coverage configuration should exclude `**/__mocks__/**` and type-only files.

The switch touches every test file, which makes it a good time to fix the test problems listed in [Known issues](known-issues.md#code).

# Compared with ADR 001

ADR 001 plans six levels of testing. The current state:[^adr-001]

| Level in the ADR | Current state |
|---|---|
| Unit tests (Jest or Mocha, VS Code API mocked, 80% coverage of business logic) | Done with Jest, see [Coverage](#coverage). The tests for the State Reconciler and the selection manager do not exist, because these parts are not built. |
| Integration tests (VS Code Extension Test Runner) | Done in Jest with the mocked VS Code API instead: the pipeline tests and the message handling of `SchemaEditorProvider`. Nothing runs inside VS Code, so undo and redo, changes from outside and the persisted webview state are not tested. |
| End-to-end tests (Playwright or Selenium) | None. |
| Performance tests | None. |
| Manual tests | No defined process. |
| Regression tests (CI on every commit) | CI runs lint, build and all tests on pushes and pull requests to `main`. |

[^manifest]: Extension manifest (test scripts)

[^jest-config]: Jest configuration

[^vscode-mock]: Mock of the VS Code API

[^test-helpers]: Schema constants and pipeline helpers

[^svg-test-utils]: getBBox mock for jsdom

[^workspace-edit-test]: Integration tests for the WorkspaceEdit path

[^main-test]: Tests of the webview app

[^eslint]: ESLint configuration

[^ci]: CI workflow

[^adr-001]: ADR 001: Editor Transition Architecture (Testing Strategy)

[^jest-manual-mocks]: Jest: Manual Mocks

[^vitest-vi-mock]: Vitest: vi.mock
