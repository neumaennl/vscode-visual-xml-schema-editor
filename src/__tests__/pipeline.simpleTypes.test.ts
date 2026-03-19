/**
 * Integration tests: simpleType add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for simpleType commands.
 */

import type {
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
} from "../../shared/types";
import {
  MINIMAL_SCHEMA,
  SCHEMA_WITH_SIMPLETYPE,
  runCommandExpectSuccess,
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

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain('name="AgeType"');
      expect(xml).toContain('base="xs:integer"');
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

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain('name="ColorType"');
      expect(xml).toContain('"red"');
      expect(xml).toContain('"green"');
      expect(xml).toContain('"blue"');
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

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain('name="NameType"');
    });

    it("returns validation error when type name is invalid", () => {
      const cmd: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: { parentId: "schema", typeName: "bad type", baseType: "xs:string" },
      };

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "valid XML name");
    });

    it("returns validation error for duplicate type name", () => {
      const cmd: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: { parentId: "schema", typeName: "StatusType", baseType: "xs:string" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_SIMPLETYPE, cmd, "StatusType");
    });
  });

  // ─── removeSimpleType ──────────────────────────────────────────────────────

  describe("removeSimpleType", () => {
    it("removes an existing top-level simpleType", () => {
      const cmd: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: { typeId: "/simpleType:StatusType" },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_SIMPLETYPE, cmd);

      expect(xml).not.toContain('name="StatusType"');
    });

    it("returns validation error when type ID does not exist", () => {
      const cmd: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: { typeId: "/simpleType:NonExistent" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_SIMPLETYPE, cmd, "NonExistent");
    });
  });

  // ─── modifySimpleType ──────────────────────────────────────────────────────

  describe("modifySimpleType", () => {
    it("renames an existing simpleType", () => {
      const cmd: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:StatusType", typeName: "StateType" },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_SIMPLETYPE, cmd);

      expect(xml).toContain('name="StateType"');
      expect(xml).not.toContain('name="StatusType"');
    });

    it("changes the base type of a simpleType", () => {
      const cmd: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:StatusType", baseType: "xs:token" },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_SIMPLETYPE, cmd);

      expect(xml).toContain('base="xs:token"');
    });

    it("returns validation error when type ID does not exist", () => {
      const cmd: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Missing", typeName: "Other" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_SIMPLETYPE, cmd, "Missing");
    });
  });
});
