/**
 * Integration tests: attribute add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for attribute commands.
 * Success-path assertions are made against the unmarshalled schema object.
 */

import {
  COMPLEX_TYPES_WITH_ANY_ATTRIBUTE,
  SCHEMA_WITH_COMPLEXTYPE,
  runCommandExpectSuccess,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./pipelineTestHelpers.js";
import { expectLinesInOrder } from "./textTestHelpers.js";
import { emptySchemaXml, schemaXmlWith } from "../../shared/__tests__/schemaTestHelpers.js";

/** Schema with a complexType that has two attributes (id, status) for remove/modify tests. */
const SCHEMA_WITH_TWO_ATTRS = schemaXmlWith(`<xs:complexType name="PersonType">
  <xs:sequence>
    <xs:element name="name" type="xs:string"/>
  </xs:sequence>
  <xs:attribute name="id" type="xs:string"/>
  <xs:attribute name="status" type="xs:string"/>
</xs:complexType>`);

describe("Integration: Attribute pipeline", () => {
  // ─── addAttribute ──────────────────────────────────────────────────────────

  describe("addAttribute", () => {
    test("should add an attribute to an existing complexType", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, {
        type: "addAttribute",
        payload: {
          parentId: "/complexType:PersonType",
          attributeName: "email",
          attributeType: "xs:string",
        },
      });
      const ct = (result.complexType ?? [])[0];
      const attrs = ct.attribute ?? [];

      expect(attrs.some((a) => a.name === "email" && a.type_ === "xs:string")).toBe(true);
    });

    test("should add a required attribute", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, {
        type: "addAttribute",
        payload: {
          parentId: "/complexType:PersonType",
          attributeName: "code",
          attributeType: "xs:string",
          required: true,
        },
      });
      const ct = (result.complexType ?? [])[0];
      const attrs = ct.attribute ?? [];
      const code = attrs.find((a) => a.name === "code");

      expect(code).toBeDefined();
      expect(code!.use).toBe("required");
    });

    test.each(COMPLEX_TYPES_WITH_ANY_ATTRIBUTE)("should write a new attribute of %s before xs:anyAttribute", (_, complexType) => {
      const updatedXml = runCommandExpectSuccess(schemaXmlWith(complexType), {
        type: "addAttribute",
        payload: { parentId: "/complexType:T", attributeName: "a", attributeType: "xs:string" },
      });
      expectLinesInOrder(updatedXml, ["<xs:attribute ", "<xs:anyAttribute/>"]);
    });

    test("should return validation error when attribute name is invalid", () => {
      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, {
        type: "addAttribute",
        payload: {
          parentId: "/complexType:PersonType",
          attributeName: "bad attr",
          attributeType: "xs:string",
        },
      }, "Attribute name must be a valid XML name");
    });

    test("should return validation error when parent does not exist", () => {
      runCommandExpectValidationFailure(emptySchemaXml(), {
        type: "addAttribute",
        payload: {
          parentId: "/complexType:Missing",
          attributeName: "x",
          attributeType: "xs:string",
        },
      }, "Parent node not found: /complexType:Missing");
    });
  });

  // ─── removeAttribute ───────────────────────────────────────────────────────

  describe("removeAttribute", () => {
    test("should remove an existing attribute from a complexType", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_TWO_ATTRS, {
        type: "removeAttribute",
        payload: { attributeId: "/complexType:PersonType/attribute:id[0]" },
      });
      const ct = (result.complexType ?? [])[0];
      const attrs = ct.attribute ?? [];

      expect(attrs.some((a) => a.name === "id")).toBe(false);
      expect(attrs.some((a) => a.name === "status")).toBe(true);
    });

    test("should return validation error when attribute ID is out of range", () => {
      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, {
        type: "removeAttribute",
        payload: { attributeId: "/complexType:PersonType/attribute:id[99]" },
      }, "Attribute not found at position: 99");
    });
  });

  describe("modifyAttribute", () => {
    test("should rename an attribute", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id[0]",
          attributeName: "identifier",
        },
      });
      const ct = (result.complexType ?? [])[0];
      const attrs = ct.attribute ?? [];

      expect(attrs.some((a) => a.name === "identifier")).toBe(true);
      expect(attrs.some((a) => a.name === "id")).toBe(false);
    });

    test("should change the type of an attribute", () => {
      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id[0]",
          attributeType: "xs:integer",
        },
      });
      const ct = (result.complexType ?? [])[0];
      const attrs = ct.attribute ?? [];
      const id = attrs.find((a) => a.name === "id");

      expect(id).toBeDefined();
      expect(id!.type_).toBe("xs:integer");
    });

    test("should return validation error when attribute ID is out of range", () => {
      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id[99]",
          attributeName: "other",
        },
      }, "Attribute not found at position: 99");
    });
  });
});
