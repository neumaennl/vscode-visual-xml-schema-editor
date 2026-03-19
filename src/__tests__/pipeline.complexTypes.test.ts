/**
 * Integration tests: complexType add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for complexType commands.
 * Success-path assertions are made against the unmarshalled schema object.
 */

import type {
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import {
  MINIMAL_SCHEMA,
  SCHEMA_WITH_COMPLEXTYPE,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./testHelpers";

describe("Integration: ComplexType pipeline", () => {
  // ─── addComplexType ────────────────────────────────────────────────────────

  describe("addComplexType", () => {
    it("adds a top-level named complexType with a sequence content model", () => {
      const cmd: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          parentId: "schema",
          typeName: "OrderType",
          contentModel: "sequence",
        },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const types = toArray(result.complexType);
      const orderType = types.find((t) => t.name === "OrderType");

      expect(orderType).toBeDefined();
      expect(orderType!.sequence).toBeDefined();
      expect(orderType!.choice).toBeUndefined();
      expect(orderType!.all).toBeUndefined();
    });

    it("adds a complexType with a choice content model", () => {
      const cmd: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          parentId: "schema",
          typeName: "ChoiceType",
          contentModel: "choice",
        },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const choiceType = toArray(result.complexType).find((t) => t.name === "ChoiceType");

      expect(choiceType).toBeDefined();
      expect(choiceType!.choice).toBeDefined();
      expect(choiceType!.sequence).toBeUndefined();
    });

    it("adds a complexType with an all content model", () => {
      const cmd: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          parentId: "schema",
          typeName: "AllType",
          contentModel: "all",
        },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const allType = toArray(result.complexType).find((t) => t.name === "AllType");

      expect(allType).toBeDefined();
      expect(allType!.all).toBeDefined();
      expect(allType!.sequence).toBeUndefined();
    });

    it("adds a complexType marked as abstract", () => {
      const cmd: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          parentId: "schema",
          typeName: "BaseType",
          contentModel: "sequence",
          abstract: true,
        },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const baseType = toArray(result.complexType).find((t) => t.name === "BaseType");

      expect(baseType).toBeDefined();
      expect(String(baseType!.abstract)).toBe("true");
    });

    it("returns validation error when type name is invalid", () => {
      const cmd: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { parentId: "schema", typeName: "123Bad", contentModel: "sequence" },
      };

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "valid XML name");
    });

    it("returns validation error for duplicate complex type name", () => {
      const cmd: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: { parentId: "schema", typeName: "PersonType", contentModel: "sequence" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, cmd, "PersonType");
    });
  });

  // ─── removeComplexType ─────────────────────────────────────────────────────

  describe("removeComplexType", () => {
    it("removes an existing top-level complexType", () => {
      const cmd: RemoveComplexTypeCommand = {
        type: "removeComplexType",
        payload: { typeId: "/complexType:PersonType" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, cmd);
      const types = toArray(result.complexType);

      expect(types.some((t) => t.name === "PersonType")).toBe(false);
    });

    it("returns validation error when type ID does not exist", () => {
      const cmd: RemoveComplexTypeCommand = {
        type: "removeComplexType",
        payload: { typeId: "/complexType:NoSuchType" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, cmd, "NoSuchType");
    });
  });

  // ─── modifyComplexType ─────────────────────────────────────────────────────

  describe("modifyComplexType", () => {
    it("renames an existing complexType", () => {
      const cmd: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", typeName: "IndividualType" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, cmd);
      const types = toArray(result.complexType);

      expect(types.some((t) => t.name === "IndividualType")).toBe(true);
      expect(types.some((t) => t.name === "PersonType")).toBe(false);
    });

    it("marks a complexType as abstract", () => {
      const cmd: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", abstract: true },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, cmd);
      const personType = toArray(result.complexType).find((t) => t.name === "PersonType");

      expect(personType).toBeDefined();
      expect(String(personType!.abstract)).toBe("true");
    });

    it("enables mixed content on a complexType", () => {
      const cmd: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", mixed: true },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, cmd);
      const personType = toArray(result.complexType).find((t) => t.name === "PersonType");

      expect(personType).toBeDefined();
      expect(String(personType!.mixed)).toBe("true");
    });

    it("returns validation error when type ID does not exist", () => {
      const cmd: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:Ghost", typeName: "Other" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, cmd, "Ghost");
    });
  });
});
