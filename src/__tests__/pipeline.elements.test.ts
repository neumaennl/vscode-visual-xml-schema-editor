/**
 * Integration tests: element add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline:
 *   CommandProcessor → CommandValidator → CommandExecutor → XML round-trip
 *
 * Verifies both success and failure (validation error) paths.
 * Success-path assertions are made against the unmarshalled schema object
 * so that the tests are independent of serialization formatting.
 */

import type {
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import {
  MINIMAL_SCHEMA,
  SCHEMA_WITH_ELEMENTS,
  runCommandExpectSuccessSchema,
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

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const elements = toArray(result.element);

      expect(elements).toHaveLength(1);
      expect(elements[0].name).toBe("order");
      expect(elements[0].type_).toBe("xs:string");
    });

    it("adds a second top-level element without disturbing the first", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "schema", elementName: "product", elementType: "xs:integer" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ELEMENTS, cmd);
      const elements = toArray(result.element);

      expect(elements).toHaveLength(3);
      expect(elements.some((e) => e.name === "person")).toBe(true);
      expect(elements.some((e) => e.name === "product")).toBe(true);
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

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const elements = toArray(result.element);
      const invoice = elements.find((e) => e.name === "invoice");

      expect(invoice).toBeDefined();
      const docs = toArray(invoice!.annotation?.documentation);
      expect(docs[0].value).toBe("An invoice record");
    });

    it("returns validation error when element name is invalid", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "schema", elementName: "123invalid", elementType: "xs:string" },
      };

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "Element name must be a valid XML name");
    });

    it("returns validation error for duplicate element name", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "schema", elementName: "person", elementType: "xs:string" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "Cannot add element: duplicate element name 'person' in schema");
    });
  });

  // ─── removeElement ─────────────────────────────────────────────────────────

  describe("removeElement", () => {
    it("removes an existing top-level element", () => {
      const cmd: RemoveElementCommand = {
        type: "removeElement",
        payload: { elementId: "/element:person" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ELEMENTS, cmd);
      const elements = toArray(result.element);

      expect(elements.some((e) => e.name === "person")).toBe(false);
      expect(elements.some((e) => e.name === "company")).toBe(true);
    });

    it("returns validation error when element ID does not exist", () => {
      const cmd: RemoveElementCommand = {
        type: "removeElement",
        payload: { elementId: "/element:nonexistent" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "Element not found with name: nonexistent");
    });
  });

  // ─── modifyElement ─────────────────────────────────────────────────────────

  describe("modifyElement", () => {
    it("renames an existing top-level element", () => {
      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/element:person", elementName: "individual" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ELEMENTS, cmd);
      const elements = toArray(result.element);

      expect(elements.some((e) => e.name === "individual")).toBe(true);
      expect(elements.some((e) => e.name === "person")).toBe(false);
    });

    it("changes the type of an existing element", () => {
      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/element:person", elementType: "xs:integer" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ELEMENTS, cmd);
      const elements = toArray(result.element);
      const person = elements.find((e) => e.name === "person");

      expect(person).toBeDefined();
      expect(person!.type_).toBe("xs:integer");
    });

    it("returns validation error when element ID does not exist", () => {
      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/element:missing", elementName: "other" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "Element not found: missing");
    });

    it("returns validation error when new name is invalid", () => {
      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/element:person", elementName: "bad name" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "Element name must be a valid XML name");
    });
  });
});
