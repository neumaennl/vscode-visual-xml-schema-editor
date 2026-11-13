---
type: Architecture Decision Record
title: "ADR 004: XML Schema 1.0 first"
description: The decision to support XML Schema 1.0 now and XML Schema 1.1 later, the two conditions that keep the way to 1.1 open, how 1.1 could be added, the open question about validation, and when to review it.
tags: [adr, architecture, schema-model, xsd-1.1, validation]
status: stable
generated: { by: human:neumaennl, at: 2026-11-11T07:57:24Z }
verified: { by: human:neumaennl, at: 2026-11-11T08:28:29Z }
sources:
  - id: meta-schema
    resource: ../../schema/XMLSchema.xsd
    title: XML Schema 1.0 meta-schema
  - id: issue-284
    resource: https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/284
    title: "Explore the connection to the Red Hat XML extension for schema validation (#284)"
  - id: issue-289
    resource: https://github.com/neumaennl/xmlbind-ts/issues/289
    title: "xmlbind-ts: Design how a round trip keeps the source of a document (#289)"
---

# ADR 004: XML Schema 1.0 first

**Status:** Accepted  
**Date:** 2026-11-11

## Context

The schema classes in `shared/generated/` are generated from `schema/XMLSchema.xsd` (see [Schema model](../schema-model.md#generated-classes)). That file is the schema for schemas of XML Schema 1.0: it has `version="1.0"`, the namespace `http://www.w3.org/2001/XMLSchema` and the document type `-//W3C//DTD XMLSCHEMA 200102//EN`, and none of the constructs that XML Schema 1.1 adds.[^meta-schema] So the editor knows the elements and attributes of XML Schema 1.0 only.

XML Schema 1.1 adds constructs such as `xs:assert`, `xs:alternative`, `xs:openContent`, `xs:defaultOpenContent` and `xs:override`, and the `vc:` attributes for conditional inclusion. It also changes rules that exist in 1.0: an `xs:all` may contain elements with `maxOccurs` greater than 1 and group references, wildcards get `notNamespace` and `notQName`, and XPath expressions appear in more places, with `xpathDefaultNamespace`.

## Decision

The editor supports XML Schema 1.0. XML Schema 1.1 is added later, when users ask for it. Two conditions keep that way open:

1. **The editor does not silently destroy 1.1 constructs.** A schema that uses them can be opened, and an edit must not lose them. This condition is not met today: the constructs that the 1.0 classes do not map, such as `xs:assert`, are dropped on every command (see [Known issues](../known-issues.md#commands-can-change-or-lose-content-outside-the-edit)). The fix belongs to `xmlbind-ts`, which is to keep unmapped content ([xmlbind-ts#289](https://github.com/neumaennl/xmlbind-ts/issues/289)).[^issue-289]
2. **XPath, `xs:all` and wildcards are not hard-wired to the rules of 1.0.** Code that handles selectors and fields, the particles of an `xs:all`, or the attributes of `xs:any` and `xs:anyAttribute` keeps the 1.0 rules in one place each, so that 1.1 can change them without a search through the code.

## How 1.1 could be added

The model becomes a superset: the classes are generated from the schema for schemas of 1.1, which contains everything of 1.0. XML Schema 1.0 becomes a profile of it: for a 1.0 schema, the palette, the properties panel and the validators offer and accept only what 1.0 allows. How the editor tells which version a schema uses, for example from `vc:minVersion` or from a setting, is decided then.

## Validation

Validating schemas is planned through the Red Hat XML extension and its language server LemMinX ([#284](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/284)).[^issue-284] Whether LemMinX validates XML Schema 1.1 is not known yet. If it validates 1.0 only, 1.1 needs another way to validate.

## Consequences

- The palette, the commands and the properties panel cover XML Schema 1.0 only.
- Until condition 1 is met, editing a schema that uses 1.1 constructs loses them.
- New code that handles XPath, `xs:all` or wildcards follows condition 2.

## Rejected alternatives

- **Generating the classes from the 1.1 schema for schemas now.** The editor would have to decide for every 1.1 construct how it is shown and edited, and validation of 1.1 is unclear, while nobody has asked for 1.1 yet.

## Review

Review this decision when users ask for XML Schema 1.1, or when it is known whether LemMinX validates 1.1.

[^meta-schema]: [XML Schema 1.0 meta-schema](../../schema/XMLSchema.xsd)

[^issue-284]: [Explore the connection to the Red Hat XML extension for schema validation (#284)](https://github.com/neumaennl/vscode-visual-xml-schema-editor/issues/284)

[^issue-289]: [xmlbind-ts: Design how a round trip keeps the source of a document (#289)](https://github.com/neumaennl/xmlbind-ts/issues/289)
