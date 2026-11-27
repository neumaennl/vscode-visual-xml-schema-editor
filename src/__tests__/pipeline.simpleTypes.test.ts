/**
 * Integration tests: simpleType add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for simpleType commands.
 * Success-path assertions are made against the unmarshalled schema object.
 */

import {
  SCHEMA_WITH_SIMPLETYPE,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./pipelineTestHelpers.js";
import { emptySchemaXml, schemaXmlWith } from "../../shared/__tests__/schemaTestHelpers.js";
import { parseSchemaId } from "../../shared/idStrategy.js";
import type { ModifySimpleTypePayload, topLevelSimpleType } from "../../shared/types.js";

/** A list simpleType `Codes` of tokens. */
const LIST_TYPE = `<xs:simpleType name="Codes"><xs:list itemType="xs:token"/></xs:simpleType>`;

/** A simpleType `ShortCode` that restricts an inline simpleType to at most 8 characters. */
const INLINE_BASE_TYPE = `<xs:simpleType name="ShortCode">
  <xs:restriction>
    <xs:simpleType><xs:restriction base="xs:token"/></xs:simpleType>
    <xs:maxLength value="8"/>
  </xs:restriction>
</xs:simpleType>`;

/**
 * Runs a `modifySimpleType` command that keeps the name of the type, and returns the changed type.
 *
 * @param xml - The XML of the schema
 * @param payload - The payload of the command
 * @returns The top-level simpleType with the name in `typeId`, if the schema still has it
 */
function modifySimpleType(xml: string, payload: ModifySimpleTypePayload): topLevelSimpleType | undefined {
  const result = runCommandExpectSuccessSchema(xml, { type: "modifySimpleType", payload });
  const { name } = parseSchemaId(payload.typeId);
  return (result.simpleType ?? []).find((t) => t.name === name);
}

describe("Integration: SimpleType pipeline", () => {
  // ─── addSimpleType ─────────────────────────────────────────────────────────

  describe("addSimpleType", () => {
    test("should add a top-level named simpleType with a base type", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addSimpleType",
        payload: {
          parentId: "/schema",
          typeName: "AgeType",
          baseType: "xs:integer",
        },
      });
      const types = result.simpleType ?? [];
      const ageType = types.find((t) => t.name === "AgeType");

      expect(ageType).toBeDefined();
      expect(ageType!.restriction?.base).toBe("xs:integer");
    });

    test("should add a simpleType with enumeration restrictions", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addSimpleType",
        payload: {
          parentId: "/schema",
          typeName: "ColorType",
          baseType: "xs:string",
          restrictions: { enumeration: ["red", "green", "blue"] },
        },
      });
      const types = result.simpleType ?? [];
      const colorType = types.find((t) => t.name === "ColorType");

      expect(colorType).toBeDefined();
      const enumerations = colorType!.restriction?.enumeration ?? [];
      const values = enumerations.map((e) => e.value);
      expect(values).toContain("red");
      expect(values).toContain("green");
      expect(values).toContain("blue");
    });

    test("should add a simpleType with minLength / maxLength facets", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addSimpleType",
        payload: {
          parentId: "/schema",
          typeName: "NameType",
          baseType: "xs:string",
          restrictions: { minLength: 1, maxLength: 50 },
        },
      });
      const types = result.simpleType ?? [];
      const nameType = types.find((t) => t.name === "NameType");

      expect(nameType).toBeDefined();
      expect(nameType!.restriction).toBeDefined();
    });

    test("should add a simpleType list with an item type", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addSimpleType",
        payload: {
          parentId: "/schema",
          typeName: "TokenListType",
          listItemType: "xs:token",
        },
      });
      const tokenListType = (result.simpleType ?? []).find((t) => t.name === "TokenListType");

      expect(tokenListType).toBeDefined();
      expect(tokenListType!.list?.itemType).toBe("xs:token");
    });

    test("should add a simpleType union with member types", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addSimpleType",
        payload: {
          parentId: "/schema",
          typeName: "TextOrNumberType",
          unionMemberTypes: ["xs:string", "xs:integer"],
        },
      });
      const unionType = (result.simpleType ?? []).find((t) => t.name === "TextOrNumberType");

      expect(unionType).toBeDefined();
      expect(unionType!.union?.memberTypes).toBe("xs:string xs:integer");
    });

    test("should return validation error when type name is invalid", () => {
      runCommandExpectValidationFailure(
        emptySchemaXml(),
        {
          type: "addSimpleType",
          payload: { parentId: "/schema", typeName: "bad type", baseType: "xs:string" },
        },
        "Type name must be a valid XML name"
      );
    });

    test("should return validation error for duplicate type name", () => {
      runCommandExpectValidationFailure(
        SCHEMA_WITH_SIMPLETYPE,
        {
          type: "addSimpleType",
          payload: { parentId: "/schema", typeName: "StatusType", baseType: "xs:string" },
        },
        "Simple type 'StatusType' already exists in schema"
      );
    });
  });

  // ─── removeSimpleType ──────────────────────────────────────────────────────

  describe("removeSimpleType", () => {
    test("should remove an existing top-level simpleType", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_SIMPLETYPE, {
        type: "removeSimpleType",
        payload: { typeId: "/simpleType:StatusType" },
      });
      const types = result.simpleType ?? [];

      expect(types.some((t) => t.name === "StatusType")).toBe(false);
    });

    test("should return validation error when type ID does not exist", () => {
      runCommandExpectValidationFailure(
        SCHEMA_WITH_SIMPLETYPE,
        {
          type: "removeSimpleType",
          payload: { typeId: "/simpleType:NonExistent" },
        },
        "Simple type 'NonExistent' not found in schema"
      );
    });
  });

  // ─── modifySimpleType ──────────────────────────────────────────────────────

  describe("modifySimpleType", () => {
    test("should rename an existing simpleType", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_SIMPLETYPE, {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:StatusType", typeName: "StateType" },
      });
      const types = result.simpleType ?? [];

      expect(types.some((t) => t.name === "StateType")).toBe(true);
      expect(types.some((t) => t.name === "StatusType")).toBe(false);
    });

    test("should change the base type of a simpleType", () => {
      const statusType = modifySimpleType(SCHEMA_WITH_SIMPLETYPE, {
        typeId: "/simpleType:StatusType",
        baseType: "xs:token",
      });

      expect(statusType?.restriction?.base).toBe("xs:token");
    });

    test("should change only the facets and keeps the base type", () => {
      const restriction = modifySimpleType(SCHEMA_WITH_SIMPLETYPE, {
        typeId: "/simpleType:StatusType",
        restrictions: { enumeration: ["on", "off"] },
      })?.restriction;

      expect(restriction?.base).toBe("xs:string");
      expect(restriction?.enumeration?.map((e) => e.value)).toEqual(["on", "off"]);
    });

    test("should change only the facets and keeps an inline base type", () => {
      const restriction = modifySimpleType(schemaXmlWith(INLINE_BASE_TYPE), {
        typeId: "/simpleType:ShortCode",
        restrictions: { maxLength: 4 },
      })?.restriction;

      expect(restriction?.simpleType?.restriction?.base).toBe("xs:token");
      expect(restriction?.maxLength?.[0]?.value).toBe(4);
    });

    test("should replace an inline base type with a named one", () => {
      const restriction = modifySimpleType(schemaXmlWith(INLINE_BASE_TYPE), {
        typeId: "/simpleType:ShortCode",
        baseType: "xs:string",
      })?.restriction;

      expect(restriction?.base).toBe("xs:string");
      expect(restriction?.simpleType).toBeUndefined();
      expect(restriction?.maxLength?.[0]?.value).toBe(8);
    });

    test("should switch an existing simpleType from restriction to list", () => {
      const statusType = modifySimpleType(SCHEMA_WITH_SIMPLETYPE, {
        typeId: "/simpleType:StatusType",
        listItemType: "xs:token",
      });

      expect(statusType).toMatchObject({ list: { itemType: "xs:token" } });
      expect(statusType?.restriction).toBeUndefined();
    });

    test("should rename a list simpleType and keeps its item type", () => {
      const result = runCommandExpectSuccessSchema(schemaXmlWith(LIST_TYPE), {
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Codes", typeName: "CodeList" },
      });
      const codeList = (result.simpleType ?? []).find((t) => t.name === "CodeList");

      expect(codeList?.list?.itemType).toBe("xs:token");
    });

    test("should return validation error when type ID does not exist", () => {
      runCommandExpectValidationFailure(
        SCHEMA_WITH_SIMPLETYPE,
        {
          type: "modifySimpleType",
          payload: { typeId: "/simpleType:Missing", typeName: "Other" },
        },
        "Simple type 'Missing' not found in schema"
      );
    });
  });
});
