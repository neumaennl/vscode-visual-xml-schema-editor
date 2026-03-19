/**
 * Integration tests: include add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for xs:include commands.
 * Success-path assertions are made against the unmarshalled schema object.
 */

import type {
  AddIncludeCommand,
  RemoveIncludeCommand,
  ModifyIncludeCommand,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import {
  MINIMAL_SCHEMA,
  SCHEMA_WITH_INCLUDE,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./testHelpers";

/** Schema that already has two includes so we can test position-based IDs. */
const SCHEMA_TWO_INCLUDES = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:include schemaLocation="base.xsd"/>
  <xs:include schemaLocation="common.xsd"/>
</xs:schema>`;

describe("Integration: Include pipeline", () => {
  // ─── addInclude ────────────────────────────────────────────────────────────

  describe("addInclude", () => {
    it("adds an include with a schemaLocation", () => {
      const cmd: AddIncludeCommand = {
        type: "addInclude",
        payload: { schemaLocation: "types.xsd" },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const includes = toArray(result.include);

      expect(includes.some((i) => i.schemaLocation === "types.xsd")).toBe(true);
    });

    it("returns validation error for an empty schemaLocation", () => {
      const cmd: AddIncludeCommand = {
        type: "addInclude",
        payload: { schemaLocation: "" },
      };

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "cannot be empty");
    });

    it("returns validation error for a schemaLocation with whitespace", () => {
      const cmd: AddIncludeCommand = {
        type: "addInclude",
        payload: { schemaLocation: "my schema.xsd" },
      };

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "whitespace");
    });

    it("returns validation error for a duplicate schemaLocation", () => {
      const cmd: AddIncludeCommand = {
        type: "addInclude",
        payload: { schemaLocation: "base.xsd" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_INCLUDE, cmd, "base.xsd");
    });
  });

  // ─── removeInclude ─────────────────────────────────────────────────────────

  describe("removeInclude", () => {
    it("removes an include by position ID", () => {
      const cmd: RemoveIncludeCommand = {
        type: "removeInclude",
        payload: { includeId: "/include[0]" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_INCLUDE, cmd);
      const includes = toArray(result.include);

      expect(includes.some((i) => i.schemaLocation === "base.xsd")).toBe(false);
    });

    it("removes one include and preserves the other", () => {
      const cmd: RemoveIncludeCommand = {
        type: "removeInclude",
        payload: { includeId: "/include[0]" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_TWO_INCLUDES, cmd);
      const includes = toArray(result.include);

      expect(includes.some((i) => i.schemaLocation === "base.xsd")).toBe(false);
      expect(includes.some((i) => i.schemaLocation === "common.xsd")).toBe(true);
    });

    it("returns validation error when include ID is out of range", () => {
      const cmd: RemoveIncludeCommand = {
        type: "removeInclude",
        payload: { includeId: "/include[9]" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_INCLUDE, cmd, "/include[9]");
    });
  });

  // ─── modifyInclude ─────────────────────────────────────────────────────────

  describe("modifyInclude", () => {
    it("changes the schemaLocation of an existing include", () => {
      const cmd: ModifyIncludeCommand = {
        type: "modifyInclude",
        payload: { includeId: "/include[0]", schemaLocation: "updated-base.xsd" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_INCLUDE, cmd);
      const includes = toArray(result.include);

      expect(includes.some((i) => i.schemaLocation === "updated-base.xsd")).toBe(true);
      expect(includes.some((i) => i.schemaLocation === "base.xsd")).toBe(false);
    });

    it("returns validation error when include ID is out of range", () => {
      const cmd: ModifyIncludeCommand = {
        type: "modifyInclude",
        payload: { includeId: "/include[99]", schemaLocation: "x.xsd" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_INCLUDE, cmd, "/include[99]");
    });
  });
});
