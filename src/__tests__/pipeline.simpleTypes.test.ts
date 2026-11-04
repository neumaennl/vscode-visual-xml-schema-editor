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
} from "../../shared/types.js";
import {
  SCHEMA_WITH_SIMPLETYPE,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./pipelineTestHelpers.js";
import { emptySchemaXml, schemaXmlWith } from "./schemaTestHelpers.js";

/** A list simpleType `Codes` of tokens. */
const LIST_TYPE = `<xs:simpleType name="Codes"><xs:list itemType="xs:token"/></xs:simpleType>`;

/** A union simpleType `Size` of integers and tokens. */
const UNION_TYPE = `<xs:simpleType name="Size"><xs:union memberTypes="xs:integer xs:token"/></xs:simpleType>`;

describe("Integration: SimpleType pipeline", () => {
  // ─── addSimpleType ─────────────────────────────────────────────────────────

  describe("addSimpleType", () => {
    test("adds a top-level named simpleType with a base type", () => {
      const cmd: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          parentId: "/schema",
          typeName: "AgeType",
          baseType: "xs:integer",
        },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const types = result.simpleType ?? [];
      const ageType = types.find((t) => t.name === "AgeType");

      expect(ageType).toBeDefined();
      expect(ageType!.restriction?.base).toBe("xs:integer");
    });

    test("adds a simpleType with enumeration restrictions", () => {
      const cmd: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          parentId: "/schema",
          typeName: "ColorType",
          baseType: "xs:string",
          restrictions: { enumeration: ["red", "green", "blue"] },
        },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const types = result.simpleType ?? [];
      const colorType = types.find((t) => t.name === "ColorType");

      expect(colorType).toBeDefined();
      const enumerations = colorType!.restriction?.enumeration ?? [];
      const values = enumerations.map((e) => e.value);
      expect(values).toContain("red");
      expect(values).toContain("green");
      expect(values).toContain("blue");
    });

    test("adds a simpleType with minLength / maxLength facets", () => {
      const cmd: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          parentId: "/schema",
          typeName: "NameType",
          baseType: "xs:string",
          restrictions: { minLength: 1, maxLength: 50 },
        },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const types = result.simpleType ?? [];
      const nameType = types.find((t) => t.name === "NameType");

      expect(nameType).toBeDefined();
      expect(nameType!.restriction).toBeDefined();
    });

    test("adds a simpleType list with an item type", () => {
      const cmd: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          parentId: "/schema",
          typeName: "TokenListType",
          listItemType: "xs:token",
        },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const tokenListType = (result.simpleType ?? []).find((t) => t.name === "TokenListType");

      expect(tokenListType).toBeDefined();
      expect(tokenListType!.list?.itemType).toBe("xs:token");
    });

    test("adds a simpleType union with member types", () => {
      const cmd: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: {
          parentId: "/schema",
          typeName: "TextOrNumberType",
          unionMemberTypes: ["xs:string", "xs:integer"],
        },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const unionType = (result.simpleType ?? []).find((t) => t.name === "TextOrNumberType");

      expect(unionType).toBeDefined();
      expect(unionType!.union?.memberTypes).toBe("xs:string xs:integer");
    });

    test("returns validation error when type name is invalid", () => {
      const cmd: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: { parentId: "/schema", typeName: "bad type", baseType: "xs:string" },
      };

      runCommandExpectValidationFailure(emptySchemaXml(), cmd, "Type name must be a valid XML name");
    });

    test("returns validation error for duplicate type name", () => {
      const cmd: AddSimpleTypeCommand = {
        type: "addSimpleType",
        payload: { parentId: "/schema", typeName: "StatusType", baseType: "xs:string" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_SIMPLETYPE, cmd, "Simple type 'StatusType' already exists in schema");
    });
  });

  // ─── removeSimpleType ──────────────────────────────────────────────────────

  describe("removeSimpleType", () => {
    test("removes an existing top-level simpleType", () => {
      const cmd: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: { typeId: "/simpleType:StatusType" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_SIMPLETYPE, cmd);
      const types = result.simpleType ?? [];

      expect(types.some((t) => t.name === "StatusType")).toBe(false);
    });

    test("returns validation error when type ID does not exist", () => {
      const cmd: RemoveSimpleTypeCommand = {
        type: "removeSimpleType",
        payload: { typeId: "/simpleType:NonExistent" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_SIMPLETYPE, cmd, "SimpleType not found: NonExistent");
    });
  });

  // ─── modifySimpleType ──────────────────────────────────────────────────────

  describe("modifySimpleType", () => {
    test("renames an existing simpleType", () => {
      const cmd: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:StatusType", typeName: "StateType" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_SIMPLETYPE, cmd);
      const types = result.simpleType ?? [];

      expect(types.some((t) => t.name === "StateType")).toBe(true);
      expect(types.some((t) => t.name === "StatusType")).toBe(false);
    });

    test("changes the base type of a simpleType", () => {
      const cmd: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:StatusType", baseType: "xs:token" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_SIMPLETYPE, cmd);
      const statusType = (result.simpleType ?? []).find((t) => t.name === "StatusType");

      expect(statusType).toBeDefined();
      expect(statusType!.restriction!.base).toBe("xs:token");
    });

    test("switches an existing simpleType from restriction to list", () => {
      const cmd: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:StatusType",
          listItemType: "xs:token",
        },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_SIMPLETYPE, cmd);
      const statusType = (result.simpleType ?? []).find((t) => t.name === "StatusType");

      expect(statusType).toBeDefined();
      expect(statusType!.list?.itemType).toBe("xs:token");
      expect(statusType!.restriction).toBeUndefined();
    });

    test("renames a list simpleType and keeps its item type", () => {
      const cmd: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Codes", typeName: "CodeList" },
      };

      const result = runCommandExpectSuccessSchema(schemaXmlWith(LIST_TYPE), cmd);
      const codeList = (result.simpleType ?? []).find((t) => t.name === "CodeList");

      expect(codeList?.list?.itemType).toBe("xs:token");
    });

    test("changes only the documentation of a union simpleType", () => {
      const cmd: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Size", documentation: "A number or a word" },
      };

      const result = runCommandExpectSuccessSchema(schemaXmlWith(UNION_TYPE), cmd);
      const size = (result.simpleType ?? []).find((t) => t.name === "Size");

      expect(size?.union?.memberTypes).toBe("xs:integer xs:token");
      expect(size?.annotation?.documentation?.[0]?.value).toBe("A number or a word");
    });

    test("returns validation error when type ID does not exist", () => {
      const cmd: ModifySimpleTypeCommand = {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Missing", typeName: "Other" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_SIMPLETYPE, cmd, "Simple type 'Missing' not found in schema");
    });
  });
});
