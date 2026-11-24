/**
 * Unit tests for element executors.
 * Tests the implementation of add, remove, and modify element execution logic.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import type { AddElementPayload, ModifyElementPayload, localElement } from "../../shared/types.js";
import { schema } from "../../shared/types.js";
import { executeAddElement, executeRemoveElement, executeModifyElement } from "./elementExecutors.js";
import { emptySchema, schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";
import { readTestSchema } from "../__tests__/resourceTestHelpers.js";

/** The file with an element `person` and a complexType `OrderType`. */
const PERSON_AND_ORDER_TYPE_XSD = "person-element-and-order-type.xsd";

/** A top-level element `person` and a complexType `OrderType` that references it. */
const ORDER_TYPE_WITH_PERSON_REF = `<xs:element name="person" type="xs:string"/>
<xs:complexType name="OrderType">
  <xs:sequence>
    <xs:element ref="person"/>
  </xs:sequence>
</xs:complexType>`;

/** The ID of the sequence of `OrderType`. */
const ORDER_SEQUENCE_ID = "/complexType:OrderType/group:sequence[0]";

/** The ID of the sequence of the anonymous complexType of the element `person`. */
const PERSON_SEQUENCE_ID = "/element:person/anonymousComplexType[0]/group:sequence[0]";

/**
 * Returns an element `person` whose anonymous complexType has a sequence with the given elements.
 *
 * @param elements - The element declarations of the sequence
 * @returns The schema content
 */
function personWithSequence(elements: string): string {
  return `<xs:element name="person"><xs:complexType><xs:sequence>${elements}</xs:sequence></xs:complexType></xs:element>`;
}

/**
 * Executes an `addElement` command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function addElement(schemaObj: schema, payload: AddElementPayload): void {
  executeAddElement({ type: "addElement", payload }, schemaObj);
}

/**
 * Executes a `removeElement` command.
 *
 * @param schemaObj - The schema to change
 * @param elementId - The ID of the element to remove
 */
function removeElement(schemaObj: schema, elementId: string): void {
  executeRemoveElement({ type: "removeElement", payload: { elementId } }, schemaObj);
}

/**
 * Executes a `modifyElement` command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function modifyElement(schemaObj: schema, payload: ModifyElementPayload): void {
  executeModifyElement({ type: "modifyElement", payload }, schemaObj);
}

/**
 * Returns the elements of the sequence of `OrderType`.
 *
 * @param schemaObj - The schema object
 * @returns The elements, in document order
 */
function orderSequenceElements(schemaObj: schema): localElement[] {
  return schemaObj.complexType?.find((ct) => ct.name === "OrderType")?.sequence?.element ?? [];
}

/**
 * Returns the elements of the sequence of the anonymous complexType of the first top-level element.
 *
 * @param schemaObj - The schema object
 * @returns The elements, in document order
 */
function personSequenceElements(schemaObj: schema): localElement[] {
  return schemaObj.element?.[0]!.complexType?.sequence?.element ?? [];
}

describe("Element Executors", () => {
  describe("executeAddElement", () => {
    test("should add top-level elements to the schema in order", () => {
      const schemaObj = emptySchema();

      addElement(schemaObj, { parentId: "/schema", elementName: "person", elementType: "string" });
      addElement(schemaObj, { parentId: "/schema", elementName: "company", elementType: "string" });

      expect(schemaObj.element).toHaveLength(2);
      expect(schemaObj.element?.[0]).toMatchObject({ name: "person", type_: "string" });
      expect(schemaObj.element?.[1]!.name).toBe("company");
    });

    test("should add top-level element with documentation", () => {
      const schemaObj = emptySchema();

      addElement(schemaObj, {
        parentId: "/schema",
        elementName: "person",
        elementType: "string",
        documentation: "Represents a person",
      });

      expect(schemaObj.element?.[0]!.annotation?.documentation?.map((d) => d.value)).toEqual(["Represents a person"]);
    });

    test("should add element to a sequence in a complex type", () => {
      const schemaObj = schemaWith(personWithSequence(`<xs:element name="id" type="xs:int"/>`));

      addElement(schemaObj, { parentId: PERSON_SEQUENCE_ID, elementName: "name", elementType: "string" });

      expect(personSequenceElements(schemaObj).map((e) => e.name)).toEqual(["id", "name"]);
    });

    test("should add element to a sequence in complexContent extension using group parent ID", () => {
      const schemaObj = readTestSchema("worker-type-extends-person-type.xsd");

      addElement(schemaObj, {
        parentId: "/complexType:WorkerType/group:sequence[0]",
        elementName: "department",
        elementType: "xs:string",
      });

      const elements = schemaObj.complexType?.[0]!.complexContent?.extension?.sequence?.element ?? [];
      expect(elements).toHaveLength(2);
      expect(elements[1]!.name).toBe("department");
    });

    test.each([
      ["a reference element", {}, { minOccurs: undefined, maxOccurs: undefined }],
      [
        "a reference element with occurrences",
        { minOccurs: 0, maxOccurs: "unbounded" as const },
        { minOccurs: 0, maxOccurs: "unbounded" },
      ],
    ])("should add %s to a sequence", (_case, occurrences, expected) => {
      const schemaObj = readTestSchema(PERSON_AND_ORDER_TYPE_XSD);

      addElement(schemaObj, { parentId: ORDER_SEQUENCE_ID, ref: "person", ...occurrences });

      expect(orderSequenceElements(schemaObj)).toHaveLength(1);
      expect(orderSequenceElements(schemaObj)[0]).toMatchObject({
        ref: "person",
        name: undefined,
        type_: undefined,
        ...expected,
      });
    });

    test("should produce valid XML for a reference element", () => {
      const schemaObj = readTestSchema(PERSON_AND_ORDER_TYPE_XSD);

      addElement(schemaObj, { parentId: ORDER_SEQUENCE_ID, ref: "person" });

      const xml = marshal(schemaObj);
      expect(xml).toContain('ref="person"');
      expect(xml).not.toContain('name="person" type=');
    });
  });

  describe("executeRemoveElement", () => {
    test("should remove top-level element by name", () => {
      const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>
<xs:element name="company" type="xs:string"/>`);

      removeElement(schemaObj, "/element:person");

      expect(schemaObj.element?.map((e) => e.name)).toEqual(["company"]);
    });

    test("should remove element from sequence", () => {
      const schemaObj = readTestSchema("person-element-with-first-and-last-name.xsd");

      removeElement(schemaObj, `${PERSON_SEQUENCE_ID}/element:firstName`);

      expect(personSequenceElements(schemaObj).map((e) => e.name)).toEqual(["lastName"]);
    });

    test("should remove a reference element by ref name", () => {
      const schemaObj = schemaWith(ORDER_TYPE_WITH_PERSON_REF);

      removeElement(schemaObj, `${ORDER_SEQUENCE_ID}/element:person`);

      expect(orderSequenceElements(schemaObj)).toHaveLength(0);
    });
  });

  describe("executeModifyElement", () => {
    test.each([
      ["the name", { elementName: "employee" }, { name: "employee", type_: "xs:string" }],
      ["the type", { elementType: "xs:int" }, { name: "person", type_: "xs:int" }],
    ])("should modify %s of a top-level element", (_case, changes, expected) => {
      const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>`);

      modifyElement(schemaObj, { elementId: "/element:person", ...changes });

      expect(schemaObj.element).toHaveLength(1);
      expect(schemaObj.element?.[0]).toMatchObject(expected);
    });

    test.each([
      [
        "complexType",
        `<xs:complexType><xs:sequence><xs:element name="id" type="xs:string"/></xs:sequence></xs:complexType>`,
      ],
      ["simpleType", `<xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType>`],
    ] as const)("should replace an inline anonymous %s when setting an explicit element type", (kind, inlineType) => {
      const schemaObj = schemaWith(`<xs:element name="person">${inlineType}</xs:element>`);

      modifyElement(schemaObj, { elementId: "/element:person", elementType: "PersonType" });

      const element = schemaObj.element?.[0];
      expect(element?.type_).toBe("PersonType");
      expect(element?.[kind]).toBeUndefined();
    });

    test("should rename top-level element refs and substitutionGroup references", () => {
      const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>
<xs:element name="personChild" substitutionGroup="person"/>
<xs:complexType name="Wrapper">
  <xs:sequence>
    <xs:element ref="person"/>
  </xs:sequence>
</xs:complexType>`);

      modifyElement(schemaObj, { elementId: "/element:person", elementName: "customer" });

      const elements = schemaObj.element ?? [];
      expect(elements[0]!.name).toBe("customer");
      expect(elements[1]!.substitutionGroup).toBe("customer");
      expect(schemaObj.complexType?.[0]!.sequence?.element?.[0]!.ref).toBe("customer");
    });

    test.each([
      ["the name", `<xs:element name="phone" type="xs:string"/>`, { elementName: "mobile" }, { name: "mobile" }],
      [
        "the occurrences",
        `<xs:element name="phone" type="xs:string" minOccurs="1" maxOccurs="1"/>`,
        { minOccurs: 0, maxOccurs: "unbounded" as const },
        { minOccurs: 0, maxOccurs: "unbounded" },
      ],
    ])("should modify %s of an element in a sequence", (_case, declaration, changes, expected) => {
      const schemaObj = schemaWith(personWithSequence(declaration));

      modifyElement(schemaObj, { elementId: `${PERSON_SEQUENCE_ID}/element:phone`, ...changes });

      expect(personSequenceElements(schemaObj)[0]).toMatchObject(expected);
    });

    test("should modify a named element to become a reference", () => {
      const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>
<xs:complexType name="OrderType"><xs:sequence><xs:element name="item" type="xs:string"/></xs:sequence></xs:complexType>`);

      modifyElement(schemaObj, { elementId: `${ORDER_SEQUENCE_ID}/element:item`, ref: "person" });

      expect(orderSequenceElements(schemaObj)[0]).toMatchObject({ ref: "person", name: undefined, type_: undefined });
    });

    test("should modify a reference element to become named", () => {
      const schemaObj = schemaWith(ORDER_TYPE_WITH_PERSON_REF);

      modifyElement(schemaObj, {
        elementId: `${ORDER_SEQUENCE_ID}/element:person`,
        elementName: "employee",
        elementType: "xs:string",
      });

      expect(orderSequenceElements(schemaObj)[0]).toMatchObject({
        name: "employee",
        type_: "xs:string",
        ref: undefined,
      });
    });

    test("should produce valid XML after modifying element", () => {
      const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>`);

      modifyElement(schemaObj, {
        elementId: "/element:person",
        elementName: "employee",
        elementType: "xs:int",
      });

      const reparsed = unmarshal(schema, marshal(schemaObj));
      expect(reparsed.element?.[0]).toMatchObject({ name: "employee", type_: "xs:int" });
    });
  });
});
