---
type: Architecture Decision Record
title: "ADR 003: Validators check, executors assume"
description: The decision that the validators check everything an executor relies on and the executors do not check it again, how an executor states what it assumes, why this is safe, the scenarios that were examined, and how a test keeps validators and executors in agreement.
tags: [adr, architecture, commands, validation, error-handling, testing]
status: stable
generated: { by: human:neumaennl, at: 2026-11-11T18:50:29Z }
verified: { by: human:neumaennl, at: 2026-11-11T19:10:51Z }
sources:
  - id: command-processor
    resource: ../../src/commandProcessor.ts
    title: CommandProcessor
  - id: assume-validated
    resource: ../../src/commandExecutors/assumeValidated.ts
    title: Assumptions of the executors
  - id: command-agreement-test
    resource: ../../test/integration/commandAgreement.test.ts
    title: "Integration test: validators and executors agree"
  - id: issue-402
    resource: https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/402
    title: "Modernization Phase 9: reintegrate with the editor branch (#402)"
---

# ADR 003: Validators check, executors assume

**Status:** Accepted  
**Date:** 2026-11-03  
**Issue:** [#402](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/402)[^issue-402]

## Context

Every command has a validator and an executor (see [Commands](../commands.md)). `CommandProcessor` runs the validator first and the executor only if the validator accepts the command, on a copy of the schema (see [Persistence](../persistence.md#command-pipeline)).[^command-processor] It was not settled what the executors check themselves. Some had their own checks that repeated the validators; most guarded against a missing parent or target with `if (!x) return;`, so that a command reported success without doing anything; others failed with a `TypeError`. Where a validator and its executor disagreed, the result was a lost change that looked like a success.

## Decision

- **The validator checks everything the executor relies on:** that the parent and the target exist, that the parent can hold the new node, that the payload is complete and consistent, and the rules of XML Schema and of the editor. If an executor relies on something that the validator does not check, the validator is extended.
- **The executor does not repeat these checks.** It assumes that the command is valid.
- **Where the types need such an assumption, the executor states it** with the helpers in `src/commandExecutors/assumeValidated.ts`:[^assume-validated] `assumeValidated(value, what)` returns a value that the validator guarantees, `assumeRemoved()` checks that a removal removed something, `locateValidated()` locates a node that the validator found, and `assumptionFailed()` marks a branch that a valid command cannot reach. If an assumption does not hold, the command fails with an error such as "Element person not found, although the validator accepted the command".
- **`CommandProcessor` turns every exception into a runtime failure.** The document stays unchanged, and the webview shows the message.
- **A test keeps validators and executors in agreement.** `test/integration/commandAgreement.test.ts` builds the diagram of every schema in `src/__tests__/test-resources` and `exampleFiles`, creates the commands that the webview can send for its nodes, and applies every command that the validator accepts. The executor must neither throw nor leave the schema unchanged.[^command-agreement-test]

## Reasons

- **The validators already are the gatekeepers.** The architecture gives them this role (see [Architecture](../architecture.md#principles)), and they check the parent and the target of every command. Checks in the executors could only repeat them, and two copies of a rule drift apart.
- **The executors cannot crash the extension.** They run only inside `CommandProcessor`, after validation and on a copy, and every exception becomes a runtime failure. Failing gracefully needs no checks in the executors.
- **A silent no-op is worse than an error.** A guard that returns reports success while the user's change is lost. An assumption that fails names the disagreement, so it is found and fixed in the validator or the executor.

## Scenarios that were examined

These scenarios could need checks in an executor. None of them does:

- **Data that the validator cannot see.** The validator and the executor see the same data: the executor works on a copy of the schema that the validator checked, in the same synchronous call.
- **Stale IDs.** A command may carry IDs from a schema that the document no longer has (see [Persistence](../persistence.md#concurrency)). The validator resolves them against the current document and rejects them.
- **Executors called without validation.** Only `CommandProcessor` calls the executors.
- **Payloads that do not match the types.** Messages from the webview are not checked at runtime (see [Messaging](../messaging.md#channel)); the validators check the fields that matter, and anything else fails as a runtime failure.

The examination also found where validators and executors disagreed. The validators already checked every parent and target; the disagreements were in what the executors did with a valid command:

- `modifySimpleType` without body fields re-applied the body of a list or union type and failed, so such types could not be renamed. The executor now leaves the body as it is.
- `modifyGroup` accepted `minOccurs` and `maxOccurs` for the compositor of a group definition, which XML Schema does not allow there and which serialization dropped. The validator now rejects them, and the properties panel does not offer them.
- `removeGroup` on a compositor inside another compositor changed nothing. The executor now removes it.
- `modifyComplexType` accepted a `derivationKind` for a type without a base type, which has nothing to derive from. The validator now rejects it, also in `addComplexType`.
- `modifyComplexType` ignored a `baseType` for a type without a compositor, for example one whose content is a group reference. The executor now wraps the content in `complexContent` as it is.

The same code had three more gaps that produced invalid XSD instead of a no-op, so the validator now rejects them: a `baseType` that names no known type, a `contentModel` for a type whose particle is a group reference, and changes of the derivation or content model of a type with simple content, which the editor does not support yet.

## Consequences

- An executor has no checks of its own besides the assumptions. A new executor states what it assumes with the helpers instead of returning silently.
- A new rule that an executor needs goes into the validator, with a test of the validator.
- A disagreement shows up as a failing agreement test, or at runtime as an error that says that the validator accepted the command. Tests of an executor may use such input to check the error.
- The agreement test only covers the nodes of the test schemas and the commands it creates for them. A new kind of node or command needs a schema in `test-resources` that contains it, and the command in the test.

## Rejected alternatives

- **Checks in the executors.** Each executor would check what it relies on and throw a meaningful error. This repeats the validators, and the copies drift apart.
- **Deleting the guards without replacing them.** A disagreement would surface as a `TypeError` or as a silent no-op. The `TypeError` is graceful too, but does not say what went wrong, and a no-op is not noticed at all.

## Review

Review this decision if the executors are called from somewhere other than `CommandProcessor`, or if validation and execution no longer run on the same schema in the same call.

[^command-processor]: [CommandProcessor](../../src/commandProcessor.ts)

[^assume-validated]: [Assumptions of the executors](../../src/commandExecutors/assumeValidated.ts)

[^command-agreement-test]: [Integration test: validators and executors agree](../../test/integration/commandAgreement.test.ts)

[^issue-402]: [Modernization Phase 9: reintegrate with the editor branch (#402)](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/402)
