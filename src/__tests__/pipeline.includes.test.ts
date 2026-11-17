/**
 * Integration tests: include add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for `xs:include` commands.
 * Success-path assertions are made against the unmarshalled schema object.
 */

import type { SchemaCommand } from "../../shared/types.js";
import {
  SCHEMA_WITH_INCLUDE,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./pipelineTestHelpers.js";
import { emptySchemaXml, schemaXmlWith } from "../../shared/__tests__/schemaTestHelpers.js";

/** Schema that already has two includes so we can test position-based IDs. */
const SCHEMA_TWO_INCLUDES = schemaXmlWith(`<xs:include schemaLocation="base.xsd"/>
<xs:include schemaLocation="common.xsd"/>`);

/** The command that removes the first include. */
const REMOVE_FIRST_INCLUDE: SchemaCommand = { type: "removeInclude", payload: { includeId: "/include[0]" } };

describe("Integration: Include pipeline", () => {
  // ─── addInclude ────────────────────────────────────────────────────────────

  describe("addInclude", () => {
    test("should add an include with a schemaLocation", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addInclude",
        payload: { schemaLocation: "types.xsd" },
      });
      const includes = result.include ?? [];

      expect(includes.some((i) => i.schemaLocation === "types.xsd")).toBe(true);
    });

    test("should return validation error for an empty schemaLocation", () => {
      runCommandExpectValidationFailure(
        emptySchemaXml(),
        {
          type: "addInclude",
          payload: { schemaLocation: "" },
        },
        "Schema location cannot be empty"
      );
    });

    test("should return validation error for a schemaLocation with whitespace", () => {
      runCommandExpectValidationFailure(
        emptySchemaXml(),
        {
          type: "addInclude",
          payload: { schemaLocation: "my schema.xsd" },
        },
        "Schema location must be a valid path or URI without whitespace"
      );
    });

    test("should return validation error for a duplicate schemaLocation", () => {
      runCommandExpectValidationFailure(
        SCHEMA_WITH_INCLUDE,
        {
          type: "addInclude",
          payload: { schemaLocation: "base.xsd" },
        },
        "An include for schema location 'base.xsd' already exists"
      );
    });
  });

  // ─── removeInclude ─────────────────────────────────────────────────────────

  describe("removeInclude", () => {
    test("should remove an include by position ID", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_INCLUDE, REMOVE_FIRST_INCLUDE);
      const includes = result.include ?? [];

      expect(includes.some((i) => i.schemaLocation === "base.xsd")).toBe(false);
    });

    test("should remove one include and preserves the other", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_TWO_INCLUDES, REMOVE_FIRST_INCLUDE);
      const includes = result.include ?? [];

      expect(includes.some((i) => i.schemaLocation === "base.xsd")).toBe(false);
      expect(includes.some((i) => i.schemaLocation === "common.xsd")).toBe(true);
    });

    test("should return validation error when include ID is out of range", () => {
      runCommandExpectValidationFailure(
        SCHEMA_WITH_INCLUDE,
        {
          type: "removeInclude",
          payload: { includeId: "/include[9]" },
        },
        "Include not found: /include[9]"
      );
    });
  });

  // ─── modifyInclude ─────────────────────────────────────────────────────────

  describe("modifyInclude", () => {
    test("should change the schemaLocation of an existing include", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_INCLUDE, {
        type: "modifyInclude",
        payload: { includeId: "/include[0]", schemaLocation: "updated-base.xsd" },
      });
      const includes = result.include ?? [];

      expect(includes.some((i) => i.schemaLocation === "updated-base.xsd")).toBe(true);
      expect(includes.some((i) => i.schemaLocation === "base.xsd")).toBe(false);
    });

    test("should return validation error when include ID is out of range", () => {
      runCommandExpectValidationFailure(
        SCHEMA_WITH_INCLUDE,
        {
          type: "modifyInclude",
          payload: { includeId: "/include[99]", schemaLocation: "x.xsd" },
        },
        "Include not found: /include[99]"
      );
    });
  });
});
