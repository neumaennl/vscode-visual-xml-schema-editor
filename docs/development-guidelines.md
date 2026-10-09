---
type: Guideline
title: Development guidelines
description: Rules for everyone who changes the extension - code size, code quality and ESLint, TypeScript and naming, VS Code and Node versions, TSDoc, tests, documentation and the knowledge bundle, issues, what to check before committing, and commits.
tags: [guidelines, conventions, code-quality, typescript, documentation, workflow]
status: stable
generated: { by: human:neumaennl, at: 2026-10-09T20:43:28Z }
verified: { by: human:neumaennl, at: 2026-10-09T20:46:59Z }
sources:
  - id: eslint
    resource: ../eslint.config.mjs
    title: ESLint configuration
  - id: tsconfig
    resource: ../tsconfig.json
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
- For now, test files are exempt from both limits.

ESLint does not check the limits. Some code exceeds them, and the exemption for tests is not settled yet (see [Code exceeds the size limits](known-issues.md#code-exceeds-the-size-limits) and [Tests are exempt from the size limits](known-issues.md#tests-are-exempt-from-the-size-limits)).

# Code quality

- Avoid duplicated code. Move it into a shared function, class or module.
- `npm run lint` must report no errors, and as few warnings as possible. `npm run lint:fix` fixes what it can. The rules are described in [Build and packaging](build-and-packaging.md#lint).[^eslint]
- Disable an ESLint rule only as a last resort, with an `eslint-disable-next-line` comment that gives the reason.
- Have the changes reviewed by Copilot code review and handle its comments. If you do not follow a comment, give the reason.

# TypeScript

- The TypeScript configuration is `strict`. `any` is not allowed (ESLint reports it as an error).[^tsconfig][^eslint]
- Define interfaces or types for all data structures. Commands and messages are discriminated unions (see [Commands](commands.md) and [Messaging](messaging.md)).
- Names: PascalCase for classes, interfaces and types; camelCase for functions, methods and variables; UPPER_CASE for module-level constants. Names say what something is or does.
- Length of names: clarity comes first, but keep them short. Aim for less than 15 characters; 25 to 30 is the upper limit. `createElement` is better than `createElementWithChildren`; `createElementNodeWithProcessingOfAnonymousTypes` is too long, `cen` too cryptic.

# VS Code and Node versions

- The lowest supported VS Code version (`engines.vscode`) decides the Node version the extension runs on. `@types/vscode`, `@types/node` and `.nvmrc` are derived from it; change all four only with `npm run vscode:update`, not by hand. How the versions are derived is described in [Build and packaging](build-and-packaging.md#vs-code-and-node-versions).[^manifest]
- Use only the VS Code and Node APIs that these types offer. A newer API needs a higher minimum VS Code version first.

# TSDoc

Every function has an up-to-date TSDoc comment: what it does, each parameter with `@param`, the return value with `@returns`, and the errors it throws with `@throws`. Complex functions also get an `@example`.

```typescript
/**
 * Processes an XML schema element and creates a diagram item.
 *
 * @param element - The XML schema element to process
 * @param parentId - The ID of the parent diagram item
 * @returns A new DiagramItem for the element, or null if it is invalid
 * @throws {SchemaParseError} If the element structure is invalid
 */
```

# Tests

New and changed code is tested. All rules for tests, mocks and test helpers are in [Testing](testing.md#conventions).

# Documentation

The documentation of the extension is the knowledge bundle in `docs/`, in the Open Knowledge Format; [the index](index.md) lists its documents.[^okf]

- **Keep it current.** When a change affects what a document describes, update the document in the same change. Then set its `generated` to the person responsible for the content (`by: human:<GitHub user>`, also when an agent wrote the text) and the current time (UTC), set `status: draft` and remove `verified`, and add an entry to [the log](log.md), newest date first. When the maintainer has approved the document, set `status: stable` and add `verified` with `by: human:<GitHub user>` and the time.
- **Known issues.** Record problems you find outside the current task in [Known issues](known-issues.md), sorted by severity and effort, and remove them when they are fixed. A change to the known issues is a change like any other.
- **New documents** get front matter (`type`, `title`, a one-sentence `description`, `tags`, `status`, `generated`, `sources`), an entry in [the index](index.md) with the same description, and a log entry.
- **Sources.** Each source has an `id`, a relative `resource` and a `title`. Important statements get a footnote `[^id]` whose text is the title of the source. Separate the footnote definitions with blank lines.
- **Format.** Files use LF line endings. Links are relative; code and file paths are formatted as code, without line numbers. A document describes the current state and decided future work, not its own history; the history goes into the log.
- **Diagrams.** Mermaid diagrams use one arrow with a combined label for both directions, so that labels do not overlap. Check that a diagram renders with `npx -y @mermaid-js/mermaid-cli -i diagram.mmd -o diagram.png`.
- **Architecture decisions** are recorded in `docs/architecture/`. ADR 001 is a living document: deviations from it are recorded in its section 9 with their reason.
- **README and changelog.** `README.md` is also the page of the extension in the VS Code Marketplace. It is written for users and describes the state of the branch it is on; information for contributors goes into `CONTRIBUTING.md`. Keep both up to date, and record notable changes in a changelog (there is none yet, see [the known issue](known-issues.md#there-is-no-changelog)).

# Issues

- When you start working on an issue, move it to "In Progress" on the project board [Editor Refactor](https://github.com/users/neumaennl/projects/1). If you cannot change the board, comment on the issue that you are working on it.

# Before committing

1. `npm run lint` passes.
2. `npm test` passes; it compiles the extension and the webview first (`pretest`).[^manifest]
3. The changes follow these guidelines.
4. The documentation is updated.
5. Copilot code review has checked the changed files.

# Commits

- Each commit has one purpose and a clear message.
- Work that the maintainer approves step by step is committed locally after each approved step; drafts that are not approved yet stay uncommitted.
- When all steps are done, the message of the first commit is reworded to describe the whole change, and the later commits are marked as `fixup` with `git rebase -i`. Do not use `squash`, because it combines the messages. Push only after the maintainer has agreed.
- If work in progress was pushed, ask whether the next commit is a new one or a `fixup` of the pushed one; a `fixup` then needs a force push.

[^eslint]: ESLint configuration

[^tsconfig]: TypeScript configuration of the extension host

[^manifest]: Extension manifest (scripts)

[^agents]: Instructions for AI coding agents

[^okf]: Open Knowledge Format specification
