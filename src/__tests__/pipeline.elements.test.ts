/**
 * Integration tests: element add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline:
 *   CommandProcessor → CommandValidator → CommandExecutor → XML round-trip
 *
 * Verifies both success and failure (validation error) paths.
 */

import type {
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
} from "../../shared/types";
import {
  MINIMAL_SCHEMA,
  SCHEMA_WITH_ELEMENTS,
  runCommandExpectSuccess,
  runCommandExpectValidationFailure,
} from "./testHelpers";

describe("Integration: Element pipeline", () => {
  // ─── addElement ────────────────────────────────────────────────────────────

  describe("addElement", () => {
    it("adds a top-level element to an empty schema", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "schema", elementName: "order", elementType: "xs:string" },
      };

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain('name="order"');
      expect(xml).toContain('type="xs:string"');
    });

    it("adds a second top-level element without disturbing the first", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "schema", elementName: "product", elementType: "xs:integer" },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_ELEMENTS, cmd);

      expect(xml).toContain('name="person"');
      expect(xml).toContain('name="product"');
    });

    it("adds a top-level element with documentation", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "schema",
          elementName: "invoice",
          elementType: "xs:string",
          documentation: "An invoice record",
        },
      };

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain("An invoice record");
    });

    it("returns validation error when element name is invalid", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "schema", elementName: "123invalid", elementType: "xs:string" },
      };

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "valid XML name");
    });

    it("returns validation error for duplicate element name", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "schema", elementName: "person", elementType: "xs:string" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "person");
    });
  });

  // ─── removeElement ─────────────────────────────────────────────────────────

  describe("removeElement", () => {
    it("removes an existing top-level element", () => {
      const cmd: RemoveElementCommand = {
        type: "removeElement",
        payload: { elementId: "/element:person" },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_ELEMENTS, cmd);

      expect(xml).not.toContain('name="person"');
      expect(xml).toContain('name="company"');
    });

    it("returns validation error when element ID does not exist", () => {
      const cmd: RemoveElementCommand = {
        type: "removeElement",
        payload: { elementId: "/element:nonexistent" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "nonexistent");
    });
  });

  // ─── modifyElement ─────────────────────────────────────────────────────────

  describe("modifyElement", () => {
    it("renames an existing top-level element", () => {
      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/element:person", elementName: "individual" },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_ELEMENTS, cmd);

      expect(xml).toContain('name="individual"');
      expect(xml).not.toContain('name="person"');
    });

    it("changes the type of an existing element", () => {
      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/element:person", elementType: "xs:integer" },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_ELEMENTS, cmd);

      expect(xml).toContain('type="xs:integer"');
    });

    it("returns validation error when element ID does not exist", () => {
      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/element:missing", elementName: "other" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "missing");
    });

    it("returns validation error when new name is invalid", () => {
      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/element:person", elementName: "bad name" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "valid XML name");
    });
  });
});
