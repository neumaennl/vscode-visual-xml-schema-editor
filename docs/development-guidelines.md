---
type: Guideline
title: Development guidelines
description: Rules for everyone who changes the extension - code size, code quality, formatting and ESLint, structure reviews, TypeScript and naming, VS Code and Node versions, TSDoc, tests, documentation and the knowledge bundle, issues, what to check before committing, and commits.
tags: [guidelines, conventions, code-quality, typescript, documentation, workflow]
status: stable
generated: { by: human:neumaennl, at: 2026-11-26T14:09:14Z }
verified: { by: human:neumaennl, at: 2026-11-26T14:29:55Z }
sources:
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
  - id: tsconfig
    resource: ../tsconfig.extension.json
    title: TypeScript configuration of the extension host
  - id: manifest
    resource: ../package.json
    title: Extension manifest (scripts)
  - id: agents
    resource: ../AGENTS.md
    title: Instructions for AI coding agents
  - id: okf
    resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
    title: Open Knowledge Format specification
---

# Purpose

These rules apply to everyone who changes the extension, people and AI coding agents alike. Agents get them through `AGENTS.md`, which adds only what is specific to agents: their role, how they work with the maintainer, and a few rules for their own work.[^agents]

Topics that have their own document are only linked here: the structure of the code in [Architecture](architecture.md), tests in [Testing](testing.md), and building, ESLint and CI in [Build and packaging](build-and-packaging.md).

# Code size

- A TypeScript file has at most 500 lines. When it grows beyond that, move related code into a module of its own with a clear name.
- A function has at most 120 lines. Split longer functions into smaller helpers with one responsibility each.
- Tests have their own limits: a test file has at most 1000 lines, and a single test (the callback of `test()` or `test.each()`) at most 50 lines. The `describe` callbacks that hold the tests have no limit. A test file still tests one module: when it grows beyond the limit, the module probably has more than one responsibility and is split, or tests that differ only in their input are combined with `test.each()`. Long tests move their data into constants and their repeated steps into helpers (see [Testing](testing.md#files-and-structure)).

Blank lines, comments and the line breaks that Prettier adds count as well. ESLint checks the limits: `max-lines` and `max-lines-per-function` for the code, including test helpers and mocks, and for test files `max-lines` and the local rule `tests/max-lines-per-test` in `eslint.config.mjs` (see [Build and packaging](build-and-packaging.md#eslint)).[^eslint]

# Code quality

- Avoid duplicated code. Move it into a shared function, class or module. `npm run lint` reports duplicated code with jscpd, also in tests and also when names were changed (see [Build and packaging](build-and-packaging.md#duplicated-code)).[^jscpd]
- Remove code that nothing uses. `npm run lint` reports unused files, exports, class members and dependencies with fallow, also code that only tests use (see [Build and packaging](build-and-packaging.md#unused-code)).[^fallow]
- Export only what other modules use. Tests use a module through its exports; do not export something only so that a test can call it.
- A conditional expression (`a ? b : c`) spans at most three lines. Write a longer one, for example one with array or object literals in its branches or a nested one, as `if`/`else`. The local ESLint rule `style/max-ternary-lines` checks this.[^eslint]
- Prettier formats the code, the configuration files and the documentation. `npm run format` formats all files, and VS Code formats them on save; `npm run lint` checks the formatting (see [Build and packaging](build-and-packaging.md#formatting)).[^prettier]
- `npm run lint` must report no errors, and as few warnings as possible. `npm run lint:fix` fixes what it can. The rules are described in [Build and packaging](build-and-packaging.md#lint).[^eslint]
- Disable an ESLint rule only as a last resort, with an `eslint-disable-next-line` comment that gives the reason.
- Exclude duplicated code from jscpd only as a last resort. Put `// jscpd:ignore-start` and `// jscpd:ignore-end` around it, with a comment that gives the reason.
- Suppress a finding of fallow only as a last resort, with a `fallow-ignore-next-line` or `fallow-ignore-file` comment that gives the reason after `--`. fallow checks that the reason is there.[^fallow]
- Have the changes reviewed by Copilot code review and handle its comments. If you do not follow a comment, give the reason.
- After changes made because of review comments, request another review. Merge a pull request only when the last review has no findings, or when each remaining finding is dismissed for a good reason, given as a reply to the comment.

# Structure reviews

Reviews of single changes don't show whether the structure of the code as a whole still fits. So the structure is reviewed at fixed points:

- at the end of each phase of the roadmap;
- before each large redesign, as part of planning it.

A review checks:

- the responsibilities of the parts;
- the direction of the dependencies;
- the [Principles](architecture.md#principles);
- code that the extension host and the webview each write on their own.

The reports of the duplicate check and the unused-code check are inputs. The review updates [Architecture](architecture.md) and records its decisions as ADRs. What doesn't fit becomes a known issue.

# TypeScript

- The TypeScript configuration is `strict`. `any` is not allowed (ESLint reports it as an error).[^tsconfig][^eslint]
- Unused variables, imports, parameters and private class members are errors (ESLint), and so is unreachable code (TypeScript). Prefix a parameter that must exist but is not used with `_`.[^tsconfig][^eslint]
- An index access, such as `items[0]` or `prefixes[prefix]`, may return `undefined` (`noUncheckedIndexedAccess`). Check the value, or avoid the index with `for…of`, `forEach()`, `find()` or `at()`. Groups of a regular expression are read with `requireGroup()` from `shared/regexUtils.ts`. In tests, a non-null assertion (`items[0]!`) is fine, because a wrong assumption makes the test fail.[^tsconfig]
- Define interfaces or types for all data structures. Commands and messages are discriminated unions (see [Commands](commands.md) and [Messaging](messaging.md)).
- **Named types.** Name a type where it stands for a concept, for example in an exported signature or where it is used more than once, instead of writing the same anonymous type, such as `{ name?: string }`, in several places. Before defining a new type, look for an existing one and use it, or a part of it (`Pick`): the types of `shared/`, of the module you work in and the generated schema classes and their unions (see [ADR 007](architecture/007-diagram-items-reference-schema-objects.md)). A one-off shape of a local value needs no name. A parameter takes the type that its callers pass; narrow it (`Pick`, a structural type) only if callers pass objects of different types. `npm run lint` reports an anonymous type that occurs more than once in the production code (see [Build and packaging](build-and-packaging.md#anonymous-types)).
- **Casts.** A cast states what an object is. Cast to a class or type only if the object is one; to read a field that only some members of a union have, narrow the union with `in` instead, but decide by the value of the field, not by whether the key exists (see [ADR 006](architecture/006-module-structure.md#schema-objects-on-both-sides)); where a cast cannot be avoided, name only the part that is read.
- Names: PascalCase for classes, interfaces and types; camelCase for functions, methods and variables; UPPER_CASE for module-level constants. Names say what something is or does.
- Length of names: clarity comes first, but keep them short. Aim for less than 15 characters; 25 to 30 is the upper limit. `createElement` is better than `createElementWithChildren`; `createElementNodeWithProcessingOfAnonymousTypes` is too long, `cen` too cryptic.
- Functions that check a command or a part of it are called `validate...()`, for example `validateRestrictionFacets()`, and return a `ValidationResult`, also when the command is valid, not `null` or a bare error.

# Project boundaries

- The code is split into the projects `shared/`, `src/` (extension host) and `webview-src/` (webview), each with its tests (see [Architecture](architecture.md#components)).
- `shared/` only uses code from `shared/`. `src/` and `webview-src/` only use their own code and `shared/`. `scripts/` only uses code from `scripts/`: Node runs the scripts directly, without a build, which the code in `shared/` needs (see [Build and packaging](build-and-packaging.md#scripts)). This also applies to tests and test helpers: a helper that tests of several projects need belongs in `shared/__tests__/`.
- Only the integration tests in `test/integration/` may use `src/` and `webview-src/` together, for example to check that the commands the webview builds are accepted by the extension host (see [Testing](testing.md#kinds-of-tests)).
- ESLint enforces these boundaries with `no-restricted-imports` (see [Build and packaging](build-and-packaging.md#lint)). Within a project, fallow checks the layers of [ADR 006](architecture/006-module-structure.md#layers) (see [Layers](build-and-packaging.md#layers)). The rule only sees static imports and exports; dynamic `import()`, the paths of `vi.mock()` and files read with `node:fs` are not checked and follow the rule all the same.[^eslint]

# VS Code and Node versions

- The lowest supported VS Code version (`engines.vscode`) decides the Node version the extension runs on. `@types/vscode`, `@types/node`, `.nvmrc` and the ECMAScript edition in the tsconfig files and `eslint.config.mjs` are derived from it; change them only with `npm run vscode:update`, not by hand. How the versions are derived is described in [Build and packaging](build-and-packaging.md#vs-code-and-node-versions).[^manifest]
- Use only the VS Code and Node APIs that these types offer, and only the syntax and library features of that ECMAScript edition. A newer API or feature needs a higher minimum VS Code version first.

# TSDoc

Every function, method and class has an up-to-date TSDoc comment: what it does, each parameter with `@param name - description`, the return value with `@returns` (functions without a return value have none), and the errors it throws with `@throws An {@link Error} if …`. Complex functions also get an `@example`.

```typescript
/**
 * Processes an XML schema element and creates a diagram item.
 *
 * @param element - The XML schema element to process
 * @param parentId - The ID of the parent diagram item
 * @returns A new DiagramItem for the element, or null if it is invalid
 * @throws A {@link SchemaParseError} if the element structure is invalid
 */
```

- Code in comments is written as code: identifiers, IDs such as `/element:name`, expressions, XML, QNames such as `xs:string`, and file paths. This matters even more for package names that start with `@`, such as `@types/node`, and for text with `{`, `}` or `>`, such as `{namespace}name`, because TSDoc would read them as tags or HTML.
- `@throws` does not start with `{`: TypeScript, and so the hover of editors, reads a `{` right after `@throws` as the type of the error, and breaks `{@link Error}` there into two tags.
- TSDoc has no dotted parameter names such as `@param options.name`. Describe the fields of a destructured parameter at its type, with a comment per field.
- ESLint checks the syntax with `eslint-plugin-tsdoc`, and with `eslint-plugin-jsdoc` that the comments and their tags exist (see [Build and packaging](build-and-packaging.md#eslint)).[^eslint]

# Tests

New and changed code is tested. A unit test tests the module it sits next to and calls it directly; a test that reaches a module only through another module is an integration test (see [Kinds of tests](testing.md#kinds-of-tests)). All rules for tests, mocks and test helpers are in [Testing](testing.md#conventions).

# Documentation

The documentation of the extension is the knowledge bundle in `docs/`, in the Open Knowledge Format; [the index](index.md) lists its documents.[^okf]

- **Keep it current.** When a change affects what a document describes, update the document in the same change. Then set its `generated` to the person responsible for the content (`by: human:<GitHub user>`, also when an agent wrote the text) and the current time (UTC), set `status: draft` and remove `verified`, and add an entry to [the log](log.md), newest date first. A log entry says which documents changed and what they now say, with the reason where it is not obvious; a change of the code without a change of a document gets no entry, it is described in the commit message, and a notable one in the changelog. When the maintainer has approved the document, set `status: stable` and add `verified` with `by: human:<GitHub user>` and the time. A change that only reformats a document, such as running Prettier, does not change what it says: the document keeps its status, and one log entry records the reformatting of all documents.
- **Known issues.** Record problems you find outside the current task in [Known issues](known-issues.md), sorted by severity and effort, and remove them when they are fixed. A change to the known issues is a change like any other.
- **New documents** get front matter (`type`, `title`, a one-sentence `description`, `tags`, `status`, `generated`, `sources`), an entry in [the index](index.md) with the same description, and a log entry.
- **Sources.** Each source has an `id`, a relative `resource` and a `title`. Important statements get a footnote `[^id]` whose text is the title of the source. Separate the footnote definitions with blank lines.
- **Format.** Files use LF line endings, which `.gitattributes` (`* text=auto`) makes Git store for every text file. Links are relative; code and file paths are formatted as code, without line numbers. A document describes the current state and decided future work, not its own history; the history goes into the log.
- **Diagrams.** Mermaid diagrams use one arrow with a combined label for both directions, so that labels do not overlap. Check that a diagram renders with `npx -y @mermaid-js/mermaid-cli -i diagram.mmd -o diagram.png`.
- **Architecture decisions** are recorded in `docs/architecture/`. ADR 001 is a living document: deviations from it are recorded in its section 9 with their reason.
- **README and changelog.** `README.md` is also the page of the extension in the VS Code Marketplace. It is written for users and describes the state of the branch it is on; information for contributors goes into `CONTRIBUTING.md`. Keep both up to date, and record notable changes in a changelog (there is none yet, see [the known issue](known-issues.md#there-is-no-changelog)).

# Issues

- When you start working on an issue, move it to "In Progress" on the project board [Visual XML Schema Editor](https://github.com/users/neumaennl/projects/1). How agents use the board is described in [the agent instructions for the project board](agent-instructions/project-board.md). If you cannot change the board, tell the maintainer.
- Closing keywords such as `Closes #440` close an issue only when the commit reaches the default branch `main`. On other branches, such as the editor branch, which is merged into `main` long after its issues are done, name the issue without a keyword, for example `(#440)`, and close it by hand after the push, with a comment that names the commit.

# Before committing

1. `npm run lint` passes (see [Lint](build-and-packaging.md#lint)); `npm run format` fixes the formatting.
2. `npm test` passes; it first compiles the extension and the webview and type-checks the tests and the scripts (`pretest`).[^manifest]
3. After changes to activation, the registration of the custom editor or the message handling, `npm run test:extension-host` passes (see [Testing](testing.md#tests-in-the-extension-host)).
4. The changes follow these guidelines.
5. The documentation is updated.
6. Copilot code review has checked the changed files.

# Commits

- Each commit has one purpose and a clear message.
- Work that the maintainer approves step by step is committed locally after each approved step; drafts that are not approved yet stay uncommitted.
- When all steps are done, the message of the first commit is reworded to describe the whole change, and the later commits are marked as `fixup` with `git rebase -i`. Do not use `squash`, because it combines the messages. The commits stay separate instead if each of them has a purpose of its own and the maintainer agrees, for example a check and the cleanups it requires; then the last commit finishes the issue (see [Issues](#issues) for closing it). Push only after the maintainer has agreed.
- If work in progress was pushed, ask whether the next commit is a new one or a `fixup` of the pushed one; a `fixup` then needs a force push.

[^eslint]: ESLint configuration

[^jscpd]: jscpd configuration

[^fallow]: fallow configuration

[^prettier]: Prettier configuration

[^tsconfig]: TypeScript configuration of the extension host

[^manifest]: Extension manifest (scripts)

[^agents]: Instructions for AI coding agents

[^okf]: Open Knowledge Format specification
