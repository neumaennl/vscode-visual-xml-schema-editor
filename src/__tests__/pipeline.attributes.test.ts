/**
 * Integration tests: attribute add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for attribute commands.
 */

import type {
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
} from "../../shared/types";
import {
  SCHEMA_WITH_COMPLEXTYPE,
  MINIMAL_SCHEMA,
  runCommandExpectSuccess,
  runCommandExpectValidationFailure,
} from "./testHelpers";

/** Schema with an element that has an inline complexType for attribute parent tests. */
const SCHEMA_WITH_ELEMENT_ATTRS = `<?xml version="1.0" encoding="UTF-8"?>
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

      const xml = runCommandExpectSuccess(SCHEMA_WITH_COMPLEXTYPE, cmd);

      expect(xml).toContain('name="email"');
      expect(xml).toContain('type="xs:string"');
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

      const xml = runCommandExpectSuccess(SCHEMA_WITH_COMPLEXTYPE, cmd);

      expect(xml).toContain('name="code"');
      expect(xml).toContain('use="required"');
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

      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, cmd, "valid XML name");
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

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "Missing");
    });
  });

  // ─── removeAttribute ───────────────────────────────────────────────────────

  describe("removeAttribute", () => {
    it("removes an existing attribute from a complexType", () => {
      const cmd: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: { attributeId: "/complexType:PersonType/attribute:id[0]" },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_ELEMENT_ATTRS, cmd);

      expect(xml).not.toContain('name="id"');
      expect(xml).toContain('name="status"');
    });

    it("returns validation error when attribute ID is out of range", () => {
      const cmd: RemoveAttributeCommand = {
        type: "removeAttribute",
        payload: { attributeId: "/complexType:PersonType/attribute:id[99]" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, cmd, "not found");
    });
  });

  // ─── modifyAttribute ───────────────────────────────────────────────────────

  describe("modifyAttribute", () => {
    it("renames an attribute", () => {
      const cmd: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id[0]",
          attributeName: "identifier",
        },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_COMPLEXTYPE, cmd);

      expect(xml).toContain('name="identifier"');
      expect(xml).not.toContain('name="id"');
    });

    it("changes the type of an attribute", () => {
      const cmd: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id[0]",
          attributeType: "xs:integer",
        },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_COMPLEXTYPE, cmd);

      expect(xml).toContain('type="xs:integer"');
    });

    it("returns validation error when attribute ID is out of range", () => {
      const cmd: ModifyAttributeCommand = {
        type: "modifyAttribute",
        payload: {
          attributeId: "/complexType:PersonType/attribute:id[99]",
          attributeName: "other",
        },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_COMPLEXTYPE, cmd, "not found");
    });
  });
});
