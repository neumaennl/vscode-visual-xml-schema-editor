/**
 * Unit tests for `DropCommandFactory`.
 * Verifies that drag-and-drop actions produce the correct schema commands.
 */

import { DropCommandFactory } from "./DropCommandFactory";
import { DiagramItem } from "../diagram/DiagramItem";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { DraggableSchemaConstruct } from "./DraggableSchemaConstruct";
import { compositorNodeType, SchemaNodeType } from "../../shared/idStrategy";
import { diagramItem, emptyDiagram, NOT_READ_SCHEMA_OBJECT, component } from "../__tests__/diagramTestHelpers";
import {
  DERIVATIONS,
  derivedComplexTypeT,
  webviewSchemaFromXml,
  webviewSchemaWith,
} from "../../shared/__tests__/schemaTestHelpers";
import { XSD_NAMESPACE } from "../../shared/builtInTypes";
import { Diagram } from "../diagram/Diagram";
import { COMPOSITORS } from "../../shared/types";

/** The item type that the diagram builder gives each kind of node in these tests. */
const ITEM_TYPES: Partial<Record<SchemaNodeType, DiagramItemType>> = {
  [SchemaNodeType.Schema]: DiagramItemType.element,
  [SchemaNodeType.Element]: DiagramItemType.element,
  [SchemaNodeType.ComplexType]: DiagramItemType.type,
  [SchemaNodeType.SimpleType]: DiagramItemType.type,
  [SchemaNodeType.Group]: DiagramItemType.group,
  [SchemaNodeType.GroupRef]: DiagramItemType.group,
  [SchemaNodeType.Sequence]: DiagramItemType.compositor,
  [SchemaNodeType.Choice]: DiagramItemType.compositor,
  [SchemaNodeType.All]: DiagramItemType.compositor,
};

/**
 * Creates a diagram item whose name is the last part of its ID, with the node type and the item type that
 * the diagram builder gives it.
 *
 * @param id - The ID of the item
 * @param nodeType - The kind of schema construct that the item shows
 * @param overrides - The fields to set on the item
 * @returns The item
 */
function makeItem(id: string, nodeType: SchemaNodeType, overrides: Partial<DiagramItem> = {}): DiagramItem {
  const item = new DiagramItem(
    id,
    id.split(":").pop() ?? id,
    ITEM_TYPES[nodeType] ?? DiagramItemType.group,
    NOT_READ_SCHEMA_OBJECT,
    emptyDiagram()
  );
  item.nodeType = nodeType;
  Object.assign(item, overrides);
  return item;
}

/** The fields of a payload that hold a generated name. */
const NAME_FIELDS = ["elementName", "attributeName", "typeName", "groupName"];

/**
 * Drops a schema construct on the schema root and returns the name that the command generated.
 *
 * @param factory - The factory
 * @param schemaConstruct - The dropped schema construct
 * @returns The generated name, or undefined if the command has none
 */
function generatedName(factory: DropCommandFactory, schemaConstruct: DraggableSchemaConstruct): string | undefined {
  const payload = (factory.createNodeDropCommand(ROOT, schemaConstruct) as { payload: Record<string, unknown> } | null)
    ?.payload;
  const field = NAME_FIELDS.find((name) => typeof payload?.[name] === "string");
  return field === undefined ? undefined : (payload?.[field] as string);
}

const C = DraggableSchemaConstruct;

/** A drop that creates a command: the case, the target, the dropped schema construct and the expected command. */
type AcceptedDrop = [string, DiagramItem, DraggableSchemaConstruct, object];

/** A drop that is rejected: the case, the target and the dropped schema construct. */
type RejectedDrop = [string, DiagramItem, DraggableSchemaConstruct];

/** The schema root. */
const ROOT = makeItem("/schema", SchemaNodeType.Schema);
/** An element without inline type. */
const PERSON = makeItem("/element:person", SchemaNodeType.Element, {
  schemaObject: component(`<xs:element name="person"/>`),
});
/** An element with an inline complex type. */
const PERSON_WITH_COMPLEX_TYPE = makeItem("/element:person", SchemaNodeType.Element, {
  schemaObject: component(`<xs:element name="person"><xs:complexType/></xs:element>`),
});
/** An element with an inline simple type. */
const PERSON_WITH_SIMPLE_TYPE = makeItem("/element:person", SchemaNodeType.Element, {
  schemaObject: component(`<xs:element name="person"><xs:simpleType><xs:restriction/></xs:simpleType></xs:element>`),
});
/** A sequence in an element. */
const SEQUENCE = makeItem("/element:person/anonymousComplexType[0]/sequence[0]", SchemaNodeType.Sequence);
/** A top-level group. */
const GROUP = makeItem("/group:G", SchemaNodeType.Group);
/** A complex type without base. */
const CHOICE_TYPE = makeItem("/complexType:ChoiceType", SchemaNodeType.ComplexType, {
  schemaObject: component(`<xs:complexType name="ChoiceType"><xs:choice/></xs:complexType>`),
});
/** A simple type. */
const SIMPLE_TYPE = makeItem("/simpleType:S", SchemaNodeType.SimpleType, {
  schemaObject: component(`<xs:simpleType name="S"><xs:restriction/></xs:simpleType>`),
});
/** An element with an inline complex type that extends `BasePersonType`. */
const PERSON_EXTENDING_BASE = makeItem("/element:person", SchemaNodeType.Element, {
  schemaObject: component(`<xs:element name="person"><xs:complexType><xs:complexContent>
  <xs:extension base="BasePersonType"/>
</xs:complexContent></xs:complexType></xs:element>`),
});

describe("DropCommandFactory", () => {
  let factory: DropCommandFactory;

  beforeEach(() => {
    factory = new DropCommandFactory();
  });

  describe("createNodeDropCommand on the schema root", () => {
    test.each([
      [C.Element, { type: "addElement", payload: { parentId: "/schema", elementName: "Element1" } }],
      [C.Attribute, { type: "addAttribute", payload: { parentId: "/schema", attributeName: "Attribute1" } }],
      [C.SimpleType, { type: "addSimpleType", payload: { parentId: "/schema", typeName: "SimpleType1" } }],
      [C.ComplexType, { type: "addComplexType", payload: { parentId: "/schema", typeName: "ComplexType1" } }],
      [
        C.Restriction,
        { type: "addSimpleType", payload: { parentId: "/schema", typeName: "SimpleType1", baseType: "xs:string" } },
      ],
      [
        C.Extension,
        { type: "addComplexType", payload: { parentId: "/schema", typeName: "ComplexType1", baseType: "xs:anyType" } },
      ],
      [C.Group, { type: "addGroup", payload: { groupName: "Group1" } }],
    ])("should create the command for %s", (schemaConstruct, expected) => {
      expect(factory.createNodeDropCommand(ROOT, schemaConstruct)).toMatchObject(expected);
    });

    test("should return null for unsupported top-level schema construct", () => {
      expect(factory.createNodeDropCommand(ROOT, C.Any)).toBeNull();
    });
  });

  describe("createNodeDropCommand in a schema with the prefix xsd for XML Schema", () => {
    /**
     * Returns the schema root of a schema that declares the namespace of XML Schema as `xsd`.
     *
     * @returns The item
     */
    const xsdRoot = (): DiagramItem =>
      makeItem("/schema", SchemaNodeType.Schema, {
        diagram: new Diagram(webviewSchemaFromXml(`<xsd:schema xmlns:xsd="${XSD_NAMESPACE}"/>`)),
      });

    test.each([
      [C.Element, "elementType", "xsd:string"],
      [C.Attribute, "attributeType", "xsd:string"],
      [C.Restriction, "baseType", "xsd:string"],
      [C.Extension, "baseType", "xsd:anyType"],
    ])(
      "should write the built-in type of a dropped %s with the prefix of the schema",
      (schemaConstruct, field, type) => {
        expect(factory.createNodeDropCommand(xsdRoot(), schemaConstruct)?.payload).toMatchObject({ [field]: type });
      }
    );
  });

  describe("createNodeDropCommand", () => {
    test.each<AcceptedDrop>([
      ["an element on the schema root", ROOT, C.Element, { type: "addElement", payload: { parentId: "/schema" } }],
      ...COMPOSITORS.map((compositor): AcceptedDrop => [
        `an element on a ${compositor}`,
        makeItem(`/complexType:T/${compositor}[0]`, compositorNodeType(compositor)),
        C.Element,
        { type: "addElement" },
      ]),
      [
        "an attribute on the schema root",
        ROOT,
        C.Attribute,
        { type: "addAttribute", payload: { parentId: "/schema" } },
      ],
      [
        "an attribute on a named complexType",
        makeItem("/complexType:PersonType", SchemaNodeType.ComplexType, {
          schemaObject: component(`<xs:complexType name="PersonType"/>`),
        }),
        C.Attribute,
        { type: "addAttribute", payload: { parentId: "/complexType:PersonType" } },
      ],
      [
        "an attribute on the anonymous complexType of an element",
        PERSON_WITH_COMPLEX_TYPE,
        C.Attribute,
        { type: "addAttribute", payload: { parentId: "/element:person/anonymousComplexType[0]" } },
      ],
      [
        "a simpleType on the schema root",
        ROOT,
        C.SimpleType,
        { type: "addSimpleType", payload: { parentId: "/schema", typeName: "SimpleType1" } },
      ],
      [
        "a complexType on the schema root",
        ROOT,
        C.ComplexType,
        { type: "addComplexType", payload: { parentId: "/schema", typeName: "ComplexType1" } },
      ],
      ["a group on the schema root", ROOT, C.Group, { type: "addGroup", payload: { groupName: "Group1" } }],
      [
        "an anonymous simpleType restriction on a typed element",
        makeItem("/element:code", SchemaNodeType.Element, {
          schemaObject: component(`<xs:element name="code" type="CustomerCodeType"/>`),
        }),
        C.Restriction,
        { type: "addSimpleType", payload: { parentId: "/element:code", baseType: "CustomerCodeType" } },
      ],
      [
        "a restriction that modifies an inline simpleType in place",
        makeItem("/element:code", SchemaNodeType.Element, {
          schemaObject: component(
            `<xs:element name="code"><xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType></xs:element>`
          ),
        }),
        C.Restriction,
        {
          type: "modifySimpleType",
          payload: { typeId: "/element:code/anonymousSimpleType[0]", baseType: "xs:string" },
        },
      ],
      [
        "a restriction that modifies an inline complexType in place",
        PERSON_EXTENDING_BASE,
        C.Restriction,
        {
          type: "modifyComplexType",
          payload: {
            typeId: "/element:person/anonymousComplexType[0]",
            baseType: "BasePersonType",
            derivationKind: "restriction",
          },
        },
      ],
      [
        "a restriction that modifies a named complexType in place",
        makeItem("/complexType:PersonType", SchemaNodeType.ComplexType, {
          schemaObject: component(`<xs:complexType name="PersonType"><xs:complexContent>
  <xs:extension base="BasePersonType"/>
</xs:complexContent></xs:complexType>`),
        }),
        C.Restriction,
        {
          type: "modifyComplexType",
          payload: { typeId: "/complexType:PersonType", baseType: "BasePersonType", derivationKind: "restriction" },
        },
      ],
      [
        "a restriction of xs:anyType when no base can be inferred",
        CHOICE_TYPE,
        C.Restriction,
        {
          type: "modifyComplexType",
          payload: { typeId: "/complexType:ChoiceType", baseType: "xs:anyType", derivationKind: "restriction" },
        },
      ],
      [
        "an anonymous complexType extension on a typed element",
        makeItem("/element:person", SchemaNodeType.Element, {
          schemaObject: component(`<xs:element name="person" type="PersonType"/>`),
        }),
        C.Extension,
        {
          type: "addComplexType",
          payload: {
            parentId: "/element:person",
            baseType: "PersonType",
            compositor: "sequence",
            derivationKind: "extension",
          },
        },
      ],
      [
        "an extension that modifies an inline complexType in place",
        PERSON_EXTENDING_BASE,
        C.Extension,
        {
          type: "modifyComplexType",
          payload: {
            typeId: "/element:person/anonymousComplexType[0]",
            baseType: "BasePersonType",
            derivationKind: "extension",
          },
        },
      ],
      [
        "an extension of xs:anyType when no base can be inferred",
        CHOICE_TYPE,
        C.Extension,
        {
          type: "modifyComplexType",
          payload: { typeId: "/complexType:ChoiceType", baseType: "xs:anyType", derivationKind: "extension" },
        },
      ],
    ])("should create %s", (_case, item, schemaConstruct, expected) => {
      expect(factory.createNodeDropCommand(item, schemaConstruct)).toMatchObject(expected);
    });

    test.each(DERIVATIONS)("should create an attribute on a named complexType with %s %s", (content, derivation) => {
      const item = diagramItem(webviewSchemaWith(derivedComplexTypeT(content, derivation)), "/complexType:T");

      const cmd = factory.createNodeDropCommand(item, C.Attribute);

      expect(cmd).toMatchObject({ type: "addAttribute", payload: { parentId: "/complexType:T" } });
    });

    test.each([
      ["a simpleType on an element", PERSON, C.SimpleType, "addSimpleType"],
      [
        "a simpleType that replaces the inline complexType of an element",
        PERSON_WITH_COMPLEX_TYPE,
        C.SimpleType,
        "addSimpleType",
      ],
      ["a complexType on an element", PERSON, C.ComplexType, "addComplexType"],
      [
        "a complexType that replaces the inline simpleType of an element",
        PERSON_WITH_SIMPLE_TYPE,
        C.ComplexType,
        "addComplexType",
      ],
    ])("should create %s, with the element as parent and without typeName", (_case, item, schemaConstruct, type) => {
      const cmd = factory.createNodeDropCommand(item, schemaConstruct);

      expect(cmd).toMatchObject({ type, payload: { parentId: "/element:person" } });
      expect((cmd as { payload: { typeName?: string } }).payload.typeName).toBeUndefined();
    });

    test.each([
      [
        "a choice on a named complexType",
        makeItem("/complexType:PersonType", SchemaNodeType.ComplexType, {
          schemaObject: component(`<xs:complexType name="PersonType"/>`),
        }),
        C.Choice,
        {
          type: "modifyComplexType",
          payload: { typeId: "/complexType:PersonType", compositor: "choice" },
        },
      ],
      [
        "an all on the anonymous complexType of an element",
        PERSON_WITH_COMPLEX_TYPE,
        C.All,
        {
          type: "modifyComplexType",
          payload: { typeId: "/element:person/anonymousComplexType[0]", compositor: "all" },
        },
      ],
      [
        "a sequence on a plain element",
        PERSON,
        C.Sequence,
        {
          type: "addComplexType",
          payload: { parentId: "/element:person", compositor: "sequence" },
        },
      ],
      [
        "a choice on a top-level group",
        makeItem("/group:PeopleGroup", SchemaNodeType.Group),
        C.Choice,
        {
          type: "modifyGroup",
          payload: { groupId: "/group:PeopleGroup", compositor: "choice" },
        },
      ],
    ])("should set the compositor for %s", (_case, item, schemaConstruct, expected) => {
      expect(factory.createNodeDropCommand(item, schemaConstruct)).toEqual(expected);
    });

    test.each<AcceptedDrop>([
      [
        "a choice on a sequence",
        SEQUENCE,
        C.Choice,
        { type: "addCompositor", payload: { parentId: SEQUENCE.id, compositor: "choice" } },
      ],
      [
        "a sequence on a choice",
        makeItem("/complexType:T/choice[0]", SchemaNodeType.Choice),
        C.Sequence,
        { type: "addCompositor", payload: { parentId: "/complexType:T/choice[0]", compositor: "sequence" } },
      ],
    ])("should add a compositor for %s", (_case, item, schemaConstruct, expected) => {
      expect(factory.createNodeDropCommand(item, schemaConstruct)).toEqual(expected);
    });

    test.each<RejectedDrop>([
      ["an element on a simpleType", SIMPLE_TYPE, C.Element],
      // Elements go into the compositor of a group definition, not into the definition or a reference
      ["an element on a group definition", GROUP, C.Element],
      [
        "an element on a group reference",
        makeItem("/complexType:T/sequence[0]/groupRef:G[0]", SchemaNodeType.GroupRef),
        C.Element,
      ],
      ["an attribute on a plain element", PERSON, C.Attribute],
      ["an attribute on a sequence", SEQUENCE, C.Attribute],
      ["an attribute on a simpleType", SIMPLE_TYPE, C.Attribute],
      ["a simpleType on a group", GROUP, C.SimpleType],
      ["a complexType on a group", GROUP, C.ComplexType],
      [
        "a group on a complexType",
        makeItem("/complexType:C", SchemaNodeType.ComplexType, {
          schemaObject: component(`<xs:complexType name="C"/>`),
        }),
        C.Group,
      ],
      // XML Schema allows no all in a sequence or a choice, and no compositor in an all
      ["an all on a sequence", SEQUENCE, C.All],
      ...[C.Sequence, C.Choice, C.All].map((schemaConstruct): RejectedDrop => [
        `a ${schemaConstruct} on an all`,
        makeItem("/complexType:T/all[0]", SchemaNodeType.All),
        schemaConstruct,
      ]),
      ...(["list", "union"] as const).map((kind): RejectedDrop => [
        `a facet on a ${kind} simpleType`,
        makeItem("/simpleType:Values", SchemaNodeType.SimpleType, {
          schemaObject: component(`<xs:simpleType name="Values"><xs:${kind}/></xs:simpleType>`),
        }),
        C.Enumeration,
      ]),
    ])("should reject %s", (_case, item, schemaConstruct) => {
      expect(factory.createNodeDropCommand(item, schemaConstruct)).toBeNull();
      expect(factory.canDropOnNode(item, schemaConstruct)).toBe(false);
    });
  });

  describe("createNodeDropCommand — facets", () => {
    test("should add a default facet to a restriction simpleType", () => {
      const item = makeItem("/simpleType:Status", SchemaNodeType.SimpleType, {
        schemaObject: component(
          `<xs:simpleType name="Status"><xs:restriction base="xs:string"><xs:enumeration value="active"/></xs:restriction></xs:simpleType>`
        ),
      });

      const command = factory.createNodeDropCommand(item, C.MinLength);

      expect(command).toEqual({
        type: "modifySimpleType",
        payload: {
          typeId: "/simpleType:Status",
          baseType: "xs:string",
          restrictions: {
            enumeration: ["active"],
            pattern: undefined,
            length: undefined,
            minLength: 1,
            maxLength: undefined,
            minInclusive: undefined,
            maxInclusive: undefined,
            minExclusive: undefined,
            maxExclusive: undefined,
            totalDigits: undefined,
            fractionDigits: undefined,
            whiteSpace: undefined,
          },
        },
      });
    });

    test.each([
      [
        "keep all patterns when another facet is dropped",
        ["[A-Z]{3}", "[0-9]{3}"],
        C.MaxLength,
        { pattern: ["[A-Z]{3}", "[0-9]{3}"], maxLength: 1 },
      ],
      ["append a default pattern to no pattern", [], C.Pattern, { pattern: [".*"] }],
      [
        "append a default pattern to one pattern",
        ["[A-Z]{3}"],
        C.Pattern,
        { pattern: ["[A-Z]{3}", "[^a-zA-Z0-9\\s]*"] },
      ],
      [
        "append a default pattern to two patterns",
        ["[A-Z]{3}", "[^a-zA-Z0-9\\s]*"],
        C.Pattern,
        { pattern: ["[A-Z]{3}", "[^a-zA-Z0-9\\s]*", "[^a-zA-Z0-9\\s]*"] },
      ],
    ])("should %s", (_case, existing, schemaConstruct, restrictions) => {
      const patterns = existing.map((value) => `<xs:pattern value="${value}"/>`).join("");
      const item = diagramItem(
        webviewSchemaWith(
          `<xs:simpleType name="Code"><xs:restriction base="xs:string">${patterns}</xs:restriction></xs:simpleType>`
        ),
        "/simpleType:Code"
      );

      expect(factory.createNodeDropCommand(item, schemaConstruct)).toMatchObject({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Code", restrictions },
      });
    });

    test.each([
      { existing: [], expected: ["value"] },
      { existing: ["a", "b"], expected: ["a", "b", "value"] },
      { existing: ["value", "value2"], expected: ["value", "value2", "value3"] },
      { existing: ["value", "value3"], expected: ["value", "value3", "value2"] },
    ])("should append a unique enumeration value to $existing", ({ existing, expected }) => {
      const enumerations = existing.map((value) => `<xs:enumeration value="${value}"/>`).join("");
      const schemaObj = webviewSchemaWith(
        `<xs:simpleType name="Status"><xs:restriction base="xs:string">${enumerations}</xs:restriction></xs:simpleType>`
      );
      const item = diagramItem(schemaObj, "/simpleType:Status");

      const command = factory.createNodeDropCommand(item, C.Enumeration);

      expect(command).toMatchObject({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Status", restrictions: { enumeration: expected } },
      });
    });

    test("should append an enumeration value to the anonymous simpleType of an element", () => {
      const schemaObj = webviewSchemaWith(
        `<xs:element name="code"><xs:simpleType><xs:restriction base="xs:string">` +
          `<xs:enumeration value="a"/><xs:enumeration value="value"/>` +
          `</xs:restriction></xs:simpleType></xs:element>`
      );
      const item = diagramItem(schemaObj, "/element:code");

      const command = factory.createNodeDropCommand(item, C.Enumeration);

      expect(command).toMatchObject({
        type: "modifySimpleType",
        payload: {
          typeId: "/element:code/anonymousSimpleType[0]",
          restrictions: { enumeration: ["a", "value", "value2"] },
        },
      });
    });
  });

  describe("name generation and schema updates", () => {
    test("should avoid top-level name collisions from schema", () => {
      factory.updateNamesFromSchema({
        element: [{ name: "Element1" }, { name: "Element2" }],
        attribute: [{ name: "Attribute1" }],
        simpleType: [{ name: "SimpleType1" }],
        complexType: [{ name: "ComplexType1" }],
        group: [{ name: "Group1" }],
      });

      const names = [C.Element, C.Attribute, C.SimpleType, C.ComplexType, C.Group].map((schemaConstruct) =>
        generatedName(factory, schemaConstruct)
      );

      expect(names).toEqual(["Element3", "Attribute2", "SimpleType2", "ComplexType2", "Group2"]);
    });

    test("should reset cached names on updateSchema", () => {
      factory.updateNamesFromSchema({ element: [{ name: "Element1" }] });
      expect(generatedName(factory, C.Element)).toBe("Element2");

      factory.updateNamesFromSchema({});
      expect(generatedName(factory, C.Element)).toBe("Element1");
    });

    test.each([
      ["without clashes", [], "Element1"],
      ["after clashes", ["Element1"], "Element2"],
    ])("should not consume generated names during repeated canDrop validation %s", (_case, existing, expected) => {
      factory.updateNamesFromSchema({ element: existing.map((name) => ({ name })) });

      // Simulate repeated dragover checks.
      for (let i = 0; i < 3; i++) {
        expect(factory.canDropOnNode(ROOT, C.Element)).toBe(true);
      }

      expect(generatedName(factory, C.Element)).toBe(expected);
    });
  });

  describe("canDropOnNode", () => {
    test("should match createNodeDropCommand validity for supported drops", () => {
      expect(factory.canDropOnNode(ROOT, C.Group)).toBe(true);
      expect(factory.createNodeDropCommand(ROOT, C.Group)).not.toBeNull();
    });
  });
});
