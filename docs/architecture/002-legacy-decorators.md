---
type: Architecture Decision Record
title: "ADR 002: Legacy TypeScript decorators"
description: The decision to compile the decorators of the generated schema classes as TypeScript's legacy decorators instead of TC39 Stage 3 decorators, with the reasons, the consequences, the rejected alternatives and when to review it.
tags: [adr, architecture, decorators, typescript, build, testing]
status: stable
generated: { by: human:neumaennl, at: 2026-10-10T20:35:44Z }
verified: { by: human:neumaennl, at: 2026-10-10T20:38:55Z }
sources:
  - id: tsconfig
    resource: ../../tsconfig.json
    title: TypeScript configuration of the extension host
  - id: tsconfig-webview
    resource: ../../tsconfig.webview.json
    title: TypeScript configuration of the webview
  - id: annotation-validators
    resource: ../../src/commandValidators/annotationValidators.ts
    title: Validators for annotation commands
  - id: xmlbind-ts
    resource: https://github.com/neumaennl/xmlbind-ts#typescript-decorator-support
    title: "xmlbind-ts: TypeScript decorator support"
  - id: tc39-proposal
    resource: https://github.com/tc39/proposal-decorators
    title: TC39 decorators proposal
  - id: tc39-notes
    resource: https://github.com/tc39/notes/blob/HEAD/meetings/2026-05/may-19.md#decorators-for-stage-27
    title: "TC39 meeting notes, May 2026: Decorators for Stage 2.7"
  - id: oxc-9170
    resource: https://github.com/oxc-project/oxc/issues/9170
    title: "Oxc: transformer: ecma decorators (oxc-project/oxc#9170)"
  - id: vite-22353
    resource: https://github.com/vitejs/vite/issues/22353
    title: "Vite: Failed to parse tc39 decorators using vite 8 (vitejs/vite#22353)"
  - id: ts7
    resource: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
    title: Announcing TypeScript 7.0
  - id: ts71-plan
    resource: https://github.com/microsoft/TypeScript/issues/63703
    title: TypeScript 7.1 Iteration Plan (microsoft/TypeScript#63703)
  - id: ts-emit-api
    resource: https://github.com/microsoft/typescript-go/pull/4699
    title: "TypeScript 7.1: API emit (microsoft/typescript-go#4699)"
  - id: tseslint-ts7
    resource: https://github.com/typescript-eslint/typescript-eslint/issues/10940
    title: "typescript-eslint: Use TS 7 for type information (typescript-eslint/typescript-eslint#10940)"
  - id: issue-365
    resource: https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/365
    title: Switch to legacy TypeScript decorators (#365)
---

# ADR 002: Legacy TypeScript decorators

**Status:** Accepted  
**Date:** 2026-10-10  
**Issue:** [#365](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/365)[^issue-365]

## Context

The classes in `shared/generated/` describe XML Schema itself and carry decorators of `@neumaennl/xmlbind-ts` (`@XmlRoot`, `@XmlElement`, `@XmlAttribute` and others), which map XML to properties (see [Schema model](../schema-model.md)). TypeScript compiles decorators in one of two ways:

- **Legacy decorators**, with `experimentalDecorators: true`: TypeScript's own variant from 2015. They are not a standard and will not become one, but TypeScript does not change them anymore, and every common compiler supports them.
- **Stage 3 decorators**, without that flag: TypeScript's implementation of the TC39 decorators proposal and its default since TypeScript 5.0.

`xmlbind-ts` supports both kinds and detects which one is used; the generated classes pass an explicit `type` where a value is not a string, so they do not need `emitDecoratorMetadata`.[^xmlbind-ts] No tsconfig set the flag, so the project used Stage 3 decorators by default, not by decision.

When this ADR was written:

- **The proposal moved back.** It had been at Stage 3 since March 2022, but no JavaScript engine shipped it. In May 2026, TC39 moved it back to Stage 2.7, which means that it can still change; Firefox's and Safari's engines do not plan to implement it before another engine does.[^tc39-proposal][^tc39-notes]
- **Oxc does not lower them.** Neither Node nor VS Code can run decorators, so a compiler has to translate ("lower") them into plain JavaScript. `tsc` does that for both kinds. Oxc, the compiler of Vite 8 and therefore of Vitest 5, lowers only legacy decorators; it waits for the proposal to become stable before it lowers Stage 3 decorators.[^oxc-9170][^vite-22353] With Stage 3 decorators, Vitest would need a transform plugin that calls `ts.transpileModule`, as the tests of `xmlbind-ts` do.
- **TypeScript 7 has no JavaScript API.** TypeScript 7.0 compiles and emits like 6.0 and supports both kinds of decorators, but it has no JavaScript API, so `ts.transpileModule` does not exist there.[^ts7] TypeScript 7.1 (planned for November 2026) brings a new API whose emit works on a whole program instead of a single file.[^ts71-plan][^ts-emit-api] `typescript-eslint` supports TypeScript up to 6.0; its support for 7.1 is experimental work in progress without a date, so the project stays on TypeScript 6 or older for now.[^tseslint-ts7]
- **Webview.** The webview imports only types from the generated classes, so its bundle contains no decorators. The choice affects the extension host and the tests, not Phase 4 (Vite for the webview).

## Decision

The generated classes use legacy decorators. `tsconfig.json` and `tsconfig.webview.json` set:[^tsconfig][^tsconfig-webview]

- `experimentalDecorators: true`
- `useDefineForClassFields: true`
- no `emitDecoratorMetadata`

The test configurations extend these files and inherit the settings.

## Reasons

| | Legacy decorators | Stage 3 decorators |
|---|---|---|
| Standard | No, and never will be; the flag is called "experimental". | Follows a TC39 proposal, but one that moved back to Stage 2.7 and may change. |
| Stability | Frozen; TypeScript 6 and 7 support them unchanged. | If the proposal changes, TypeScript changes its output, and `xmlbind-ts` may have to follow. |
| Engines | None runs them; `tsc` lowers them. | None runs them; `tsc` lowers them. |
| Compilers | `tsc`, Babel, esbuild, SWC and Oxc. | `tsc`, Babel and esbuild; not Oxc, so not Vite 8 and Vitest 5. |
| Vitest | Needs nothing; Vite reads the flags from `tsconfig`. | Needs a transform plugin that depends on the JavaScript API of TypeScript 6, which TypeScript 7 does not have; it would have to be rewritten for the API of 7.1 or stay on the compatibility package `@typescript/typescript6`. |
| Output | The compiled generated classes were less than half as large when this ADR was written. | Larger, because every decorated class gets helper calls. |
| Ecosystem | Widely used (Angular, NestJS, TypeORM); `xmlbind-ts` tests itself with them. | The TypeScript default; `xmlbind-ts` supports them. |
| Change | Three flags in two files; the generated code stays as it is. | None; it is the state before this ADR. |

The project needs no feature that only one of the two kinds has. The deciding points are that Stage 3 decorators would tie the tests to a plugin built on an API that TypeScript is replacing, and to a proposal that has just moved backwards, while legacy decorators work with all tools as they are.

## Consequences

- **Fields must exist on the objects.** `hasAnnotationProperty()` in the annotation validators decides with `"annotation" in node` whether a node supports annotations.[^annotation-validators] That only works if declared fields exist on the object even when they have no value. Stage 3 decorators made that happen as a side effect. With legacy decorators and the ES2020 target, fields without a value do not exist, and the annotation tests fail. `useDefineForClassFields: true` creates every declared field, so the behavior no longer depends on the kind of decorators. With this option, legacy decorators that put accessors on the prototype would be hidden by the fields; the decorators of `xmlbind-ts` only record metadata, so this does not apply.
- **No type metadata.** Without `emitDecoratorMetadata`, `xmlbind-ts` does not read the TypeScript types at runtime and relies on the explicit `type` in the generated classes. Oxc would derive these types less precisely than `tsc`, so tests and build could behave differently if it were enabled.
- **Vitest needs no plugin** for decorators: Vite reads `experimentalDecorators` from `tsconfig` and passes it to Oxc.
- **The editor branch** takes the settings over in Phase 9. It uses `xmlbind-ts` 2.x, which detects the kind of decorators in the same way. Its tests passed with these settings and `xmlbind-ts` 2.2 when this ADR was written.
- **A later switch back** changes only the flags. The syntax of the generated code is the same for both kinds.

## Rejected alternatives

- **Stay with Stage 3 decorators** and add a transform plugin to Vitest: see the reasons above.
- **Legacy decorators with `emitDecoratorMetadata`:** not needed, because the generated classes pass explicit types; Oxc derives the metadata less precisely than `tsc`; and TypeScript's design goals advise against emitting runtime type information.

## Review

Review this decision when one of these happens:

- Oxc lowers Stage 3 decorators ([oxc-project/oxc#9170](https://github.com/oxc-project/oxc/issues/9170)).[^oxc-9170]
- The decorators proposal changes its stage, or a JavaScript engine ships decorators.[^tc39-proposal]
- TypeScript deprecates `experimentalDecorators` or changes how either kind is compiled.
- A major upgrade of TypeScript, Vite, Vitest or `xmlbind-ts`, including the Dependabot pull requests for them.
- `xmlbind-ts` drops support for one of the two kinds.

The maintainer follows oxc-project/oxc#9170 and the repository `tc39/proposal-decorators` on GitHub and gets notified when they change.

[^tsconfig]: TypeScript configuration of the extension host

[^tsconfig-webview]: TypeScript configuration of the webview

[^annotation-validators]: Validators for annotation commands

[^xmlbind-ts]: xmlbind-ts: TypeScript decorator support

[^tc39-proposal]: TC39 decorators proposal

[^tc39-notes]: TC39 meeting notes, May 2026: Decorators for Stage 2.7

[^oxc-9170]: Oxc: transformer: ecma decorators (oxc-project/oxc#9170)

[^vite-22353]: Vite: Failed to parse tc39 decorators using vite 8 (vitejs/vite#22353)

[^ts7]: Announcing TypeScript 7.0

[^ts71-plan]: TypeScript 7.1 Iteration Plan (microsoft/TypeScript#63703)

[^ts-emit-api]: TypeScript 7.1: API emit (microsoft/typescript-go#4699)

[^tseslint-ts7]: typescript-eslint: Use TS 7 for type information (typescript-eslint/typescript-eslint#10940)

[^issue-365]: Switch to legacy TypeScript decorators (#365)
