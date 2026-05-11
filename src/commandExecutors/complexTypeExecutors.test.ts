/**
 * Unit tests for complexType executors.
 * Tests the implementation of add, remove, and modify complex type execution logic.
 */

import { marshal, unmarshal } from "@neumaennl/xmlbind-ts";
import {
  AddComplexTypeCommand,
  ModifyComplexTypeCommand,
  RemoveComplexTypeCommand,
  schema,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import {
  executeAddComplexType,
  executeModifyComplexType,
  executeRemoveComplexType,
} from "./complexTypeExecutors";

function schemaWith(body = ""): schema {
  return unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">${body}</xs:schema>`
  );
}

function addComplexType(schemaObj: schema, payload: AddComplexTypeCommand["payload"]): void {
  executeAddComplexType({ type: "addComplexType", payload }, schemaObj);
}

function removeComplexType(schemaObj: schema, payload: RemoveComplexTypeCommand["payload"]): void {
  executeRemoveComplexType({ type: "removeComplexType", payload }, schemaObj);
}

function modifyComplexType(schemaObj: schema, payload: ModifyComplexTypeCommand["payload"]): void {
  executeModifyComplexType({ type: "modifyComplexType", payload }, schemaObj);
}

function topLevelComplexTypes(schemaObj: schema): NonNullable<schema["complexType"]> {
  return toArray(schemaObj.complexType);
}

function topLevelElements(schemaObj: schema): NonNullable<schema["element"]> {
  return toArray(schemaObj.element);
}

describe("ComplexType Executors", () => {
  describe("executeAddComplexType", () => {
    it("adds a top-level complexType with a sequence content model", () => {
      const schemaObj = schemaWith();

      addComplexType(schemaObj, { typeName: "PersonType", contentModel: "sequence" });

      const complexType = topLevelComplexTypes(schemaObj)[0];
      expect(complexType.name).toBe("PersonType");
      expect(complexType.sequence).toBeDefined();
      expect(complexType.choice).toBeUndefined();
      expect(complexType.all).toBeUndefined();
      expect(complexType.complexContent).toBeUndefined();
    });

    it("adds a top-level complexType with a choice content model", () => {
      const schemaObj = schemaWith();

      addComplexType(schemaObj, { typeName: "ShapeType", contentModel: "choice" });

      const complexType = topLevelComplexTypes(schemaObj)[0];
      expect(complexType.choice).toBeDefined();
      expect(complexType.sequence).toBeUndefined();
      expect(complexType.all).toBeUndefined();
    });

    it("adds a top-level complexType with an all content model", () => {
      const schemaObj = schemaWith();

      addComplexType(schemaObj, { typeName: "AddressType", contentModel: "all" });

      const complexType = topLevelComplexTypes(schemaObj)[0];
      expect(complexType.all).toBeDefined();
      expect(complexType.sequence).toBeUndefined();
      expect(complexType.choice).toBeUndefined();
    });

    it("sets abstract on a new complexType", () => {
      const schemaObj = schemaWith();

      addComplexType(schemaObj, {
        typeName: "BaseType",
        contentModel: "sequence",
        abstract: true,
      });

      expect(topLevelComplexTypes(schemaObj)[0].abstract).toBe(true);
    });

    it("sets mixed on a new complexType", () => {
      const schemaObj = schemaWith();

      addComplexType(schemaObj, {
        typeName: "MixedType",
        contentModel: "sequence",
        mixed: true,
      });

      expect(topLevelComplexTypes(schemaObj)[0].mixed).toBe(true);
    });

    it("adds documentation to a new complexType", () => {
      const schemaObj = schemaWith();

      addComplexType(schemaObj, {
        typeName: "DocumentedType",
        contentModel: "sequence",
        documentation: "Describes a person.",
      });

      expect(topLevelComplexTypes(schemaObj)[0].annotation!.documentation![0].value).toBe(
        "Describes a person."
      );
    });

    it("adds a complexType with a base type extension", () => {
      const schemaObj = schemaWith();

      addComplexType(schemaObj, {
        typeName: "EmployeeType",
        contentModel: "sequence",
        baseType: "PersonType",
      });

      const complexType = topLevelComplexTypes(schemaObj)[0];
      expect(complexType.complexContent!.extension!.base).toBe("PersonType");
      expect(complexType.complexContent!.extension!.sequence).toBeDefined();
      expect(complexType.sequence).toBeUndefined();
    });

    it("adds a base type extension using choice content", () => {
      const schemaObj = schemaWith();

      addComplexType(schemaObj, {
        typeName: "DerivedType",
        contentModel: "choice",
        baseType: "BaseType",
      });

      const extension = topLevelComplexTypes(schemaObj)[0].complexContent!.extension!;
      expect(extension.base).toBe("BaseType");
      expect(extension.choice).toBeDefined();
      expect(extension.sequence).toBeUndefined();
    });

    it("appends new complex types after existing ones", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="ExistingType"><xs:sequence/></xs:complexType>`);

      addComplexType(schemaObj, { typeName: "NewType", contentModel: "choice" });

      expect(topLevelComplexTypes(schemaObj)).toHaveLength(2);
      expect(topLevelComplexTypes(schemaObj)[1].name).toBe("NewType");
    });

    it("round-trips a new complexType through XML", () => {
      const schemaObj = schemaWith();

      addComplexType(schemaObj, { typeName: "PersonType", contentModel: "sequence" });

      const reparsed = unmarshal(schema, marshal(schemaObj));
      const complexType = topLevelComplexTypes(reparsed)[0];
      expect(complexType.name).toBe("PersonType");
      expect(complexType.sequence).toBeDefined();
    });
  });

  describe("executeRemoveComplexType", () => {
    it("removes only the targeted top-level complexType", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="TypeA"><xs:sequence/></xs:complexType>
  <xs:complexType name="TypeB"><xs:choice/></xs:complexType>`);

      removeComplexType(schemaObj, { typeId: "/complexType:TypeA" });

      expect(topLevelComplexTypes(schemaObj)).toHaveLength(1);
      expect(topLevelComplexTypes(schemaObj)[0].name).toBe("TypeB");
    });

    it("removes the last remaining top-level complexType", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="PersonType"><xs:sequence/></xs:complexType>`);

      removeComplexType(schemaObj, { typeId: "/complexType:PersonType" });

      expect(schemaObj.complexType).toBeUndefined();
    });
  });

  describe("executeModifyComplexType", () => {
    it("renames a top-level complexType", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="RichType" abstract="true"><xs:sequence/></xs:complexType>`);

      modifyComplexType(schemaObj, { typeId: "/complexType:RichType", typeName: "RicherType" });

      expect(topLevelComplexTypes(schemaObj)[0].name).toBe("RicherType");
      expect(topLevelComplexTypes(schemaObj)[0].abstract).toBeTruthy();
    });

    it("updates the abstract flag", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="BaseType"><xs:sequence/></xs:complexType>`);

      modifyComplexType(schemaObj, { typeId: "/complexType:BaseType", abstract: true });

      expect(topLevelComplexTypes(schemaObj)[0].abstract).toBe(true);
    });

    it("updates the mixed flag", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="TextType"><xs:sequence/></xs:complexType>`);

      modifyComplexType(schemaObj, { typeId: "/complexType:TextType", mixed: true });

      expect(topLevelComplexTypes(schemaObj)[0].mixed).toBe(true);
    });

    it("updates documentation", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="DocType"><xs:sequence/></xs:complexType>`);

      modifyComplexType(schemaObj, {
        typeId: "/complexType:DocType",
        documentation: "Updated documentation.",
      });

      expect(topLevelComplexTypes(schemaObj)[0].annotation!.documentation![0].value).toBe(
        "Updated documentation."
      );
    });

    it("changes the content model to choice", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="FlexType"><xs:sequence/></xs:complexType>`);

      modifyComplexType(schemaObj, { typeId: "/complexType:FlexType", contentModel: "choice" });

      const complexType = topLevelComplexTypes(schemaObj)[0];
      expect(complexType.choice).toBeDefined();
      expect(complexType.sequence).toBeUndefined();
    });

    it("changes the content model to all", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="AllType"><xs:sequence/></xs:complexType>`);

      modifyComplexType(schemaObj, { typeId: "/complexType:AllType", contentModel: "all" });

      const complexType = topLevelComplexTypes(schemaObj)[0];
      expect(complexType.all).toBeDefined();
      expect(complexType.sequence).toBeUndefined();
    });

    it("adds a base type to a plain complexType", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="EmployeeType"><xs:sequence/></xs:complexType>`);

      modifyComplexType(schemaObj, { typeId: "/complexType:EmployeeType", baseType: "PersonType" });

      const extension = topLevelComplexTypes(schemaObj)[0].complexContent!.extension!;
      expect(extension.base).toBe("PersonType");
      expect(extension.sequence).toBeDefined();
    });

    it("preserves existing compositor content when adding an extension base type", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="EmployeeType">
    <xs:sequence><xs:element name="name" type="xs:string"/></xs:sequence>
  </xs:complexType>`);

      modifyComplexType(schemaObj, {
        typeId: "/complexType:EmployeeType",
        baseType: "PersonType",
        derivationKind: "extension",
      });

      const extension = topLevelComplexTypes(schemaObj)[0].complexContent!.extension!;
      expect(extension.base).toBe("PersonType");
      expect(toArray(extension.sequence?.element)[0].name).toBe("name");
    });

    it("switches a complexType to a restriction without dropping its existing compositor content", () => {
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

      const restriction = topLevelComplexTypes(schemaObj)[0].complexContent!.restriction!;
      expect(restriction.base).toBe("WorkerType");
      expect(toArray(restriction.sequence?.element)[0].name).toBe("name");
      expect(topLevelComplexTypes(schemaObj)[0].complexContent!.extension).toBeUndefined();
    });

    it("updates an existing extension base type", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="EmployeeType">
    <xs:complexContent><xs:extension base="PersonType"><xs:sequence/></xs:extension></xs:complexContent>
  </xs:complexType>`);

      modifyComplexType(schemaObj, { typeId: "/complexType:EmployeeType", baseType: "WorkerType" });

      expect(topLevelComplexTypes(schemaObj)[0].complexContent!.extension!.base).toBe("WorkerType");
    });

    it("removes an existing base type when set to an empty string", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="EmployeeType">
    <xs:complexContent><xs:extension base="PersonType"><xs:sequence/></xs:extension></xs:complexContent>
  </xs:complexType>`);

      modifyComplexType(schemaObj, { typeId: "/complexType:EmployeeType", baseType: "" });

      const complexType = topLevelComplexTypes(schemaObj)[0];
      expect(complexType.complexContent).toBeUndefined();
      expect(complexType.sequence).toBeDefined();
    });
  });

  describe("anonymous complexType executors", () => {
    it("adds an anonymous complexType with sequence content", () => {
      const schemaObj = schemaWith(`<xs:element name="person"/>`);

      addComplexType(schemaObj, {
        parentId: "/element:person",
        contentModel: "sequence",
      });

      const complexType = topLevelElements(schemaObj)[0].complexType!;
      expect(complexType.sequence).toBeDefined();
      expect(complexType.choice).toBeUndefined();
    });

    it("adds an anonymous complexType with mixed choice content", () => {
      const schemaObj = schemaWith(`<xs:element name="content"/>`);

      addComplexType(schemaObj, {
        parentId: "/element:content",
        contentModel: "choice",
        mixed: true,
      });

      const complexType = topLevelElements(schemaObj)[0].complexType!;
      expect(complexType.choice).toBeDefined();
      expect(complexType.mixed).toBe(true);
    });

    it("adds an anonymous complexType with a base type extension", () => {
      const schemaObj = schemaWith(`<xs:element name="employee"/>`);

      addComplexType(schemaObj, {
        parentId: "/element:employee",
        contentModel: "sequence",
        baseType: "PersonType",
      });

      const extension = topLevelElements(schemaObj)[0].complexType!.complexContent!.extension!;
      expect(extension.base).toBe("PersonType");
      expect(extension.sequence).toBeDefined();
    });

    it("replaces an existing type attribute when adding an anonymous complexType", () => {
      const schemaObj = schemaWith(`<xs:element name="person" type="xs:string"/>`);

      addComplexType(schemaObj, {
        parentId: "/element:person",
        contentModel: "sequence",
      });

      const element = topLevelElements(schemaObj)[0];
      expect(element.type_).toBeUndefined();
      expect(element.complexType?.sequence).toBeDefined();
    });

    it("replaces an existing anonymous simpleType when adding an anonymous complexType", () => {
      const schemaObj = schemaWith(`
  <xs:element name="person">
    <xs:simpleType>
      <xs:restriction base="xs:string"/>
    </xs:simpleType>
  </xs:element>`);

      addComplexType(schemaObj, {
        parentId: "/element:person",
        contentModel: "sequence",
      });

      const element = topLevelElements(schemaObj)[0];
      expect(element.simpleType).toBeUndefined();
      expect(element.complexType?.sequence).toBeDefined();
    });

    it("adds documentation to an anonymous complexType", () => {
      const schemaObj = schemaWith(`<xs:element name="order"/>`);

      addComplexType(schemaObj, {
        parentId: "/element:order",
        contentModel: "sequence",
        documentation: "Represents an order.",
      });

      expect(topLevelElements(schemaObj)[0].complexType!.annotation!.documentation![0].value).toBe(
        "Represents an order."
      );
    });

    it("round-trips an anonymous complexType through XML", () => {
      const schemaObj = schemaWith(`<xs:element name="order"/>`);

      addComplexType(schemaObj, {
        parentId: "/element:order",
        contentModel: "sequence",
      });

      const reparsed = unmarshal(schema, marshal(schemaObj));
      expect(topLevelElements(reparsed)[0].complexType!.sequence).toBeDefined();
    });

    it("removes an anonymous complexType from an element", () => {
      const schemaObj = schemaWith(`
  <xs:element name="person">
    <xs:complexType><xs:sequence/></xs:complexType>
  </xs:element>`);

      removeComplexType(schemaObj, { typeId: "/element:person/anonymousComplexType[0]" });

      expect(topLevelElements(schemaObj)[0].complexType).toBeUndefined();
    });

    it("changes the content model on an anonymous complexType", () => {
      const schemaObj = schemaWith(`
  <xs:element name="person"><xs:complexType><xs:sequence/></xs:complexType></xs:element>`);

      modifyComplexType(schemaObj, {
        typeId: "/element:person/anonymousComplexType[0]",
        contentModel: "choice",
      });

      const complexType = topLevelElements(schemaObj)[0].complexType!;
      expect(complexType.choice).toBeDefined();
      expect(complexType.sequence).toBeUndefined();
    });

    it("updates the mixed flag on an anonymous complexType", () => {
      const schemaObj = schemaWith(`
  <xs:element name="text"><xs:complexType><xs:sequence/></xs:complexType></xs:element>`);

      modifyComplexType(schemaObj, {
        typeId: "/element:text/anonymousComplexType[0]",
        mixed: true,
      });

      expect(topLevelElements(schemaObj)[0].complexType!.mixed).toBe(true);
    });

    it("adds a base type to an anonymous complexType", () => {
      const schemaObj = schemaWith(`
  <xs:element name="employee"><xs:complexType><xs:sequence/></xs:complexType></xs:element>`);

      modifyComplexType(schemaObj, {
        typeId: "/element:employee/anonymousComplexType[0]",
        baseType: "PersonType",
      });

      const extension = topLevelElements(schemaObj)[0].complexType!.complexContent!.extension!;
      expect(extension.base).toBe("PersonType");
      expect(extension.sequence).toBeDefined();
    });

    it("switches an anonymous complexType to a restriction without dropping its content", () => {
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

      const restriction = topLevelElements(schemaObj)[0].complexType!.complexContent!.restriction!;
      expect(restriction.base).toBe("PersonType");
      expect(toArray(restriction.sequence?.element)[0].name).toBe("name");
    });

    it("updates documentation on an anonymous complexType", () => {
      const schemaObj = schemaWith(`
  <xs:element name="order"><xs:complexType><xs:sequence/></xs:complexType></xs:element>`);

      modifyComplexType(schemaObj, {
        typeId: "/element:order/anonymousComplexType[0]",
        documentation: "Represents an order.",
      });

      expect(topLevelElements(schemaObj)[0].complexType!.annotation!.documentation![0].value).toBe(
        "Represents an order."
      );
    });
  });

  describe("executeModifyComplexType — reference propagation", () => {
    it("renames element/@type references when a top-level complexType is renamed", () => {
      const schemaObj = schemaWith(`
  <xs:complexType name="PersonType"><xs:sequence/></xs:complexType>
  <xs:element name="person" type="PersonType"/>`);

      modifyComplexType(schemaObj, {
        typeId: "/complexType:PersonType",
        typeName: "HumanType",
      });

      expect(topLevelComplexTypes(schemaObj)[0].name).toBe("HumanType");
      expect(topLevelElements(schemaObj)[0].type_).toBe("HumanType");
    });

    it("renames extension/@base references when a top-level complexType is renamed", () => {
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
