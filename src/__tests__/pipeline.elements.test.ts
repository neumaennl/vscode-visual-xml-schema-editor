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
} from "../../shared/types.js";
import {
  SCHEMA_WITH_ELEMENTS,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./pipelineTestHelpers.js";
import { emptySchemaXml, schemaXmlWith } from "./schemaTestHelpers.js";

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
    test("adds a top-level element to an empty schema", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/schema", elementName: "order", elementType: "xs:string" },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const elements = result.element ?? [];

      expect(elements).toHaveLength(1);
      expect(elements[0].name).toBe("order");
      expect(elements[0].type_).toBe("xs:string");
    });

    test("adds a second top-level element without disturbing the first", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/schema", elementName: "product", elementType: "xs:integer" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ELEMENTS, cmd);
      const elements = result.element ?? [];

      expect(elements).toHaveLength(3);
      expect(elements.some((e) => e.name === "person")).toBe(true);
      expect(elements.some((e) => e.name === "product")).toBe(true);
    });

    test("adds a top-level element with documentation", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: {
          parentId: "/schema",
          elementName: "invoice",
          elementType: "xs:string",
          documentation: "An invoice record",
        },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const elements = result.element ?? [];
      const invoice = elements.find((e) => e.name === "invoice");

      expect(invoice).toBeDefined();
      const documentations = invoice!.annotation?.documentation ?? [];
      expect(documentations[0].value).toBe("An invoice record");
    });

    test("returns validation error when element name is invalid", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/schema", elementName: "123invalid", elementType: "xs:string" },
      };

      runCommandExpectValidationFailure(emptySchemaXml(), cmd, "Element name must be a valid XML name");
    });

    test("returns validation error for duplicate element name", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: { parentId: "/schema", elementName: "person", elementType: "xs:string" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "Cannot add element: duplicate element name 'person' in schema");
    });
  });

  // ─── removeElement ─────────────────────────────────────────────────────────

  describe("removeElement", () => {
    test("removes an existing top-level element", () => {
      const cmd: RemoveElementCommand = {
        type: "removeElement",
        payload: { elementId: "/element:person" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ELEMENTS, cmd);
      const elements = result.element ?? [];

      expect(elements.some((e) => e.name === "person")).toBe(false);
      expect(elements.some((e) => e.name === "company")).toBe(true);
    });

    test("returns validation error when element ID does not exist", () => {
      const cmd: RemoveElementCommand = {
        type: "removeElement",
        payload: { elementId: "/element:nonexistent" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "Element not found with name: nonexistent");
    });
  });

  // ─── modifyElement ─────────────────────────────────────────────────────────

  describe("modifyElement", () => {
    test("renames an existing top-level element", () => {
      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/element:person", elementName: "individual" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ELEMENTS, cmd);
      const elements = result.element ?? [];

      expect(elements.some((e) => e.name === "individual")).toBe(true);
      expect(elements.some((e) => e.name === "person")).toBe(false);
    });

    test("changes the type of an existing element", () => {
      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/element:person", elementType: "xs:integer" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ELEMENTS, cmd);
      const elements = result.element ?? [];
      const person = elements.find((e) => e.name === "person");

      expect(person).toBeDefined();
      expect(person!.type_).toBe("xs:integer");
    });

    test("returns validation error when element ID does not exist", () => {
      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/element:missing", elementName: "other" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "Element not found: missing");
    });

    test("returns validation error when new name is invalid", () => {
      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: "/element:person", elementName: "bad name" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ELEMENTS, cmd, "Element name must be a valid XML name");
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
    ])("sets $change on a top-level element", ({ change, expected }) => {
      const cmd: ModifyElementCommand = { type: "modifyElement", payload: { elementId: "/element:item", ...change } };

      const result = runCommandExpectSuccessSchema(ELEMENT_AND_ALL_GROUP, cmd);

      expect(result.element?.[0]).toMatchObject(expected);
    });

    test("removes the default value when the fixed value is set", () => {
      const cmd: ModifyElementCommand = { type: "modifyElement", payload: { elementId: CODE_ID, fixed: "B" } };

      const result = runCommandExpectSuccessSchema(ELEMENT_AND_ALL_GROUP, cmd);

      expect(result.complexType?.[1]?.sequence?.element?.[0]).toMatchObject({ fixed: "B", default_: undefined });
    });

    test("removes default, fixed and nillable when an element becomes a reference", () => {
      const cmd: ModifyElementCommand = { type: "modifyElement", payload: { elementId: CODE_ID, ref: "item" } };

      const result = runCommandExpectSuccessSchema(ELEMENT_AND_ALL_GROUP, cmd);

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
    ])("returns validation error for $rule", ({ payload, error }) => {
      runCommandExpectValidationFailure(ELEMENT_AND_ALL_GROUP, { type: "modifyElement", payload }, error);
    });

    test("adds an element to an all group with occurrences", () => {
      const cmd: AddElementCommand = {
        type: "addElement",
        payload: { parentId: ALL_GROUP_ID, elementName: "retries", elementType: "xs:int", minOccurs: 0, maxOccurs: 1 },
      };

      const result = runCommandExpectSuccessSchema(ELEMENT_AND_ALL_GROUP, cmd);

      // The generated class of an element in an all group (narrowMaxMin) has string occurrences
      const retries = result.complexType?.[0]?.all?.element?.find((el) => el.name === "retries");
      expect(retries).toMatchObject({ minOccurs: "0", maxOccurs: "1" });
    });

    test("changes the occurrences of an element in an all group", () => {
      const cmd: ModifyElementCommand = {
        type: "modifyElement",
        payload: { elementId: `${ALL_GROUP_ID}/element:timeout[0]`, minOccurs: 0, maxOccurs: 1 },
      };

      const result = runCommandExpectSuccessSchema(ELEMENT_AND_ALL_GROUP, cmd);

      expect(result.complexType?.[0]?.all?.element?.[0]).toMatchObject({ minOccurs: "0", maxOccurs: "1" });
    });
  });
});
