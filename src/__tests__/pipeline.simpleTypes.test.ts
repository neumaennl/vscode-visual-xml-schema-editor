/**
 * Integration tests: simpleType add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for simpleType commands.
 * Success-path assertions are made against the unmarshalled schema object.
 */

import type {
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { describe, it, expect } from "vitest";
import {
  MINIMAL_SCHEMA,
  SCHEMA_WITH_SIMPLETYPE,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./testHelpers";

describe("Integration: SimpleType pipeline", () => {
  // ─── addSimpleType ─────────────────────────────────────────────────────────

  describe("addSimpleType", () => {
    it("adds a top-level named simpleType with a base type", () => {
      const cmd: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          parentId: "schema",
          typeName: "AgeType",
          baseType: "xs:integer",
        },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const types = toArray(result.simpleType);
      const ageType = types.find((t) => t.name === "AgeType");

      expect(ageType).toBeDefined();
      expect(ageType!.restriction?.base).toBe("xs:integer");
    });

    it("adds a simpleType with enumeration restrictions", () => {
      const cmd: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          parentId: "schema",
          typeName: "ColorType",
          baseType: "xs:string",
          restrictions: { enumeration: ["red", "green", "blue"] },
        },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const types = toArray(result.simpleType);
      const colorType = types.find((t) => t.name === "ColorType");

      expect(colorType).toBeDefined();
      const enumerations = toArray(colorType!.restriction?.enumeration);
      const values = enumerations.map((e) => e.value);
      expect(values).toContain("red");
      expect(values).toContain("green");
      expect(values).toContain("blue");
    });

    it("adds a simpleType with minLength / maxLength facets", () => {
      const cmd: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          parentId: "schema",
          typeName: "NameType",
          baseType: "xs:string",
          restrictions: { minLength: 1, maxLength: 50 },
        },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const types = toArray(result.simpleType);
      const nameType = types.find((t) => t.name === "NameType");

      expect(nameType).toBeDefined();
      expect(nameType!.restriction).toBeDefined();
    });

    it("returns validation error when type name is invalid", () => {
      const cmd: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: { parentId: "schema", typeName: "bad type", baseType: "xs:string" },
      };

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "Type name must be a valid XML name");
    });

    it("returns validation error for duplicate type name", () => {
      const cmd: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: { parentId: "schema", typeName: "StatusType", baseType: "xs:string" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_SIMPLETYPE, cmd, "Simple type 'StatusType' already exists in schema");
    });
  });

  // ─── removeSimpleType ──────────────────────────────────────────────────────

  describe("removeSimpleType", () => {
    it("removes an existing top-level simpleType", () => {
      const cmd: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: { typeId: "/simpleType:StatusType" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_SIMPLETYPE, cmd);
      const types = toArray(result.simpleType);

      expect(types.some((t) => t.name === "StatusType")).toBe(false);
    });

    it("returns validation error when type ID does not exist", () => {
      const cmd: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: { typeId: "/simpleType:NonExistent" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_SIMPLETYPE, cmd, "SimpleType not found: NonExistent");
    });
  });

  // ─── modifySimpleType ──────────────────────────────────────────────────────

  describe("modifySimpleType", () => {
    it("renames an existing simpleType", () => {
      const cmd: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:StatusType", typeName: "StateType" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_SIMPLETYPE, cmd);
      const types = toArray(result.simpleType);

      expect(types.some((t) => t.name === "StateType")).toBe(true);
      expect(types.some((t) => t.name === "StatusType")).toBe(false);
    });

    it("changes the base type of a simpleType", () => {
      const cmd: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:StatusType", baseType: "xs:token" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_SIMPLETYPE, cmd);
      const statusType = toArray(result.simpleType).find((t) => t.name === "StatusType");

      expect(statusType).toBeDefined();
      expect(statusType!.restriction!.base).toBe("xs:token");
    });

    it("returns validation error when type ID does not exist", () => {
      const cmd: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Missing", typeName: "Other" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_SIMPLETYPE, cmd, "Simple type 'Missing' not found in schema");
    });
  });
});
