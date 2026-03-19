/**
 * Integration tests: attribute add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for attribute commands.
 * Success-path assertions are made against the unmarshalled schema object.
 */

import type {
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import {
  SCHEMA_WITH_COMPLEXTYPE,
  MINIMAL_SCHEMA,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./testHelpers";

/** Schema with a complexType that has two attributes (id, status) for remove/modify tests. */
const SCHEMA_WITH_TWO_ATTRS = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:element name="name" type="xs:string"/>
    </xs:sequence>
    <xs:attribute name="id" type="xs:string"/>
    <xs:attribute name="status" type="xs:string"/>
  </xs:complexType>
</xs:schema>`;

describe("Integration: Attribute pipeline", () => {
  // ─── addAttribute ──────────────────────────────────────────────────────────

  describe("addAttribute", () => {
    it("adds an attribute to an existing complexType", () => {
      const cmd: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "/complexType:PersonType",
          attributeName: "email",
          attributeType: "xs:string",
        },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, cmd);
      const ct = toArray(result.complexType)[0];
      const attrs = toArray(ct.attribute);

      expect(attrs.some((a) => a.name === "email" && a.type_ === "xs:string")).toBe(true);
    });

    it("adds a required attribute", () => {
      const cmd: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "/complexType:PersonType",
          attributeName: "code",
          attributeType: "xs:string",
          required: true,
        },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, cmd);
      const ct = toArray(result.complexType)[0];
      const attrs = toArray(ct.attribute);
      const code = attrs.find((a) => a.name === "code");

      expect(code).toBeDefined();
      expect(code!.use).toBe("required");
    });

    it("returns validation error when attribute name is invalid", () => {
      const cmd: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "/complexType:PersonType",
          attributeName: "bad attr",
          attributeType: "xs:string",
        },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, cmd, "Attribute name must be a valid XML name");
    });

    it("returns validation error when parent does not exist", () => {
      const cmd: AddAttributeCommand = {
        type: "addAttribute",
        payload: {
          parentId: "/complexType:Missing",
          attributeName: "x",
          attributeType: "xs:string",
        },
      };

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "Parent node not found: /complexType:Missing");
    });
  });

  // ─── removeAttribute ───────────────────────────────────────────────────────

  describe("removeAttribute", () => {
    it("removes an existing attribute from a complexType", () => {
      const cmd: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: { attributeId: "/complexType:PersonType/attribute:id[0]" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_TWO_ATTRS, cmd);
      const ct = toArray(result.complexType)[0];
      const attrs = toArray(ct.attribute);

      expect(attrs.some((a) => a.name === "id")).toBe(false);
      expect(attrs.some((a) => a.name === "status")).toBe(true);
    });

    it("returns validation error when attribute ID is out of range", () => {
      const cmd: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: { attributeId: "/complexType:PersonType/attribute:id[99]" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, cmd, "Attribute not found at position: 99");
    });

  describe("modifyAttribute", () => {
    it("renames an attribute", () => {
      const cmd: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id[0]",
          attributeName: "identifier",
        },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, cmd);
      const ct = toArray(result.complexType)[0];
      const attrs = toArray(ct.attribute);

      expect(attrs.some((a) => a.name === "identifier")).toBe(true);
      expect(attrs.some((a) => a.name === "id")).toBe(false);
    });

    it("changes the type of an attribute", () => {
      const cmd: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id[0]",
          attributeType: "xs:integer",
        },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_COMPLEXTYPE, cmd);
      const ct = toArray(result.complexType)[0];
      const attrs = toArray(ct.attribute);
      const id = attrs.find((a) => a.name === "id");

      expect(id).toBeDefined();
      expect(id!.type_).toBe("xs:integer");
    });

    it("returns validation error when attribute ID is out of range", () => {
      const cmd: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id[99]",
          attributeName: "other",
        },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, cmd, "Attribute not found: id");
    });
  });
});
