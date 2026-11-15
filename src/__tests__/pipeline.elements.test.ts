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

import {
  SCHEMA_WITH_ELEMENTS,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
  findTopLevelElement,
} from "./pipelineTestHelpers.js";
import { emptySchemaXml, schemaXmlWith } from "../../shared/__tests__/schemaTestHelpers.js";

/**
 * A top-level element `item` with a fixed value, a complex type with an `all` group, and a complex
 * type with a local element `code` that has a default value.
 */
const ELEMENT_AND_ALL_GROUP = schemaXmlWith(`<xs:element name="item" type="xs:string" fixed="none"/>
<xs:complexType name="ConfigType"><xs:all><xs:element name="timeout" type="xs:int"/></xs:all></xs:complexType>
<xs:complexType name="CodeType"><xs:sequence>
  <xs:element name="code" type="xs:string" default="A" nillable="true"/>
</xs:sequence></xs:complexType>`);

/** The ID of the local element `code` of `CodeType`. */
const CODE_ID = "/complexType:CodeType/group:sequence[0]/element:code[0]";

/** The ID of the `all` group of `ConfigType`. */
const ALL_GROUP_ID = "/complexType:ConfigType/group:all[0]";

describe("Integration: Element pipeline", () => {
  // ─── addElement ────────────────────────────────────────────────────────────

  describe("addElement", () => {
    test("should add a top-level element to an empty schema", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addElement",
        payload: { parentId: "/schema", elementName: "order", elementType: "xs:string" },
      });
      const elements = result.element ?? [];

      expect(elements).toHaveLength(1);
      expect(elements[0].name).toBe("order");
      expect(elements[0].type_).toBe("xs:string");
    });

    test("should add a second top-level element without disturbing the first", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ELEMENTS, {
        type: "addElement",
        payload: { parentId: "/schema", elementName: "product", elementType: "xs:integer" },
      });
      const elements = result.element ?? [];

      expect(elements).toHaveLength(3);
      expect(elements.some((e) => e.name === "person")).toBe(true);
      expect(elements.some((e) => e.name === "product")).toBe(true);
    });

    test("should add a top-level element with documentation", () => {
      const result = runCommandExpectSuccessSchema(emptySchemaXml(), {
        type: "addElement",
        payload: {
          parentId: "/schema",
          elementName: "invoice",
          elementType: "xs:string",
          documentation: "An invoice record",
        },
      });
      const invoice = findTopLevelElement(result, "invoice");
      const documentations = invoice.annotation?.documentation ?? [];
      expect(documentations[0].value).toBe("An invoice record");
    });

    test("should return validation error when element name is invalid", () => {
      runCommandExpectValidationFailure(emptySchemaXml(), {
        type: "addElement",
        payload: { parentId: "/schema", elementName: "123invalid", elementType: "xs:string" },
      }, "Element name must be a valid XML name");
    });

    test("should return validation error for duplicate element name", () => {
      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, {
        type: "addElement",
        payload: { parentId: "/schema", elementName: "person", elementType: "xs:string" },
      }, "Cannot add element: duplicate element name 'person' in schema");
    });
  });

  // ─── removeElement ─────────────────────────────────────────────────────────

  describe("removeElement", () => {
    test("should remove an existing top-level element", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ELEMENTS, {
        type: "removeElement",
        payload: { elementId: "/element:person" },
      });
      const elements = result.element ?? [];

      expect(elements.some((e) => e.name === "person")).toBe(false);
      expect(elements.some((e) => e.name === "company")).toBe(true);
    });

    test("should return validation error when element ID does not exist", () => {
      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, {
        type: "removeElement",
        payload: { elementId: "/element:nonexistent" },
      }, "Element not found with name: nonexistent");
    });
  });

  // ─── modifyElement ─────────────────────────────────────────────────────────

  describe("modifyElement", () => {
    test("should rename an existing top-level element", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ELEMENTS, {
        type: "modifyElement",
        payload: { elementId: "/element:person", elementName: "individual" },
      });
      const elements = result.element ?? [];

      expect(elements.some((e) => e.name === "individual")).toBe(true);
      expect(elements.some((e) => e.name === "person")).toBe(false);
    });

    test("should change the type of an existing element", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ELEMENTS, {
        type: "modifyElement",
        payload: { elementId: "/element:person", elementType: "xs:integer" },
      });
      const person = findTopLevelElement(result, "person");
      expect(person.type_).toBe("xs:integer");
    });

    test("should return validation error when element ID does not exist", () => {
      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, {
        type: "modifyElement",
        payload: { elementId: "/element:missing", elementName: "other" },
      }, "Element not found with name: missing");
    });

    test("should return validation error when new name is invalid", () => {
      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, {
        type: "modifyElement",
        payload: { elementId: "/element:person", elementName: "bad name" },
      }, "Element name must be a valid XML name");
    });
  });

  describe("element properties", () => {
    test.each([
      { change: { nillable: true }, expected: { nillable: true } },
      { change: { nillable: false }, expected: { nillable: undefined } },
      { change: { abstract: true }, expected: { abstract: true } },
      { change: { abstract: false }, expected: { abstract: undefined } },
      // An element has at most one of default and fixed, so setting one removes the other
      { change: { default_: "unknown" }, expected: { default_: "unknown", fixed: undefined } },
      { change: { default_: "" }, expected: { default_: undefined, fixed: "none" } },
      { change: { fixed: "other" }, expected: { fixed: "other" } },
      { change: { fixed: "" }, expected: { fixed: undefined } },
    ])("should set $change on a top-level element", ({ change, expected }) => {
      const result = runCommandExpectSuccessSchema(ELEMENT_AND_ALL_GROUP, { type: "modifyElement", payload: { elementId: "/element:item", ...change } });

      expect(result.element?.[0]).toMatchObject(expected);
    });

    test("should remove the default value when the fixed value is set", () => {
      const result = runCommandExpectSuccessSchema(ELEMENT_AND_ALL_GROUP, { type: "modifyElement", payload: { elementId: CODE_ID, fixed: "B" } });

      expect(result.complexType?.[1]?.sequence?.element?.[0]).toMatchObject({ fixed: "B", default_: undefined });
    });

    test("should remove default, fixed and nillable when an element becomes a reference", () => {
      const result = runCommandExpectSuccessSchema(ELEMENT_AND_ALL_GROUP, { type: "modifyElement", payload: { elementId: CODE_ID, ref: "item" } });

      expect(result.complexType?.[1]?.sequence?.element?.[0]).toMatchObject({
        ref: "item",
        default_: undefined,
        fixed: undefined,
        nillable: undefined,
      });
    });

    test.each([
      {
        rule: "both a default and a fixed value",
        payload: { elementId: "/element:item", default_: "a", fixed: "b" },
        error: "An element cannot have both a default value and a fixed value",
      },
      {
        rule: "a default value for a new reference",
        payload: { elementId: CODE_ID, ref: "item", default_: "a" },
        error: "A reference element cannot have a default or fixed value",
      },
    ])("should return validation error for $rule", ({ payload, error }) => {
      runCommandExpectValidationFailure(ELEMENT_AND_ALL_GROUP, { type: "modifyElement", payload }, error);
    });

    test("should add an element to an all group with occurrences", () => {
      const result = runCommandExpectSuccessSchema(ELEMENT_AND_ALL_GROUP, {
        type: "addElement",
        payload: { parentId: ALL_GROUP_ID, elementName: "retries", elementType: "xs:int", minOccurs: 0, maxOccurs: 1 },
      });

      // The generated class of an element in an all group (narrowMaxMin) has string occurrences
      const retries = result.complexType?.[0]?.all?.element?.find((el) => el.name === "retries");
      expect(retries).toMatchObject({ minOccurs: "0", maxOccurs: "1" });
    });

    test("should change the occurrences of an element in an all group", () => {
      const result = runCommandExpectSuccessSchema(ELEMENT_AND_ALL_GROUP, {
        type: "modifyElement",
        payload: { elementId: `${ALL_GROUP_ID}/element:timeout[0]`, minOccurs: 0, maxOccurs: 1 },
      });

      expect(result.complexType?.[0]?.all?.element?.[0]).toMatchObject({ minOccurs: "0", maxOccurs: "1" });
    });
  });
});
