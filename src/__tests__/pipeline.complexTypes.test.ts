/**
 * Integration tests: complexType add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for complexType commands.
 */

import type {
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
} from "../../shared/types";
import {
  MINIMAL_SCHEMA,
  SCHEMA_WITH_COMPLEXTYPE,
  runCommandExpectSuccess,
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

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain('name="OrderType"');
      expect(xml).toContain("<sequence");
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

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain('name="ChoiceType"');
      expect(xml).toContain("<choice");
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

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain('name="AllType"');
      expect(xml).toContain("<all");
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

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain('abstract="true"');
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

      const xml = runCommandExpectSuccess(SCHEMA_WITH_COMPLEXTYPE, cmd);

      expect(xml).not.toContain('name="PersonType"');
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

      const xml = runCommandExpectSuccess(SCHEMA_WITH_COMPLEXTYPE, cmd);

      expect(xml).toContain('name="IndividualType"');
      expect(xml).not.toContain('name="PersonType"');
    });

    it("marks a complexType as abstract", () => {
      const cmd: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", abstract: true },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_COMPLEXTYPE, cmd);

      expect(xml).toContain('abstract="true"');
    });

    it("enables mixed content on a complexType", () => {
      const cmd: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", mixed: true },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_COMPLEXTYPE, cmd);

      expect(xml).toContain('mixed="true"');
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
