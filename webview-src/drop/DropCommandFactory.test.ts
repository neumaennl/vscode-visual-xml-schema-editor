/**
 * Unit tests for DropCommandFactory.
 * Verifies that drag-and-drop actions produce the correct schema commands.
 */

import { DropCommandFactory } from "./DropCommandFactory";
import { DiagramItem } from "../diagram/DiagramItem";
import { DiagramItemGroupType, DiagramItemType } from "../diagram/DiagramTypes";
import { PaletteSchemaConstruct } from "../palette/PaletteSchemaConstruct";
import { diagramItem } from "../__tests__/diagramTestHelpers";
import { DERIVATIONS, derivedComplexTypeT, schemaWith } from "../../shared/__tests__/schemaTestHelpers";

function makeItem(
  id: string,
  itemType: DiagramItemType,
  overrides: Partial<DiagramItem> = {}
): DiagramItem {
  const item = new DiagramItem(id, id.split(":").pop() ?? id, itemType);
  Object.assign(item, overrides);
  return item;
}

/** The fields of a payload that hold a generated name. */
const NAME_FIELDS = ["elementName", "attributeName", "typeName", "groupName"];

/**
 * Creates the top-level drop command for a construct and returns the name it generated.
 *
 * @param factory - The factory
 * @param construct - The dropped construct
 * @returns The generated name, or undefined if the command has none
 */
function generatedName(factory: DropCommandFactory, construct: PaletteSchemaConstruct): string | undefined {
  const payload = (factory.createTopLevelDropCommand(construct) as { payload: Record<string, unknown> } | null)?.payload;
  const field = NAME_FIELDS.find((name) => typeof payload?.[name] === "string");
  return field === undefined ? undefined : (payload?.[field] as string);
}

const C = PaletteSchemaConstruct;

/** A drop that creates a command: the case, the target, the dropped construct and the expected command. */
type AcceptedDrop = [string, DiagramItem, PaletteSchemaConstruct, object];

/** A drop that is rejected: the case, the target and the dropped construct. */
type RejectedDrop = [string, DiagramItem, PaletteSchemaConstruct];

/** The schema root. */
const ROOT = makeItem("/schema", DiagramItemType.element);
/** An element without inline type. */
const PERSON = makeItem("/element:person", DiagramItemType.element);
/** An element with an inline complex type. */
const PERSON_WITH_COMPLEX_TYPE = makeItem("/element:person", DiagramItemType.element, { hasAnonymousComplexType: true });
/** An element with an inline simple type. */
const PERSON_WITH_SIMPLE_TYPE = makeItem("/element:person", DiagramItemType.element, { isSimpleContent: true });
/** A sequence in an element. */
const SEQUENCE = makeItem("/element:person/group[0]", DiagramItemType.group, { groupType: DiagramItemGroupType.Sequence });
/** A top-level group. */
const GROUP = makeItem("/group:G", DiagramItemType.group);
/** A complex type without base. */
const CHOICE_TYPE = makeItem("/complexType:ChoiceType", DiagramItemType.type, { type: "complexType" });
/** A simple type. */
const SIMPLE_TYPE = makeItem("/simpleType:S", DiagramItemType.type, { type: "simpleType" });
/** An element with an inline complex type that extends `BasePersonType`. */
const PERSON_EXTENDING_BASE = makeItem("/element:person", DiagramItemType.element, {
  type: "<anonymous complexType> (extends BasePersonType)",
  hasAnonymousComplexType: true,
});

describe("DropCommandFactory", () => {
  let factory: DropCommandFactory;

  beforeEach(() => {
    factory = new DropCommandFactory();
  });

  describe("createTopLevelDropCommand", () => {
    test.each([
      [C.Element, { type: "addElement", payload: { parentId: "/schema", elementName: "Element1" } }],
      [C.Attribute, { type: "addAttribute", payload: { parentId: "/schema", attributeName: "Attribute1" } }],
      [C.SimpleType, { type: "addSimpleType", payload: { parentId: "/schema", typeName: "SimpleType1" } }],
      [C.ComplexType, { type: "addComplexType", payload: { parentId: "/schema", typeName: "ComplexType1" } }],
      [C.Restriction, { type: "addSimpleType", payload: { parentId: "/schema", typeName: "SimpleType1", baseType: "xs:string" } }],
      [C.Extension, { type: "addComplexType", payload: { parentId: "/schema", typeName: "ComplexType1", baseType: "xs:anyType" } }],
      [C.Group, { type: "addGroup", payload: { groupName: "Group1" } }],
    ])("should create the command for %s", (construct, expected) => {
      expect(factory.createTopLevelDropCommand(construct)).toMatchObject(expected);
    });

    test("should return null for unsupported top-level construct", () => {
      expect(factory.createTopLevelDropCommand(C.Any)).toBeNull();
    });
  });

  describe("createNodeDropCommand", () => {
    test.each<AcceptedDrop>([
      ["an element on the schema root", ROOT, C.Element, { type: "addElement", payload: { parentId: "/schema" } }],
      ...[DiagramItemGroupType.Sequence, DiagramItemGroupType.Choice, DiagramItemGroupType.All].map((groupType): AcceptedDrop => [
        `an element on a ${groupType}`,
        makeItem("/e/g[0]", DiagramItemType.group, { groupType }),
        C.Element,
        { type: "addElement" },
      ]),
      ["an attribute on the schema root", ROOT, C.Attribute, { type: "addAttribute", payload: { parentId: "/schema" } }],
      [
        "an attribute on a named complexType",
        makeItem("/complexType:PersonType", DiagramItemType.type, { type: "complexType" }),
        C.Attribute,
        { type: "addAttribute", payload: { parentId: "/complexType:PersonType" } },
      ],
      [
        "an attribute on the anonymous complexType of an element",
        PERSON_WITH_COMPLEX_TYPE,
        C.Attribute,
        { type: "addAttribute", payload: { parentId: "/element:person/anonymousComplexType[0]" } },
      ],
      ["a simpleType on the schema root", ROOT, C.SimpleType, { type: "addSimpleType", payload: { parentId: "/schema", typeName: "SimpleType1" } }],
      ["a complexType on the schema root", ROOT, C.ComplexType, { type: "addComplexType", payload: { parentId: "/schema", typeName: "ComplexType1" } }],
      ["a group on the schema root", ROOT, C.Group, { type: "addGroup", payload: { groupName: "Group1" } }],
      [
        "an anonymous simpleType restriction on a typed element",
        makeItem("/element:code", DiagramItemType.element, { type: "CustomerCodeType" }),
        C.Restriction,
        { type: "addSimpleType", payload: { parentId: "/element:code", baseType: "CustomerCodeType" } },
      ],
      [
        "a restriction that modifies an inline simpleType in place",
        makeItem("/element:code", DiagramItemType.element, { type: "<anonymous simpleType> (restricts xs:string)", isSimpleContent: true }),
        C.Restriction,
        { type: "modifySimpleType", payload: { typeId: "/element:code/anonymousSimpleType[0]", baseType: "xs:string" } },
      ],
      [
        "a restriction that modifies an inline complexType in place",
        PERSON_EXTENDING_BASE,
        C.Restriction,
        {
          type: "modifyComplexType",
          payload: { typeId: "/element:person/anonymousComplexType[0]", baseType: "BasePersonType", derivationKind: "restriction" },
        },
      ],
      [
        "a restriction that modifies a named complexType in place",
        makeItem("/complexType:PersonType", DiagramItemType.type, { type: "complexType (extends BasePersonType)" }),
        C.Restriction,
        { type: "modifyComplexType", payload: { typeId: "/complexType:PersonType", baseType: "BasePersonType", derivationKind: "restriction" } },
      ],
      [
        "a restriction of xs:anyType when no base can be inferred",
        CHOICE_TYPE,
        C.Restriction,
        { type: "modifyComplexType", payload: { typeId: "/complexType:ChoiceType", baseType: "xs:anyType", derivationKind: "restriction" } },
      ],
      [
        "an anonymous complexType extension on a typed element",
        makeItem("/element:person", DiagramItemType.element, { type: "PersonType" }),
        C.Extension,
        {
          type: "addComplexType",
          payload: { parentId: "/element:person", baseType: "PersonType", contentModel: "sequence", derivationKind: "extension" },
        },
      ],
      [
        "an extension that modifies an inline complexType in place",
        PERSON_EXTENDING_BASE,
        C.Extension,
        {
          type: "modifyComplexType",
          payload: { typeId: "/element:person/anonymousComplexType[0]", baseType: "BasePersonType", derivationKind: "extension" },
        },
      ],
      [
        "an extension of xs:anyType when no base can be inferred",
        CHOICE_TYPE,
        C.Extension,
        { type: "modifyComplexType", payload: { typeId: "/complexType:ChoiceType", baseType: "xs:anyType", derivationKind: "extension" } },
      ],
    ])("should create %s", (_case, item, construct, expected) => {
      expect(factory.createNodeDropCommand(item, construct)).toMatchObject(expected);
    });

    test.each(DERIVATIONS)("should create an attribute on a named complexType with %s %s", (content, derivation) => {
      const item = diagramItem(schemaWith(derivedComplexTypeT(content, derivation)), "/complexType:T");

      const cmd = factory.createNodeDropCommand(item, C.Attribute);

      expect(cmd).toMatchObject({ type: "addAttribute", payload: { parentId: "/complexType:T" } });
    });

    test.each([
      ["a simpleType on an element", PERSON, C.SimpleType, "addSimpleType"],
      ["a simpleType that replaces the inline complexType of an element", PERSON_WITH_COMPLEX_TYPE, C.SimpleType, "addSimpleType"],
      ["a complexType on an element", PERSON, C.ComplexType, "addComplexType"],
      ["a complexType that replaces the inline simpleType of an element", PERSON_WITH_SIMPLE_TYPE, C.ComplexType, "addComplexType"],
    ])("should create %s, with the element as parent and without typeName", (_case, item, construct, type) => {
      const cmd = factory.createNodeDropCommand(item, construct);

      expect(cmd).toMatchObject({ type, payload: { parentId: "/element:person" } });
      expect((cmd as { payload: { typeName?: string } }).payload.typeName).toBeUndefined();
    });

    test.each([
      ["a choice on a named complexType", makeItem("/complexType:PersonType", DiagramItemType.type, { type: "complexType" }), C.Choice, {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:PersonType", contentModel: "choice" },
      }],
      ["an all on the anonymous complexType of an element", PERSON_WITH_COMPLEX_TYPE, C.All, {
        type: "modifyComplexType",
        payload: { typeId: "/element:person/anonymousComplexType[0]", contentModel: "all" },
      }],
      ["a sequence on a plain element", PERSON, C.Sequence, {
        type: "addComplexType",
        payload: { parentId: "/element:person", contentModel: "sequence" },
      }],
      ["a choice on a top-level group", makeItem("/group:PeopleGroup", DiagramItemType.group), C.Choice, {
        type: "modifyGroup",
        payload: { groupId: "/group:PeopleGroup", contentModel: "choice" },
      }],
    ])("should set the content model for %s", (_case, item, construct, expected) => {
      expect(factory.createNodeDropCommand(item, construct)).toEqual(expected);
    });

    test.each<RejectedDrop>([
      ["an element on a simpleType", SIMPLE_TYPE, C.Element],
      ["an attribute on a plain element", PERSON, C.Attribute],
      ["an attribute on a sequence", SEQUENCE, C.Attribute],
      ["an attribute on a simpleType", SIMPLE_TYPE, C.Attribute],
      ["a simpleType on a group", GROUP, C.SimpleType],
      ["a complexType on a group", GROUP, C.ComplexType],
      ["a group on a complexType", makeItem("/complexType:C", DiagramItemType.type, { type: "complexType" }), C.Group],
      [
        "a compositor on a compositor",
        makeItem("/complexType:PersonType/group:sequence[0]", DiagramItemType.group, { groupType: DiagramItemGroupType.Sequence }),
        C.All,
      ],
      ...(["list", "union"] as const).map((kind): RejectedDrop => [
        `a facet on a ${kind} simpleType`,
        makeItem("/simpleType:Values", DiagramItemType.type, { type: `simpleType (${kind})`, simpleTypeDerivationKind: kind }),
        C.Enumeration,
      ]),
    ])("should reject %s", (_case, item, construct) => {
      expect(factory.createNodeDropCommand(item, construct)).toBeNull();
      expect(factory.canDropOnNode(item, construct)).toBe(false);
    });
  });

  describe("createNodeDropCommand — facets", () => {
    test("should add a default facet to a restriction simpleType", () => {
      const item = makeItem("/simpleType:Status", DiagramItemType.type, {
        type: "simpleType (restricts xs:string)",
        simpleTypeDerivationKind: "restriction",
        restrictions: { enumeration: ["active"] },
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
      ["keep all patterns when another facet is dropped", ["[A-Z]{3}", "[0-9]{3}"], C.MaxLength, { pattern: ["[A-Z]{3}", "[0-9]{3}"], maxLength: 1 }],
      ["append a default pattern to no pattern", [], C.Pattern, { pattern: [".*"] }],
      ["append a default pattern to one pattern", ["[A-Z]{3}"], C.Pattern, { pattern: ["[A-Z]{3}", "[^a-zA-Z0-9\\s]*"] }],
      [
        "append a default pattern to two patterns",
        ["[A-Z]{3}", "[^a-zA-Z0-9\\s]*"],
        C.Pattern,
        { pattern: ["[A-Z]{3}", "[^a-zA-Z0-9\\s]*", "[^a-zA-Z0-9\\s]*"] },
      ],
    ])("should %s", (_case, existing, construct, restrictions) => {
      const patterns = existing.map((value) => `<xs:pattern value="${value}"/>`).join("");
      const item = diagramItem(
        schemaWith(`<xs:simpleType name="Code"><xs:restriction base="xs:string">${patterns}</xs:restriction></xs:simpleType>`),
        "/simpleType:Code"
      );

      expect(factory.createNodeDropCommand(item, construct)).toMatchObject({
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
      const schemaObj = schemaWith(
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
      const schemaObj = schemaWith(
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

      const names = [C.Element, C.Attribute, C.SimpleType, C.ComplexType, C.Group].map((construct) => generatedName(factory, construct));

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
