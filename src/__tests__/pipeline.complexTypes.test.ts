/**
 * Integration tests: complexType add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for complexType commands.
 * Success-path assertions are made against the unmarshalled schema object.
 */

import {
  SCHEMA_WITH_COMPLEXTYPE,
  runCommandExpectSuccess,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./pipelineTestHelpers.js";
import { emptySchemaXml } from "../../shared/__tests__/schemaTestHelpers.js";
import { readTestXml } from "./resourceTestHelpers.js";

describe("Integration: ComplexType pipeline", () => {
  // ─── addComplexType ────────────────────────────────────────────────────────

  describe("addComplexType", () => {
    test("should add a top-level named complexType with a sequence content model", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addComplexType",
        payload: {
          parentId: "/schema",
          typeName: "OrderType",
          contentModel: "sequence",
        },
      });
      const types = result.complexType ?? [];
      const orderType = types.find((t) => t.name === "OrderType");

      expect(orderType).toBeDefined();
      expect(orderType!.sequence).toBeDefined();
      expect(orderType!.choice).toBeUndefined();
      expect(orderType!.all).toBeUndefined();
    });

    test("should add a complexType with a choice content model", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addComplexType",
        payload: {
          parentId: "/schema",
          typeName: "ChoiceType",
          contentModel: "choice",
        },
      });
      const choiceType = (result.complexType ?? []).find((t) => t.name === "ChoiceType");

      expect(choiceType).toBeDefined();
      expect(choiceType!.choice).toBeDefined();
      expect(choiceType!.sequence).toBeUndefined();
    });

    test("should add a complexType with an all content model", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addComplexType",
        payload: {
          parentId: "/schema",
          typeName: "AllType",
          contentModel: "all",
        },
      });
      const allType = (result.complexType ?? []).find((t) => t.name === "AllType");

      expect(allType).toBeDefined();
      expect(allType!.all).toBeDefined();
      expect(allType!.sequence).toBeUndefined();
    });

    test("should add a complexType marked as abstract", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addComplexType",
        payload: {
          parentId: "/schema",
          typeName: "BaseType",
          contentModel: "sequence",
          abstract: true,
        },
      });
      const baseType = (result.complexType ?? []).find((t) => t.name === "BaseType");

      expect(baseType).toBeDefined();
      expect(String(baseType!.abstract)).toBe("true");
    });

    test("should return validation error when type name is invalid", () => {
      runCommandExpectValidationFailure(emptySchemaXml(), {
        type: "addComplexType",
        payload: { parentId: "/schema", typeName: "123Bad", contentModel: "sequence" },
      }, "Type name must be a valid XML name");
    });

    test("should return validation error for duplicate complex type name", () => {
      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, {
        type: "addComplexType",
        payload: { parentId: "/schema", typeName: "PersonType", contentModel: "sequence" },
      }, "Complex type 'PersonType' already exists in schema");
    });
  });

  // ─── removeComplexType ─────────────────────────────────────────────────────

  describe("removeComplexType", () => {
    test("should remove an existing top-level complexType", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, {
        type: "removeComplexType",
        payload: { typeId: "/complexType:PersonType" },
      });
      const types = result.complexType ?? [];

      expect(types.some((t) => t.name === "PersonType")).toBe(false);
    });

    test("should return validation error when type ID does not exist", () => {
      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, {
        type: "removeComplexType",
        payload: { typeId: "/complexType:NoSuchType" },
      }, "Complex type 'NoSuchType' not found in schema");
    });
  });

  // ─── modifyComplexType ─────────────────────────────────────────────────────

  describe("modifyComplexType", () => {
    test("should rename an existing complexType", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", typeName: "IndividualType" },
      });
      const types = result.complexType ?? [];

      expect(types.some((t) => t.name === "IndividualType")).toBe(true);
      expect(types.some((t) => t.name === "PersonType")).toBe(false);
    });

    test("should mark a complexType as abstract", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", abstract: true },
      });
      const personType = (result.complexType ?? []).find((t) => t.name === "PersonType");

      expect(personType).toBeDefined();
      expect(String(personType!.abstract)).toBe("true");
    });

    test("should enable mixed content on a complexType", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", mixed: true },
      });
      const personType = (result.complexType ?? []).find((t) => t.name === "PersonType");

      expect(personType).toBeDefined();
      expect(String(personType!.mixed)).toBe("true");
    });

    test("should return validation error when type ID does not exist", () => {
      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:Ghost", typeName: "Other" },
      }, "Complex type 'Ghost' not found in schema");
    });

    test("should wrap the group reference of a type without a compositor when it gets a base type", () => {
      const result = runCommandExpectSuccessSchema(readTestXml("person-type-with-group-ref.xsd"), {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", baseType: "xs:anyType" },
      });
      const personType = (result.complexType ?? []).find((t) => t.name === "PersonType");

      expect(personType?.group).toBeUndefined();
      expect(personType?.sequence).toBeUndefined();
      expect(personType?.complexContent?.extension?.base).toBe("xs:anyType");
      expect(personType?.complexContent?.extension?.group?.ref).toBe("PersonGroup");
    });

    test("should unwrap the group reference of a type without a compositor when its base type is removed", () => {
      const withBase = runCommandExpectSuccess(readTestXml("person-type-with-group-ref.xsd"), {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", baseType: "xs:anyType" },
      });
      const result = runCommandExpectSuccessSchema(withBase, {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", baseType: "" },
      });
      const personType = (result.complexType ?? []).find((t) => t.name === "PersonType");

      expect(personType?.complexContent).toBeUndefined();
      expect(personType?.group?.ref).toBe("PersonGroup");
    });
  });
});
