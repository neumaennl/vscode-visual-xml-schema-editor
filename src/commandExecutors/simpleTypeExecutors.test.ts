/**
 * Unit tests for simpleType executors.
 * Tests the implementation of add, remove, and modify simple type execution logic.
 */

import { marshal, unmarshal } from "@neumaennl/xmlbind-ts";
import {
  AddSimpleTypeCommand,
  ModifySimpleTypeCommand,
  RemoveSimpleTypeCommand,
  localSimpleType,
  RestrictionFacets,
  schema,
  topLevelAttribute,
  topLevelElement,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import {
  executeAddSimpleType,
  executeModifySimpleType,
  executeRemoveSimpleType,
} from "./simpleTypeExecutors";

function schemaWith(body = ""): schema {
  return unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">${body}</xs:schema>`
  );
}

function addSimpleType(schemaObj: schema, payload: AddSimpleTypeCommand["payload"]): void {
  executeAddSimpleType({ type: "addSimpleType", payload }, schemaObj);
}

function removeSimpleType(schemaObj: schema, payload: RemoveSimpleTypeCommand["payload"]): void {
  executeRemoveSimpleType({ type: "removeSimpleType", payload }, schemaObj);
}

function modifySimpleType(schemaObj: schema, payload: ModifySimpleTypeCommand["payload"]): void {
  executeModifySimpleType({ type: "modifySimpleType", payload }, schemaObj);
}

function simpleTypes(schemaObj: schema): NonNullable<schema["simpleType"]> {
  return toArray(schemaObj.simpleType);
}

function elements(schemaObj: schema): NonNullable<schema["element"]> {
  return toArray(schemaObj.element);
}

function attributes(schemaObj: schema): NonNullable<schema["attribute"]> {
  return toArray(schemaObj.attribute);
}

function complexTypes(schemaObj: schema): NonNullable<schema["complexType"]> {
  return toArray(schemaObj.complexType);
}

// `simpleTypes(schemaObj)[number]["restriction"]` is a generated property type that
// includes `undefined` and varies with the surrounding helper return type. This alias
// peels the type out of the actual `simpleTypes()` helper and removes `undefined` so
// the table-driven facet assertions stay strongly typed without repeating the long
// indexed-access expression at every case definition.
type RestrictionAssert = (
  restriction: NonNullable<ReturnType<typeof simpleTypes>[number]["restriction"]>
) => void;

describe("SimpleType Executors", () => {
  describe("executeAddSimpleType", () => {
    it("adds a named simpleType with base type only and serializes back to valid XSD", () => {
      const schemaObj = schemaWith();

      addSimpleType(schemaObj, { typeName: "NameType", baseType: "xs:string" });

      const added = simpleTypes(schemaObj)[0];
      expect(added.name).toBe("NameType");
      expect(added.restriction!.base).toBe("xs:string");

      const reparsed = unmarshal(schema, marshal(schemaObj));
      expect(simpleTypes(reparsed)[0].name).toBe("NameType");
      expect(simpleTypes(reparsed)[0].restriction!.base).toBe("xs:string");
    });

    it("adds documentation and appends after existing top-level simple types", () => {
      const schemaObj = schemaWith(`
  <xs:simpleType name="ExistingType">
    <xs:restriction base="xs:string"/>
  </xs:simpleType>`);

      addSimpleType(schemaObj, {
        typeName: "AgeType",
        baseType: "xs:integer",
        documentation: "Represents a person's age",
      });

      expect(simpleTypes(schemaObj)).toHaveLength(2);
      expect(simpleTypes(schemaObj)[0].name).toBe("ExistingType");
      expect(simpleTypes(schemaObj)[1].name).toBe("AgeType");
      expect(simpleTypes(schemaObj)[1].annotation!.documentation![0].value).toBe(
        "Represents a person's age"
      );
    });

    // Keep the shared assertion signature separate so the facet case table remains readable.
    const addFacetCases: Array<{
      name: string;
      typeName: string;
      baseType: string;
      restrictions: RestrictionFacets;
      assert: RestrictionAssert;
    }> = [
      {
        name: "min/max inclusive facets",
        typeName: "AgeType",
        baseType: "xs:integer",
        restrictions: { minInclusive: "0", maxInclusive: "120" },
        assert: (restriction): void => {
          expect(restriction.minInclusive![0].value).toBe("0");
          expect(restriction.maxInclusive![0].value).toBe("120");
        },
      },
      {
        name: "min/max exclusive facets",
        typeName: "PositiveType",
        baseType: "xs:decimal",
        restrictions: { minExclusive: "0", maxExclusive: "100" },
        assert: (restriction): void => {
          expect(restriction.minExclusive![0].value).toBe("0");
          expect(restriction.maxExclusive![0].value).toBe("100");
        },
      },
      {
        name: "length facets",
        typeName: "CodeType",
        baseType: "xs:string",
        restrictions: { length: 5, minLength: 1, maxLength: 255 },
        assert: (restriction): void => {
          expect(restriction.length![0].value).toBe(5);
          expect(restriction.minLength![0].value).toBe(1);
          expect(restriction.maxLength![0].value).toBe(255);
        },
      },
      {
        name: "digit facets",
        typeName: "PriceType",
        baseType: "xs:decimal",
        restrictions: { totalDigits: 8, fractionDigits: 2 },
        assert: (restriction): void => {
          expect(restriction.totalDigits![0].value).toBe(8);
          expect(restriction.fractionDigits![0].value).toBe(2);
        },
      },
      {
        name: "pattern facet",
        typeName: "PhoneType",
        baseType: "xs:string",
        restrictions: { pattern: "[0-9]{10}" },
        assert: (restriction): void => {
          expect(restriction.pattern![0].value).toBe("[0-9]{10}");
        },
      },
      {
        name: "enumeration facet",
        typeName: "ColorType",
        baseType: "xs:string",
        restrictions: { enumeration: ["red", "green", "blue"] },
        assert: (restriction): void => {
          expect(restriction.enumeration).toHaveLength(3);
          expect(restriction.enumeration!.map((value) => value.value)).toEqual(["red", "green", "blue"]);
        },
      },
      {
        name: "whiteSpace facet",
        typeName: "NormalizedType",
        baseType: "xs:string",
        restrictions: { whiteSpace: "collapse" },
        assert: (restriction): void => {
          expect(restriction.whiteSpace![0].value).toBe("collapse");
        },
      },
    ];

    it.each(addFacetCases)("applies $name", ({ typeName, baseType, restrictions, assert }) => {
      expect.hasAssertions();
      const schemaObj = schemaWith();

      addSimpleType(schemaObj, { typeName, baseType, restrictions });

      assert(simpleTypes(schemaObj)[0].restriction!);
    });
  });

  describe("executeRemoveSimpleType", () => {
    it("removes a targeted top-level simpleType and leaves others intact", () => {
      const schemaObj = schemaWith(`
  <xs:simpleType name="AgeType"><xs:restriction base="xs:integer"/></xs:simpleType>
  <xs:simpleType name="NameType"><xs:restriction base="xs:string"/></xs:simpleType>`);

      removeSimpleType(schemaObj, { typeId: "/simpleType:AgeType" });

      expect(simpleTypes(schemaObj)).toHaveLength(1);
      expect(simpleTypes(schemaObj)[0].name).toBe("NameType");
    });

    it("removes the last remaining top-level simpleType", () => {
      const schemaObj = schemaWith(`
  <xs:simpleType name="AgeType"><xs:restriction base="xs:integer"/></xs:simpleType>`);

      removeSimpleType(schemaObj, { typeId: "/simpleType:AgeType" });

      expect(schemaObj.simpleType).toBeUndefined();
    });
  });

  describe("executeModifySimpleType", () => {
    it("renames a top-level simpleType", () => {
      const schemaObj = schemaWith(`
  <xs:simpleType name="AgeType"><xs:restriction base="xs:integer"/></xs:simpleType>`);

      modifySimpleType(schemaObj, { typeId: "/simpleType:AgeType", typeName: "PersonAgeType" });

      expect(simpleTypes(schemaObj)[0].name).toBe("PersonAgeType");
    });

    it("updates the base type and documentation", () => {
      const schemaObj = schemaWith(`
  <xs:simpleType name="AgeType"><xs:restriction base="xs:integer"/></xs:simpleType>`);

      modifySimpleType(schemaObj, {
        typeId: "/simpleType:AgeType",
        baseType: "xs:positiveInteger",
        documentation: "A person's age in years",
      });

      const simpleType = simpleTypes(schemaObj)[0];
      expect(simpleType.restriction!.base).toBe("xs:positiveInteger");
      expect(simpleType.annotation!.documentation![0].value).toBe("A person's age in years");
    });

    const modifySimpleTypeFacetCases = [
      {
        name: "replaces scalar facets",
        source: `<xs:simpleType name="AgeType"><xs:restriction base="xs:integer"><xs:minInclusive value="0"/></xs:restriction></xs:simpleType>`,
        payload: { restrictions: { minInclusive: "0", maxInclusive: "150" } },
        assert: (schemaObj: schema): void => {
          const restriction = simpleTypes(schemaObj)[0].restriction!;
          expect(restriction.minInclusive![0].value).toBe("0");
          expect(restriction.maxInclusive![0].value).toBe("150");
        },
      },
      {
        name: "clears existing facets when given an empty restrictions object",
        source: `<xs:simpleType name="AgeType"><xs:restriction base="xs:integer"><xs:minInclusive value="0"/></xs:restriction></xs:simpleType>`,
        payload: { restrictions: {} },
        assert: (schemaObj: schema): void => {
          expect(simpleTypes(schemaObj)[0].restriction!.minInclusive).toBeUndefined();
        },
      },
      {
        name: "replaces enumeration values",
        source: `<xs:simpleType name="ColorType"><xs:restriction base="xs:string"><xs:enumeration value="red"/></xs:restriction></xs:simpleType>`,
        payload: { restrictions: { enumeration: ["red", "green", "blue"] } },
        assert: (schemaObj: schema): void => {
          expect(simpleTypes(schemaObj)[0].restriction!.enumeration!.map((value) => value.value)).toEqual([
            "red",
            "green",
            "blue",
          ]);
        },
      },
      {
        name: "creates a restriction when only baseType is supplied",
        source: `<xs:simpleType name="UnionType"><xs:union memberTypes="xs:string xs:integer"/></xs:simpleType>`,
        payload: { baseType: "xs:string" },
        assert: (schemaObj: schema): void => {
          expect(simpleTypes(schemaObj)[0].restriction!.base).toBe("xs:string");
        },
      },
    ];

    it.each(modifySimpleTypeFacetCases)("$name", ({ source, payload, assert }) => {
      const schemaObj = schemaWith(source);
      const typeName = simpleTypes(schemaObj)[0].name;

      modifySimpleType(schemaObj, { typeId: `/simpleType:${typeName}`, ...payload });

      expect(simpleTypes(schemaObj)[0].restriction).toBeDefined();
      assert(schemaObj);
    });
  });

  describe("anonymous simpleType executors", () => {
    const inlineCases = [
      {
        label: "top-level element",
        source: `<xs:element name="age"/>`,
        parentId: "/element:age",
        getSimpleType: (schemaObj: schema): localSimpleType => elements(schemaObj)[0].simpleType!,
      },
      {
        label: "top-level attribute",
        source: `<xs:attribute name="color"/>`,
        parentId: "/attribute:color",
        getSimpleType: (schemaObj: schema): localSimpleType => attributes(schemaObj)[0].simpleType!,
      },
      {
        label: "attribute inside complexType",
        source: `<xs:complexType name="PersonType"><xs:attribute name="gender"/></xs:complexType>`,
        parentId: "/complexType:PersonType/attribute:gender",
        getSimpleType: (schemaObj: schema): localSimpleType =>
          toArray(complexTypes(schemaObj)[0].attribute)[0].simpleType!,
      },
    ];

    it.each(inlineCases)("adds an anonymous simpleType inside $label", ({ source, parentId, getSimpleType }) => {
      const schemaObj = schemaWith(source);

      addSimpleType(schemaObj, {
        parentId,
        baseType: "xs:string",
        restrictions: { enumeration: ["red", "green", "blue"] },
      });

      const simpleType = getSimpleType(schemaObj);
      expect(simpleType.restriction!.base).toBe("xs:string");
      expect(simpleType.restriction!.enumeration).toHaveLength(3);
    });

    it("adds documentation to an anonymous simpleType on an element and keeps serialization valid", () => {
      const schemaObj = schemaWith(`<xs:element name="age"/>`);

      addSimpleType(schemaObj, {
        parentId: "/element:age",
        baseType: "xs:integer",
        restrictions: { minInclusive: "0", maxInclusive: "120" },
        documentation: "Allowed age values",
      });

      const element = elements(schemaObj)[0];
      expect(element.simpleType!.annotation!.documentation![0].value).toBe("Allowed age values");
      expect(element.simpleType!.restriction!.maxInclusive![0].value).toBe("120");

      const reparsed = unmarshal(schema, marshal(schemaObj));
      expect(elements(reparsed)[0].simpleType!.restriction!.base).toBe("xs:integer");
    });

    it("replaces an existing type attribute when adding an anonymous simpleType", () => {
      const schemaObj = schemaWith(`<xs:element name="status" type="xs:string"/>`);

      addSimpleType(schemaObj, {
        parentId: "/element:status",
        baseType: "xs:token",
      });

      const element = elements(schemaObj)[0];
      expect(element.type_).toBeUndefined();
      expect(element.simpleType?.restriction?.base).toBe("xs:token");
    });

    it("replaces an existing anonymous complexType when adding an anonymous simpleType", () => {
      const schemaObj = schemaWith(`
  <xs:element name="status">
    <xs:complexType>
      <xs:sequence/>
    </xs:complexType>
  </xs:element>`);

      addSimpleType(schemaObj, {
        parentId: "/element:status",
        baseType: "xs:token",
      });

      const element = elements(schemaObj)[0];
      expect(element.complexType).toBeUndefined();
      expect(element.simpleType?.restriction?.base).toBe("xs:token");
    });

    const removeAnonymousSimpleTypeCases = [
      {
        label: "element",
        source: `<xs:element name="age"><xs:simpleType><xs:restriction base="xs:integer"/></xs:simpleType></xs:element>`,
        typeId: "/element:age/anonymousSimpleType[0]",
        getHolder: (schemaObj: schema): topLevelElement => elements(schemaObj)[0],
      },
      {
        label: "attribute",
        source: `<xs:attribute name="color"><xs:simpleType><xs:restriction base="xs:string"><xs:enumeration value="red"/></xs:restriction></xs:simpleType></xs:attribute>`,
        typeId: "/attribute:color/anonymousSimpleType[0]",
        getHolder: (schemaObj: schema): topLevelAttribute => attributes(schemaObj)[0],
      },
    ];

    it.each(removeAnonymousSimpleTypeCases)(
      "removes an anonymous simpleType from a $label",
      ({ source, typeId, getHolder }) => {
        const schemaObj = schemaWith(source);

        removeSimpleType(schemaObj, { typeId });

        expect(getHolder(schemaObj).simpleType).toBeUndefined();
      }
    );

    const updateAnonymousSimpleTypeCases = [
      {
        label: "element",
        source: `<xs:element name="age"><xs:simpleType><xs:restriction base="xs:integer"><xs:minInclusive value="0"/></xs:restriction></xs:simpleType></xs:element>`,
        typeId: "/element:age/anonymousSimpleType[0]",
        getSimpleType: (schemaObj: schema): localSimpleType => elements(schemaObj)[0].simpleType!,
      },
      {
        label: "attribute",
        source: `<xs:attribute name="score"><xs:simpleType><xs:restriction base="xs:integer"/></xs:simpleType></xs:attribute>`,
        typeId: "/attribute:score/anonymousSimpleType[0]",
        getSimpleType: (schemaObj: schema): localSimpleType => attributes(schemaObj)[0].simpleType!,
      },
    ];

    it.each(updateAnonymousSimpleTypeCases)(
      "updates base type and facets for an anonymous simpleType on a $label",
      ({ source, typeId, getSimpleType }) => {
        const schemaObj = schemaWith(source);

        modifySimpleType(schemaObj, {
          typeId,
          baseType: "xs:positiveInteger",
          restrictions: { minInclusive: "1", maxInclusive: "100" },
        });

        const simpleType = getSimpleType(schemaObj);
        expect(simpleType.restriction!.base).toBe("xs:positiveInteger");
        expect(simpleType.restriction!.minInclusive![0].value).toBe("1");
        expect(simpleType.restriction!.maxInclusive![0].value).toBe("100");
      }
    );

    it("adds documentation to an anonymous simpleType on an element", () => {
      const schemaObj = schemaWith(`
  <xs:element name="age">
    <xs:simpleType><xs:restriction base="xs:integer"/></xs:simpleType>
  </xs:element>`);

      modifySimpleType(schemaObj, {
        typeId: "/element:age/anonymousSimpleType[0]",
        documentation: "Age in years",
      });

      expect(elements(schemaObj)[0].simpleType!.annotation!.documentation![0].value).toBe("Age in years");
    });
  });

  describe("executeModifySimpleType — reference propagation", () => {
    const renameReferenceCases = [
      {
        name: "element/@type",
        source: `
  <xs:simpleType name="StatusType"><xs:restriction base="xs:string"/></xs:simpleType>
  <xs:element name="status" type="StatusType"/>`,
        assert: (schemaObj: schema): void => expect(elements(schemaObj)[0].type_).toBe("StateType"),
      },
      {
        name: "attribute/@type",
        source: `
  <xs:simpleType name="CodeType"><xs:restriction base="xs:string"/></xs:simpleType>
  <xs:attribute name="code" type="CodeType"/>`,
        oldName: "CodeType",
        newName: "IdentifierType",
        assert: (schemaObj: schema): void => expect(attributes(schemaObj)[0].type_).toBe("IdentifierType"),
      },
      {
        name: "restriction/@base",
        source: `
  <xs:simpleType name="BaseType"><xs:restriction base="xs:string"/></xs:simpleType>
  <xs:simpleType name="DerivedType"><xs:restriction base="BaseType"><xs:maxLength value="50"/></xs:restriction></xs:simpleType>`,
        oldName: "BaseType",
        newName: "RootType",
        assert: (schemaObj: schema): void =>
          expect(
            simpleTypes(schemaObj).find((simpleType) => simpleType.name === "DerivedType")!.restriction!.base
          ).toBe("RootType"),
      },
      {
        name: "unprefixed references only",
        source: `
  <xs:simpleType name="StatusType"><xs:restriction base="xs:string"/></xs:simpleType>
  <xs:element name="a" type="StatusType"/>
  <xs:element name="b" type="xs:StatusType"/>`,
        assert: (schemaObj: schema): void => {
          const [first, second] = elements(schemaObj);
          expect(first.type_).toBe("StateType");
          expect(second.type_).toBe("xs:StatusType");
        },
      },
    ];

    it.each(renameReferenceCases)(
      "renames references in $name",
      ({ source, oldName = "StatusType", newName = "StateType", assert }) => {
        const schemaObj = schemaWith(source);

        modifySimpleType(schemaObj, { typeId: `/simpleType:${oldName}`, typeName: newName });

        expect(simpleTypes(schemaObj).find((simpleType) => simpleType.name === newName)).toBeDefined();
        assert(schemaObj);
      }
    );
  });
});
