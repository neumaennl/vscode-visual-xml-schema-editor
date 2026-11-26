/**
 * Unit tests for complexType executors.
 * Tests the implementation of add, remove, and modify complex type execution logic.
 */

import { marshal, unmarshal } from "@neumaennl/xmlbind-ts";
import type { AddComplexTypeCommand, ModifyComplexTypeCommand, RemoveComplexTypeCommand } from "../../shared/types.js";
import { schema } from "../../shared/types.js";
import { executeAddComplexType, executeModifyComplexType, executeRemoveComplexType } from "./complexTypeExecutors.js";
import { emptySchema, schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";

/** A complexType `EmployeeType` that extends `PersonType`. */
const EMPLOYEE_TYPE = `<xs:complexType name="EmployeeType">
  <xs:complexContent><xs:extension base="PersonType"><xs:sequence/></xs:extension></xs:complexContent>
</xs:complexType>`;

/** A top-level element `order` without a type. */
const ORDER_ELEMENT = `<xs:element name="order"/>`;

/** A complexType `ManagerType` that restricts `EmployeeType`, with the element `name` and the attribute `id`. */
const MANAGER_TYPE = `<xs:complexType name="ManagerType">
  <xs:complexContent>
    <xs:restriction base="EmployeeType">
      <xs:sequence><xs:element name="name" type="xs:string"/></xs:sequence>
      <xs:attribute name="id" type="xs:integer"/>
    </xs:restriction>
  </xs:complexContent>
</xs:complexType>`;

/**
 * Executes a `addComplexType` command with the given payload.
 *
 * @param schemaObj - The schema, which is changed
 * @param payload - The payload of the command
 */
function addComplexType(schemaObj: schema, payload: AddComplexTypeCommand["payload"]): void {
  executeAddComplexType({ type: "addComplexType", payload }, schemaObj);
}

/**
 * Executes a `removeComplexType` command with the given payload.
 *
 * @param schemaObj - The schema, which is changed
 * @param payload - The payload of the command
 */
function removeComplexType(schemaObj: schema, payload: RemoveComplexTypeCommand["payload"]): void {
  executeRemoveComplexType({ type: "removeComplexType", payload }, schemaObj);
}

/**
 * Executes a `modifyComplexType` command with the given payload.
 *
 * @param schemaObj - The schema, which is changed
 * @param payload - The payload of the command
 */
function modifyComplexType(schemaObj: schema, payload: ModifyComplexTypeCommand["payload"]): void {
  executeModifyComplexType({ type: "modifyComplexType", payload }, schemaObj);
}

/**
 * Returns the top-level complex types of the schema.
 *
 * @param schemaObj - The schema
 * @returns The top-level complex types, or an empty array if there are none
 */
function topLevelComplexTypes(schemaObj: schema): NonNullable<schema["complexType"]> {
  return schemaObj.complexType ?? [];
}

/**
 * Returns the top-level elements of the schema.
 *
 * @param schemaObj - The schema
 * @returns The top-level elements, or an empty array if there are none
 */
function topLevelElements(schemaObj: schema): NonNullable<schema["element"]> {
  return schemaObj.element ?? [];
}

/**
 * Asserts that the anonymous complexType of the first top-level element extends the base type and keeps
 * its sequence.
 *
 * @param schemaObj - The schema object
 * @param base - The expected base type
 */
function expectAnonymousExtensionOf(schemaObj: schema, base: string): void {
  const extension = topLevelElements(schemaObj)[0]!.complexType?.complexContent?.extension;
  expect(extension?.base).toBe(base);
  expect(extension?.sequence).toBeDefined();
}

describe("ComplexType Executors", () => {
  describe("executeAddComplexType", () => {
    test.each(["sequence", "choice", "all"] as const)(
      "should add a top-level complexType with the compositor %s",
      (model) => {
        const schemaObj = emptySchema();

        addComplexType(schemaObj, { typeName: "PersonType", compositor: model });

        const complexType = topLevelComplexTypes(schemaObj)[0]!;
        expect(complexType.name).toBe("PersonType");
        expect((["sequence", "choice", "all"] as const).filter((m) => complexType[m] !== undefined)).toEqual([model]);
        expect(complexType.complexContent).toBeUndefined();
      }
    );

    test("should set abstract on a new complexType", () => {
      const schemaObj = emptySchema();

      addComplexType(schemaObj, {
        typeName: "BaseType",
        compositor: "sequence",
        abstract: true,
      });

      expect(topLevelComplexTypes(schemaObj)[0]!.abstract).toBe(true);
    });

    test("should set mixed on a new complexType", () => {
      const schemaObj = emptySchema();

      addComplexType(schemaObj, {
        typeName: "MixedType",
        compositor: "sequence",
        mixed: true,
      });

      expect(topLevelComplexTypes(schemaObj)[0]!.mixed).toBe(true);
    });

    test("should add documentation to a new complexType", () => {
      const schemaObj = emptySchema();

      addComplexType(schemaObj, {
        typeName: "DocumentedType",
        compositor: "sequence",
        documentation: "Describes a person.",
      });

      expect(topLevelComplexTypes(schemaObj)[0]!.annotation!.documentation![0]!.value).toBe("Describes a person.");
    });

    test("should add a complexType with a base type extension", () => {
      const schemaObj = emptySchema();

      addComplexType(schemaObj, {
        typeName: "EmployeeType",
        compositor: "sequence",
        baseType: "PersonType",
      });

      const complexType = topLevelComplexTypes(schemaObj)[0]!;
      expect(complexType.complexContent!.extension!.base).toBe("PersonType");
      expect(complexType.complexContent!.extension!.sequence).toBeDefined();
      expect(complexType.sequence).toBeUndefined();
    });

    test("should add a base type extension using choice content", () => {
      const schemaObj = emptySchema();

      addComplexType(schemaObj, {
        typeName: "DerivedType",
        compositor: "choice",
        baseType: "BaseType",
      });

      const extension = topLevelComplexTypes(schemaObj)[0]!.complexContent!.extension!;
      expect(extension.base).toBe("BaseType");
      expect(extension.choice).toBeDefined();
      expect(extension.sequence).toBeUndefined();
    });

    test("should append new complex types after existing ones", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="ExistingType"><xs:sequence/></xs:complexType>`);

      addComplexType(schemaObj, { typeName: "NewType", compositor: "choice" });

      expect(topLevelComplexTypes(schemaObj)).toHaveLength(2);
      expect(topLevelComplexTypes(schemaObj)[1]!.name).toBe("NewType");
    });

    test("should round-trip a new complexType through XML", () => {
      const schemaObj = emptySchema();

      addComplexType(schemaObj, { typeName: "PersonType", compositor: "sequence" });

      const reparsed = unmarshal(schema, marshal(schemaObj));
      const complexType = topLevelComplexTypes(reparsed)[0]!;
      expect(complexType.name).toBe("PersonType");
      expect(complexType.sequence).toBeDefined();
    });
  });

  describe("executeRemoveComplexType", () => {
    test("should remove only the targeted top-level complexType", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="TypeA"><xs:sequence/></xs:complexType>
  <xs:complexType name="TypeB"><xs:choice/></xs:complexType>`);

      removeComplexType(schemaObj, { typeId: "/complexType:TypeA" });

      expect(topLevelComplexTypes(schemaObj)).toHaveLength(1);
      expect(topLevelComplexTypes(schemaObj)[0]!.name).toBe("TypeB");
    });

    test("should remove the last remaining top-level complexType", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="PersonType"><xs:sequence/></xs:complexType>`);

      removeComplexType(schemaObj, { typeId: "/complexType:PersonType" });

      expect(schemaObj.complexType).toBeUndefined();
    });
  });

  describe("executeModifyComplexType", () => {
    test("should rename a top-level complexType", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="RichType" abstract="true"><xs:sequence/></xs:complexType>`);

      modifyComplexType(schemaObj, { typeId: "/complexType:RichType", typeName: "RicherType" });

      expect(topLevelComplexTypes(schemaObj)[0]!.name).toBe("RicherType");
      expect(topLevelComplexTypes(schemaObj)[0]!.abstract).toBeTruthy();
    });

    test("should update the abstract flag", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="BaseType"><xs:sequence/></xs:complexType>`);

      modifyComplexType(schemaObj, { typeId: "/complexType:BaseType", abstract: true });

      expect(topLevelComplexTypes(schemaObj)[0]!.abstract).toBe(true);
    });

    test("should update the mixed flag", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="TextType"><xs:sequence/></xs:complexType>`);

      modifyComplexType(schemaObj, { typeId: "/complexType:TextType", mixed: true });

      expect(topLevelComplexTypes(schemaObj)[0]!.mixed).toBe(true);
    });

    test("should change the compositor to choice and keep its particles", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="FlexType"><xs:sequence>
    <xs:element name="a" type="xs:string"/>
    <xs:choice><xs:element name="b" type="xs:string"/></xs:choice>
  </xs:sequence></xs:complexType>`);

      modifyComplexType(schemaObj, { typeId: "/complexType:FlexType", compositor: "choice" });

      const complexType = topLevelComplexTypes(schemaObj)[0]!;
      expect(complexType.sequence).toBeUndefined();
      expect(complexType.choice?.element?.map((el) => el.name)).toEqual(["a"]);
      expect(complexType.choice?.choice?.[0]?.element?.[0]?.name).toBe("b");
    });

    test("should change the compositor to all and keep its elements", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="AllType"><xs:sequence><xs:element name="a" type="xs:string" minOccurs="0"/></xs:sequence></xs:complexType>`);

      modifyComplexType(schemaObj, { typeId: "/complexType:AllType", compositor: "all" });

      const complexType = topLevelComplexTypes(schemaObj)[0]!;
      expect(complexType.sequence).toBeUndefined();
      expect(complexType.all?.element?.[0]).toMatchObject({ name: "a", minOccurs: "0" });
    });

    test("should add a base type to a plain complexType", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="EmployeeType"><xs:sequence/></xs:complexType>`);

      modifyComplexType(schemaObj, { typeId: "/complexType:EmployeeType", baseType: "PersonType" });

      const extension = topLevelComplexTypes(schemaObj)[0]!.complexContent!.extension!;
      expect(extension.base).toBe("PersonType");
      expect(extension.sequence).toBeDefined();
    });

    test("should preserve existing compositor content when adding an extension base type", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="EmployeeType">
    <xs:sequence><xs:element name="name" type="xs:string"/></xs:sequence>
  </xs:complexType>`);

      modifyComplexType(schemaObj, {
        typeId: "/complexType:EmployeeType",
        baseType: "PersonType",
        derivationKind: "extension",
      });

      const extension = topLevelComplexTypes(schemaObj)[0]!.complexContent!.extension!;
      expect(extension.base).toBe("PersonType");
      expect(extension.sequence?.element?.[0]?.name).toBe("name");
    });

    test("should switch a complexType to a restriction without dropping its existing compositor content", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="EmployeeType">
    <xs:complexContent>
      <xs:extension base="PersonType">
        <xs:sequence><xs:element name="name" type="xs:string"/></xs:sequence>
      </xs:extension>
    </xs:complexContent>
  </xs:complexType>`);

      modifyComplexType(schemaObj, {
        typeId: "/complexType:EmployeeType",
        baseType: "WorkerType",
        derivationKind: "restriction",
      });

      const restriction = topLevelComplexTypes(schemaObj)[0]!.complexContent!.restriction!;
      expect(restriction.base).toBe("WorkerType");
      expect(restriction.sequence?.element?.[0]?.name).toBe("name");
      expect(topLevelComplexTypes(schemaObj)[0]!.complexContent!.extension).toBeUndefined();
    });

    test("should switch a restricting complexType to an extension and keeps its base and content", () => {
      const schemaObj = schemaWith(MANAGER_TYPE);

      modifyComplexType(schemaObj, { typeId: "/complexType:ManagerType", derivationKind: "extension" });

      const complexContent = topLevelComplexTypes(schemaObj)[0]!.complexContent!;
      expect(complexContent.restriction).toBeUndefined();
      expect(complexContent.extension?.base).toBe("EmployeeType");
      expect((complexContent.extension?.sequence?.element ?? []).map((element) => element.name)).toEqual(["name"]);
      expect((complexContent.extension?.attribute ?? []).map((attribute) => attribute.name)).toEqual(["id"]);
    });

    test("should change the compositor of a restricting complexType and keeps its base and attributes", () => {
      const schemaObj = schemaWith(MANAGER_TYPE);

      modifyComplexType(schemaObj, { typeId: "/complexType:ManagerType", compositor: "choice" });

      const complexContent = topLevelComplexTypes(schemaObj)[0]!.complexContent!;
      expect(complexContent.extension).toBeUndefined();
      expect(complexContent.restriction?.base).toBe("EmployeeType");
      expect(complexContent.restriction?.choice).toBeDefined();
      expect(complexContent.restriction?.sequence).toBeUndefined();
      expect((complexContent.restriction?.attribute ?? []).map((attribute) => attribute.name)).toEqual(["id"]);
    });

    test("should update an existing extension base type", () => {
      const schemaObj = schemaWith(EMPLOYEE_TYPE);

      modifyComplexType(schemaObj, { typeId: "/complexType:EmployeeType", baseType: "WorkerType" });

      expect(topLevelComplexTypes(schemaObj)[0]!.complexContent!.extension!.base).toBe("WorkerType");
    });

    test("should remove an existing base type when set to an empty string", () => {
      const schemaObj = schemaWith(EMPLOYEE_TYPE);

      modifyComplexType(schemaObj, { typeId: "/complexType:EmployeeType", baseType: "" });

      const complexType = topLevelComplexTypes(schemaObj)[0]!;
      expect(complexType.complexContent).toBeUndefined();
      expect(complexType.sequence).toBeDefined();
    });
  });

  describe("anonymous complexType executors", () => {
    test("should add an anonymous complexType with sequence content", () => {
      const schemaObj = schemaWith(`<xs:element name="person"/>`);

      addComplexType(schemaObj, {
        parentId: "/element:person",
        compositor: "sequence",
      });

      const complexType = topLevelElements(schemaObj)[0]!.complexType!;
      expect(complexType.sequence).toBeDefined();
      expect(complexType.choice).toBeUndefined();
    });

    test("should add an anonymous complexType with mixed choice content", () => {
      const schemaObj = schemaWith(`<xs:element name="content"/>`);

      addComplexType(schemaObj, {
        parentId: "/element:content",
        compositor: "choice",
        mixed: true,
      });

      const complexType = topLevelElements(schemaObj)[0]!.complexType!;
      expect(complexType.choice).toBeDefined();
      expect(complexType.mixed).toBe(true);
    });

    test("should add an anonymous complexType with a base type extension", () => {
      const schemaObj = schemaWith(`<xs:element name="employee"/>`);

      addComplexType(schemaObj, {
        parentId: "/element:employee",
        compositor: "sequence",
        baseType: "PersonType",
      });

      expectAnonymousExtensionOf(schemaObj, "PersonType");
    });

    test.each([
      ["type attribute", `<xs:element name="person" type="xs:string"/>`, "type_"],
      [
        "anonymous simpleType",
        `<xs:element name="person"><xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType></xs:element>`,
        "simpleType",
      ],
    ] as const)("should replace an existing %s when adding an anonymous complexType", (_case, element, replaced) => {
      const schemaObj = schemaWith(element);

      addComplexType(schemaObj, { parentId: "/element:person", compositor: "sequence" });

      const result = topLevelElements(schemaObj)[0]!;
      expect(result[replaced]).toBeUndefined();
      expect(result.complexType?.sequence).toBeDefined();
    });

    test("should add documentation to an anonymous complexType", () => {
      const schemaObj = schemaWith(ORDER_ELEMENT);

      addComplexType(schemaObj, {
        parentId: "/element:order",
        compositor: "sequence",
        documentation: "Represents an order.",
      });

      expect(topLevelElements(schemaObj)[0]!.complexType!.annotation!.documentation![0]!.value).toBe(
        "Represents an order."
      );
    });

    test("should round-trip an anonymous complexType through XML", () => {
      const schemaObj = schemaWith(ORDER_ELEMENT);

      addComplexType(schemaObj, {
        parentId: "/element:order",
        compositor: "sequence",
      });

      const reparsed = unmarshal(schema, marshal(schemaObj));
      expect(topLevelElements(reparsed)[0]!.complexType!.sequence).toBeDefined();
    });

    test("should remove an anonymous complexType from an element", () => {
      const schemaObj = schemaWith(`
  <xs:element name="person">
    <xs:complexType><xs:sequence/></xs:complexType>
  </xs:element>`);

      removeComplexType(schemaObj, { typeId: "/element:person/anonymousComplexType[0]" });

      expect(topLevelElements(schemaObj)[0]!.complexType).toBeUndefined();
    });

    test("should change the compositor of an anonymous complexType", () => {
      const schemaObj = schemaWith(`
  <xs:element name="person"><xs:complexType><xs:sequence/></xs:complexType></xs:element>`);

      modifyComplexType(schemaObj, {
        typeId: "/element:person/anonymousComplexType[0]",
        compositor: "choice",
      });

      const complexType = topLevelElements(schemaObj)[0]!.complexType!;
      expect(complexType.choice).toBeDefined();
      expect(complexType.sequence).toBeUndefined();
    });

    test("should update the mixed flag on an anonymous complexType", () => {
      const schemaObj = schemaWith(`
  <xs:element name="text"><xs:complexType><xs:sequence/></xs:complexType></xs:element>`);

      modifyComplexType(schemaObj, {
        typeId: "/element:text/anonymousComplexType[0]",
        mixed: true,
      });

      expect(topLevelElements(schemaObj)[0]!.complexType!.mixed).toBe(true);
    });

    test("should add a base type to an anonymous complexType", () => {
      const schemaObj = schemaWith(`
  <xs:element name="employee"><xs:complexType><xs:sequence/></xs:complexType></xs:element>`);

      modifyComplexType(schemaObj, {
        typeId: "/element:employee/anonymousComplexType[0]",
        baseType: "PersonType",
      });

      expectAnonymousExtensionOf(schemaObj, "PersonType");
    });

    test("should switch an anonymous complexType to a restriction without dropping its content", () => {
      const schemaObj = schemaWith(`
  <xs:element name="employee">
    <xs:complexType>
      <xs:sequence><xs:element name="name" type="xs:string"/></xs:sequence>
    </xs:complexType>
  </xs:element>`);

      modifyComplexType(schemaObj, {
        typeId: "/element:employee/anonymousComplexType[0]",
        baseType: "PersonType",
        derivationKind: "restriction",
      });

      const restriction = topLevelElements(schemaObj)[0]!.complexType!.complexContent!.restriction!;
      expect(restriction.base).toBe("PersonType");
      expect(restriction.sequence?.element?.[0]?.name).toBe("name");
    });
  });

  describe("executeModifyComplexType — reference propagation", () => {
    test("should rename element/@type references when a top-level complexType is renamed", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="PersonType"><xs:sequence/></xs:complexType>
  <xs:element name="person" type="PersonType"/>`);

      modifyComplexType(schemaObj, {
        typeId: "/complexType:PersonType",
        typeName: "HumanType",
      });

      expect(topLevelComplexTypes(schemaObj)[0]!.name).toBe("HumanType");
      expect(topLevelElements(schemaObj)[0]!.type_).toBe("HumanType");
    });

    test("should rename extension/@base references when a top-level complexType is renamed", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="BaseType"><xs:sequence/></xs:complexType>
  <xs:complexType name="DerivedType">
    <xs:complexContent><xs:extension base="BaseType"><xs:sequence/></xs:extension></xs:complexContent>
  </xs:complexType>`);

      modifyComplexType(schemaObj, {
        typeId: "/complexType:BaseType",
        typeName: "RootType",
      });

      const derived = topLevelComplexTypes(schemaObj).find((complexType) => complexType.name === "DerivedType");
      expect(derived!.complexContent!.extension!.base).toBe("RootType");
    });
  });
});
