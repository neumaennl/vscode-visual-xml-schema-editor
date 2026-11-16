/**
 * Unit tests for annotation validators (Annotation and Documentation).
 */

import type {
  schema,
  AddAnnotationCommand,
  AddDocumentationCommand,
} from "../../shared/types.js";
import {
  validateAddAnnotation,
  validateRemoveAnnotation,
  validateModifyAnnotation,
  validateAddDocumentation,
  validateRemoveDocumentation,
  validateModifyDocumentation,
} from "./annotationValidators.js";
import type { ValidationResult } from "./validationUtils.js";
import { expectInvalid } from "../__tests__/validationTestHelpers.js";
import { emptySchema, schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";
import { readTestSchema } from "../__tests__/resourceTestHelpers.js";

// ─── Shared XML fixtures ────────────────────────────────────────────────────

/** The file with an element `person` with an annotation that has one documentation. */
const DOCUMENTED_PERSON_XSD = "person-element-with-documentation.xsd";

/** The file with a schema with two annotations. */
const TWO_ANNOTATIONS_XSD = "schema-with-two-annotations.xsd";

/** A plain element (no annotation). */
const PERSON_ELEMENT = `<xs:element name="person" type="xs:string"/>`;

/** A single annotation on the schema element. */
const SCHEMA_ANNOTATION = `<xs:annotation>
  <xs:documentation>Schema description.</xs:documentation>
</xs:annotation>`;

/** The expected result of a validation: success, or a failure whose error contains the text. */
type Expected = { valid: true } | { error: string };

/**
 * Asserts that a validation result is the expected one.
 *
 * @param result - The result
 * @param expected - Success, or the text that the error contains
 */
function expectResult(result: ValidationResult, expected: Expected): void {
  if ("error" in expected) {
    expectInvalid(result);
    expect(result.error).toContain(expected.error);
  } else {
    expect(result).toEqual({ valid: true });
  }
}

/**
 * Loads the schema of a test case.
 *
 * @param source - A file in the test resources (ending in `.xsd`), schema content, or "" for an empty schema
 * @returns The schema
 */
function loadSchema(source: string): schema {
  if (source.endsWith(".xsd")) {
    return readTestSchema(source);
  }
  return source ? schemaWith(source) : emptySchema();
}

/**
 * Combines validators with cases, so that every validator is checked with every case.
 *
 * @param validators - Names and validators
 * @param cases - The cases
 * @returns The rows for `test.each`: name, the case, and the validator
 */
function eachValidator<C extends unknown[], V>(validators: Array<[string, V]>, cases: C[]): Array<[string, ...C, V]> {
  return validators.flatMap(([name, validate]) => cases.map((c): [string, ...C, V] => [name, ...c, validate]));
}

// eslint-disable-next-line jsdoc/require-param, jsdoc/require-returns -- the plugin applies the comment below to the callbacks in the array, which need none
/** The validators of `removeAnnotation` and `modifyAnnotation`, which check the annotation ID the same way. */
const ANNOTATION_ID_VALIDATORS: Array<[string, (annotationId: string, schemaObj: schema) => ValidationResult]> = [
  ["removeAnnotation", (annotationId, s): ValidationResult => validateRemoveAnnotation({ type: "removeAnnotation", payload: { annotationId } }, s)],
  [
    "modifyAnnotation",
    (annotationId, s): ValidationResult => validateModifyAnnotation({ type: "modifyAnnotation", payload: { annotationId, documentation: "Updated." } }, s),
  ],
];

/** Annotation IDs: the schema (see {@link loadSchema}), the ID and the expected result. */
const ANNOTATION_ID_CASES: Array<[string, string, string, Expected]> = [
  ["an empty ID", "", "", { error: "Annotation ID cannot be empty" }],
  ["a missing element", "", "/element:missing", { error: "not found" }],
  ["an element without annotation", PERSON_ELEMENT, "/element:person", { error: "No annotation" }],
  ["an element with an annotation", DOCUMENTED_PERSON_XSD, "/element:person", { valid: true }],
  ["a valid schema annotation index", TWO_ANNOTATIONS_XSD, "/schema/annotation[1]", { valid: true }],
  ["a schema annotation index out of bounds", SCHEMA_ANNOTATION, "/schema/annotation[5]", { error: "out of bounds" }],
  ["the legacy bare schema-root ID 'schema'", SCHEMA_ANNOTATION, "schema", { error: "Target node not found" }],
  ["the bare schema-root ID '/schema'", SCHEMA_ANNOTATION, "/schema", { error: "/schema/annotation[N]" }],
];

// eslint-disable-next-line jsdoc/require-param, jsdoc/require-returns -- the plugin applies the comment below to the callbacks in the array, which need none
/** The validators of `removeDocumentation` and `modifyDocumentation`, which check the documentation ID the same way. */
const DOCUMENTATION_ID_VALIDATORS: Array<[string, (documentationId: string, schemaObj: schema) => ValidationResult]> = [
  ["removeDocumentation", (documentationId, s): ValidationResult => validateRemoveDocumentation({ type: "removeDocumentation", payload: { documentationId } }, s)],
  [
    "modifyDocumentation",
    (documentationId, s): ValidationResult =>
      validateModifyDocumentation({ type: "modifyDocumentation", payload: { documentationId, content: "Updated." } }, s),
  ],
];

/** Documentation IDs: the schema (see {@link loadSchema}), the ID and the expected result. */
const DOCUMENTATION_ID_CASES: Array<[string, string, string, Expected]> = [
  ["an empty ID", "", "", { error: "Documentation ID cannot be empty" }],
  ["an ID of an invalid format", DOCUMENTED_PERSON_XSD, "not-a-valid-id", { error: "Invalid documentationId format" }],
  [
    "a component that does not exist",
    PERSON_ELEMENT,
    "/element:missing/documentation[0]",
    { error: "Target node not found or does not support annotations: /element:missing" },
  ],
  [
    "a component without an annotation",
    PERSON_ELEMENT,
    "/element:person/documentation[0]",
    { error: "No annotation found on node: /element:person" },
  ],
  ["an index out of bounds", DOCUMENTED_PERSON_XSD, "/element:person/documentation[5]", { error: "out of bounds" }],
  ["an existing entry", DOCUMENTED_PERSON_XSD, "/element:person/documentation[0]", { valid: true }],
  [
    "the second entry of an annotation",
    "person-element-with-two-documentations.xsd",
    "/element:person/documentation[1]",
    { valid: true },
  ],
  ["valid schema annotation and entry indices", SCHEMA_ANNOTATION, "/schema/annotation[0]/documentation[0]", { valid: true }],
  [
    "a schema annotation index out of bounds",
    SCHEMA_ANNOTATION,
    "/schema/annotation[9]/documentation[0]",
    { error: "out of bounds" },
  ],
  ["the shorthand for the first schema annotation", SCHEMA_ANNOTATION, "/schema/documentation[0]", { valid: true }],
  ["the shorthand without schema annotations", "", "/schema/documentation[0]", { error: "No annotation found on schema root" }],
];

// ─── Annotation Validators ──────────────────────────────────────────────────

describe("Annotation Validators", () => {
  describe("validateAddAnnotation", () => {
    test("should reject addAnnotation with missing targetId", () => {
      const schemaObj = emptySchema();
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "" },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Target ID cannot be empty");
    });

    test("should reject addAnnotation when target element does not exist", () => {
      const schemaObj = emptySchema();
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/element:missing" },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("not found");
    });

    test("should accept addAnnotation for an existing element", () => {
      const schemaObj = schemaWith(PERSON_ELEMENT);
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/element:person", documentation: "A person." },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject addAnnotation when element already has an annotation", () => {
      const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/element:person", documentation: "Duplicate." },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("already has an annotation");
    });
  });
});

// ─── Documentation Validators ───────────────────────────────────────────────

describe("Documentation Validators", () => {
  describe("validateAddDocumentation", () => {
    test("should reject addDocumentation with missing targetId", () => {
      const schemaObj = emptySchema();
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "", content: "test doc" },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Target ID cannot be empty");
    });

    test("should reject addDocumentation when target element does not exist", () => {
      const schemaObj = emptySchema();
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "/element:missing", content: "doc" },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("not found");
    });

    test("should accept addDocumentation for an existing element", () => {
      const schemaObj = schemaWith(PERSON_ELEMENT);
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "/element:person", content: "A person.", lang: "en" },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });
  });

  test("should accept modifyDocumentation with lang update only", () => {
    const result = validateModifyDocumentation(
      { type: "modifyDocumentation", payload: { documentationId: "/element:person/documentation[0]", lang: "en" } },
      readTestSchema(DOCUMENTED_PERSON_XSD)
    );

    expect(result.valid).toBe(true);
  });
});

// ─── IDs of the remove and modify commands ──────────────────────────────────

describe("IDs of the remove and modify commands", () => {
  test.each([
    ...eachValidator(ANNOTATION_ID_VALIDATORS, ANNOTATION_ID_CASES),
    ...eachValidator(DOCUMENTATION_ID_VALIDATORS, DOCUMENTATION_ID_CASES),
  ])("should check the ID in %s: %s", (_name, _case, source, id, expected, validate) => {
    expectResult(validate(id, loadSchema(source)), expected);
  });
});

// ─── Schema-root annotation validators ──────────────────────────────────────

describe("Schema-root Annotation Validators", () => {
  describe("validateAddAnnotation — schema root", () => {
    test("should accept targetId 'schema' even when schema already has annotations", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/schema" },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should accept targetId 'schema' on an empty schema", () => {
      const schemaObj = emptySchema();
      const command: AddAnnotationCommand = {
        type: "addAnnotation",
        payload: { targetId: "/schema" },
      };

      const result = validateAddAnnotation(command, schemaObj);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateAddDocumentation — schema root", () => {
    test("should accept targetId 'schema' on an empty schema (creates annotation)", () => {
      const schemaObj = emptySchema();
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "/schema", content: "Doc." },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should accept targetId '/schema/annotation[N]' when annotation exists", () => {
      const schemaObj = readTestSchema(TWO_ANNOTATIONS_XSD);
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "/schema/annotation[1]", content: "Doc." },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject when '/schema/annotation[N]' index is out of bounds", () => {
      const schemaObj = schemaWith(SCHEMA_ANNOTATION);
      const command: AddDocumentationCommand = {
        type: "addDocumentation",
        payload: { targetId: "/schema/annotation[9]", content: "Doc." },
      };

      const result = validateAddDocumentation(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("out of bounds");
    });
  });
});
