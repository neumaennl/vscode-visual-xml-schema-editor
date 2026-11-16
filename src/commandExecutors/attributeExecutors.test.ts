/**
 * Unit tests for attribute executors.
 * Tests the implementation of add, remove, and modify attribute execution logic.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import type {
  attribute,
  topLevelAttribute,
  topLevelComplexType,
  AddAttributePayload,
  ModifyAttributePayload,
} from "../../shared/types.js";
import {
  schema
} from "../../shared/types.js";
import {
  executeAddAttribute,
  executeRemoveAttribute,
  executeModifyAttribute,
} from "./attributeExecutors.js";
import { emptySchema, schemaWith, DERIVATIONS, derivedComplexTypeT } from "../../shared/__tests__/schemaTestHelpers.js";
import { readTestSchema } from "../__tests__/resourceTestHelpers.js";

/** The file with a complexType `PersonType` with the local element `name`. */
const PERSON_TYPE_WITH_NAME_XSD = "person-type-with-name-element.xsd";

/** An empty complexType `PersonType`. */
const EMPTY_PERSON_TYPE = `<xs:complexType name="PersonType"/>`;

/** A complexType `PersonType` with the optional attribute `id`. */
const PERSON_TYPE_WITH_OPTIONAL_ID_ATTRIBUTE = `<xs:complexType name="PersonType">
  <xs:attribute name="id" type="xs:integer" use="optional"/>
</xs:complexType>`;

/** A top-level attribute `lang` and an empty complexType `PersonType`. */
const LANG_ATTRIBUTE_AND_PERSON_TYPE = `<xs:attribute name="lang" type="xs:string"/>
${EMPTY_PERSON_TYPE}`;

/** A top-level attribute `lang` and a complexType `PersonType` that references it. */
const PERSON_TYPE_WITH_LANG_ATTRIBUTE_REF = `<xs:attribute name="lang" type="xs:string"/>
<xs:complexType name="PersonType">
  <xs:attribute ref="lang"/>
</xs:complexType>`;

/** The attribute `id`. */
const ID_ATTRIBUTE = `<xs:attribute name="id" type="xs:integer"/>`;

/**
 * Returns a complexType `PersonType` with the given attributes.
 *
 * @param attributes - The attribute declarations
 * @returns The schema content
 */
function personTypeWith(attributes: string): string {
  return `<xs:complexType name="PersonType">${attributes}</xs:complexType>`;
}

/**
 * Executes an `addAttribute` command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function addAttribute(schemaObj: schema, payload: AddAttributePayload): void {
  executeAddAttribute({ type: "addAttribute", payload }, schemaObj);
}

/**
 * Executes a `removeAttribute` command.
 *
 * @param schemaObj - The schema to change
 * @param attributeId - The ID of the attribute to remove
 */
function removeAttribute(schemaObj: schema, attributeId: string): void {
  executeRemoveAttribute({ type: "removeAttribute", payload: { attributeId } }, schemaObj);
}

/**
 * Executes a `modifyAttribute` command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function modifyAttribute(schemaObj: schema, payload: ModifyAttributePayload): void {
  executeModifyAttribute({ type: "modifyAttribute", payload }, schemaObj);
}

/**
 * Returns the complexType with the given name.
 *
 * @param schemaObj - The schema object
 * @param name - The name of the complexType
 * @returns The complexType
 */
function complexTypeNamed(schemaObj: schema, name: string): topLevelComplexType {
  return (schemaObj.complexType ?? []).find((ct) => ct.name === name)!;
}

/**
 * Returns the local attributes of the complexType `PersonType`.
 *
 * @param schemaObj - The schema object
 * @returns The attributes, in document order
 */
function personTypeAttributes(schemaObj: schema): attribute[] {
  return complexTypeNamed(schemaObj, "PersonType").attribute ?? [];
}

/**
 * Returns the documentation texts of an attribute.
 *
 * @param attr - The attribute
 * @returns The texts
 */
function documentationOf(attr: attribute | topLevelAttribute | undefined): Array<string | undefined> {
  return (attr?.annotation?.documentation ?? []).map((d) => d.value);
}

describe("Attribute Executors", () => {
  describe("executeAddAttribute", () => {
    test.each([
      ["a named attribute", { attributeName: "lang", attributeType: "xs:string" }, { name: "lang", type_: "xs:string" }],
      ["a default value", { attributeName: "version", attributeType: "xs:string", defaultValue: "1.0" }, { default_: "1.0" }],
      [
        "a fixed value",
        { attributeName: "version", attributeType: "xs:string", fixedValue: "1.0" },
        { fixed: "1.0", default_: undefined },
      ],
    ])("should add a top-level attribute with %s", (_case, fields, expected) => {
      const schemaObj = emptySchema();

      addAttribute(schemaObj, { parentId: "/schema", ...fields });

      expect(schemaObj.attribute).toHaveLength(1);
      expect(schemaObj.attribute?.[0]).toMatchObject(expected);
    });

    test("should add a top-level attribute with documentation", () => {
      const schemaObj = emptySchema();

      addAttribute(schemaObj, { parentId: "/schema", attributeName: "lang", attributeType: "xs:string", documentation: "Language code" });

      expect(documentationOf(schemaObj.attribute?.[0])).toEqual(["Language code"]);
    });

    test.each([
      ["required", { attributeName: "id", attributeType: "xs:integer", required: true }, { name: "id", type_: "xs:integer", use: "required" }],
      ["optional", { attributeName: "nickname", attributeType: "xs:string", required: false }, { use: "optional" }],
      ["with a default value", { attributeName: "lang", attributeType: "xs:string", defaultValue: "en" }, { default_: "en" }],
      ["with a fixed value", { attributeName: "version", attributeType: "xs:string", fixedValue: "2.0" }, { fixed: "2.0" }],
      ["as a reference", { ref: "lang" }, { ref: "lang", name: undefined, type_: undefined }],
      ["as a required reference", { ref: "lang", required: true }, { ref: "lang", use: "required" }],
    ])("should add an attribute %s to a complex type", (_case, fields, expected) => {
      const schemaObj = schemaWith(LANG_ATTRIBUTE_AND_PERSON_TYPE);

      addAttribute(schemaObj, { parentId: "/complexType:PersonType", ...fields });

      expect(personTypeAttributes(schemaObj)).toHaveLength(1);
      expect(personTypeAttributes(schemaObj)[0]).toMatchObject(expected);
    });

    test("should add documentation to a new attribute reference", () => {
      const schemaObj = schemaWith(LANG_ATTRIBUTE_AND_PERSON_TYPE);

      addAttribute(schemaObj, { parentId: "/complexType:PersonType", ref: "lang", documentation: "Language of the content" });

      expect(personTypeAttributes(schemaObj)[0]!.ref).toBe("lang");
      expect(documentationOf(personTypeAttributes(schemaObj)[0])).toEqual(["Language of the content"]);
    });

    test("should add an attribute to an anonymous complex type", () => {
      const schemaObj = readTestSchema("person-element-with-name.xsd");

      addAttribute(schemaObj, {
        parentId: "/element:person/anonymousComplexType[0]",
        attributeName: "status",
        attributeType: "xs:string",
      });

      expect(schemaObj.element?.[0]!.complexType?.attribute?.map((a) => a.name)).toEqual(["status"]);
    });
  });

  describe("executeRemoveAttribute", () => {
    test("should remove a top-level attribute by name", () => {
      const schemaObj = schemaWith(`<xs:attribute name="lang" type="xs:string"/>
<xs:attribute name="version" type="xs:string"/>`);

      removeAttribute(schemaObj, "/attribute:lang");

      expect(schemaObj.attribute?.map((a) => a.name)).toEqual(["version"]);
    });

    test("should leave no empty attribute list when the last top-level attribute is removed", () => {
      const schemaObj = schemaWith(`<xs:attribute name="lang" type="xs:string"/>`);

      removeAttribute(schemaObj, "/attribute:lang");

      expect(schemaObj.attribute).toBeUndefined();
    });

    test("should remove an attribute from a complex type", () => {
      const schemaObj = schemaWith(personTypeWith(`${ID_ATTRIBUTE}<xs:attribute name="status" type="xs:string"/>`));

      removeAttribute(schemaObj, "/complexType:PersonType/attribute:id");

      expect(personTypeAttributes(schemaObj).map((a) => a.name)).toEqual(["status"]);
    });

    test("should remove a reference attribute by ref name", () => {
      const schemaObj = schemaWith(PERSON_TYPE_WITH_LANG_ATTRIBUTE_REF);

      removeAttribute(schemaObj, "/complexType:PersonType/attribute:lang");

      expect(complexTypeNamed(schemaObj, "PersonType").attribute).toBeUndefined();
    });

    test("should remove an attribute from an anonymous complex type", () => {
      const schemaObj = schemaWith(`<xs:element name="person"><xs:complexType>${ID_ATTRIBUTE}</xs:complexType></xs:element>`);

      removeAttribute(schemaObj, "/element:person/anonymousComplexType[0]/attribute:id");

      expect(schemaObj.element?.[0]!.complexType?.attribute).toBeUndefined();
    });
  });

  describe("executeModifyAttribute", () => {
    test.each([
      ["the name", ID_ATTRIBUTE, { attributeName: "personId" }, { name: "personId", type_: "xs:integer" }],
      ["the type", ID_ATTRIBUTE, { attributeType: "xs:string" }, { type_: "xs:string" }],
      ["the required status", `<xs:attribute name="id" type="xs:integer" use="optional"/>`, { required: true }, { use: "required" }],
      ["the optional status", `<xs:attribute name="id" type="xs:integer" use="required"/>`, { required: false }, { use: "optional" }],
      ["the default value", ID_ATTRIBUTE, { defaultValue: "1" }, { default_: "1" }],
      ["the fixed value", ID_ATTRIBUTE, { fixedValue: "2" }, { fixed: "2" }],
      [
        "the default value and clear the fixed value",
        `<xs:attribute name="id" type="xs:integer" fixed="1"/>`,
        { defaultValue: "2" },
        { default_: "2", fixed: undefined },
      ],
      [
        "the fixed value and clear the default value",
        `<xs:attribute name="id" type="xs:integer" default="1"/>`,
        { fixedValue: "2" },
        { fixed: "2", default_: undefined },
      ],
    ])("should modify %s of an attribute", (_case, declaration, changes, expected) => {
      const schemaObj = schemaWith(personTypeWith(declaration));

      modifyAttribute(schemaObj, { attributeId: "/complexType:PersonType/attribute:id", ...changes });

      expect(personTypeAttributes(schemaObj)[0]).toMatchObject(expected);
    });

    test("should add documentation to attribute", () => {
      const schemaObj = schemaWith(personTypeWith(ID_ATTRIBUTE));

      modifyAttribute(schemaObj, { attributeId: "/complexType:PersonType/attribute:id", documentation: "Unique person identifier" });

      expect(documentationOf(personTypeAttributes(schemaObj)[0])).toEqual(["Unique person identifier"]);
    });

    test("should replace the documentation of an attribute and keep its appinfo", () => {
      const schemaObj = schemaWith(
        personTypeWith(
          `<xs:attribute name="id" type="xs:integer"><xs:annotation><xs:appinfo>tool data</xs:appinfo><xs:documentation>Old</xs:documentation></xs:annotation></xs:attribute>`
        )
      );

      modifyAttribute(schemaObj, { attributeId: "/complexType:PersonType/attribute:id", documentation: "New" });

      const attr = personTypeAttributes(schemaObj)[0]!;
      expect(documentationOf(attr)).toEqual(["New"]);
      expect(attr.annotation?.appinfo ?? []).toHaveLength(1);
    });

    test("should modify a top-level attribute name", () => {
      const schemaObj = schemaWith(`<xs:attribute name="lang" type="xs:string"/>`);

      modifyAttribute(schemaObj, { attributeId: "/attribute:lang", attributeName: "language" });

      expect(schemaObj.attribute?.[0]!.name).toBe("language");
    });

    test("should modify a named attribute to become a reference", () => {
      const schemaObj = schemaWith(`<xs:attribute name="lang" type="xs:string"/>
${personTypeWith(`<xs:attribute name="locale" type="xs:string"/>`)}`);

      modifyAttribute(schemaObj, { attributeId: "/complexType:PersonType/attribute:locale", ref: "lang" });

      expect(personTypeAttributes(schemaObj)[0]).toMatchObject({ ref: "lang", name: undefined, type_: undefined });
    });

    test("should modify a reference attribute to become named", () => {
      const schemaObj = schemaWith(PERSON_TYPE_WITH_LANG_ATTRIBUTE_REF);

      modifyAttribute(schemaObj, {
        attributeId: "/complexType:PersonType/attribute:lang",
        attributeName: "locale",
        attributeType: "xs:string",
      });

      expect(personTypeAttributes(schemaObj)[0]).toMatchObject({ name: "locale", type_: "xs:string", ref: undefined });
    });
  });

  describe("Round-trip XML serialization", () => {
    test("should produce valid XML after adding an attribute", () => {
      const schemaObj = readTestSchema(PERSON_TYPE_WITH_NAME_XSD);

      addAttribute(schemaObj, {
        parentId: "/complexType:PersonType",
        attributeName: "id",
        attributeType: "xs:integer",
        required: true,
        documentation: "Person ID",
      });

      const reparsed = unmarshal(schema, marshal(schemaObj));
      expect(personTypeAttributes(reparsed)[0]).toMatchObject({ name: "id", use: "required" });
    });

    test("should produce valid XML after modifying an attribute", () => {
      const schemaObj = schemaWith(PERSON_TYPE_WITH_OPTIONAL_ID_ATTRIBUTE);

      modifyAttribute(schemaObj, {
        attributeId: "/complexType:PersonType/attribute:id",
        attributeName: "personId",
        attributeType: "xs:string",
        required: true,
      });

      const reparsed = unmarshal(schema, marshal(schemaObj));
      expect(personTypeAttributes(reparsed)[0]).toMatchObject({ name: "personId", type_: "xs:string", use: "required" });
    });

    test("should produce valid XML for a reference attribute", () => {
      const schemaObj = schemaWith(LANG_ATTRIBUTE_AND_PERSON_TYPE);

      addAttribute(schemaObj, { parentId: "/complexType:PersonType", ref: "lang" });

      const xml = marshal(schemaObj);
      expect(xml).toContain('ref="lang"');
      expect(xml).not.toContain('name="lang" type=');
    });
  });

  describe("derived complex types", () => {
    test.each(DERIVATIONS)(
      "should add an attribute to the %s %s of a named complex type",
      (content, derivation) => {
        const schemaObj = schemaWith(derivedComplexTypeT(content, derivation, ID_ATTRIBUTE));

        addAttribute(schemaObj, { parentId: "/complexType:T", attributeName: "lang", attributeType: "xs:string" });

        const ct = complexTypeNamed(schemaObj, "T");
        expect(ct[content]?.[derivation]?.attribute?.map((a) => a.name)).toEqual(["id", "lang"]);
        expect(ct.attribute ?? []).toEqual([]);
      }
    );

    test.each(DERIVATIONS)(
      "should remove an attribute from the %s %s of a named complex type",
      (content, derivation) => {
        const schemaObj = schemaWith(derivedComplexTypeT(content, derivation, ID_ATTRIBUTE));

        removeAttribute(schemaObj, "/complexType:T/attribute:id");

        expect(complexTypeNamed(schemaObj, "T")[content]?.[derivation]?.attribute).toBeUndefined();
      }
    );

    test.each(DERIVATIONS)(
      "should modify an attribute in the %s %s of a named complex type",
      (content, derivation) => {
        const schemaObj = schemaWith(derivedComplexTypeT(content, derivation, ID_ATTRIBUTE));

        modifyAttribute(schemaObj, { attributeId: "/complexType:T/attribute:id", attributeType: "xs:string" });

        expect(complexTypeNamed(schemaObj, "T")[content]?.[derivation]?.attribute?.[0]!.type_).toBe("xs:string");
      }
    );

    test("should add an attribute to the extension of an anonymous complex type and serialize it there", () => {
      const schemaObj = schemaWith(`<xs:element name="person"><xs:complexType><xs:complexContent>
  <xs:extension base="B"><xs:sequence/></xs:extension>
</xs:complexContent></xs:complexType></xs:element>`);

      addAttribute(schemaObj, {
        parentId: "/element:person/anonymousComplexType[0]",
        attributeName: "lang",
        attributeType: "xs:string",
      });

      const complexType = unmarshal(schema, marshal(schemaObj)).element![0]!.complexType!;
      expect(complexType.complexContent?.extension?.attribute?.map((a) => a.name)).toEqual(["lang"]);
      expect(complexType.attribute ?? []).toEqual([]);
    });
  });
});
