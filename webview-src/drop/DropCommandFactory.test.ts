/**
 * Unit tests for DropCommandFactory.
 * Verifies that drag-and-drop actions produce the correct schema commands.
 */

import { DropCommandFactory } from "./DropCommandFactory";
import { DiagramItem } from "../diagram/DiagramItem";
import { DiagramItemGroupType, DiagramItemType } from "../diagram/DiagramTypes";
import { PaletteSchemaConstruct } from "../palette/PaletteSchemaConstruct";

function makeItem(
  id: string,
  itemType: DiagramItemType,
  overrides: Partial<DiagramItem> = {}
): DiagramItem {
  const item = new DiagramItem(id, id.split(":").pop() ?? id, itemType);
  Object.assign(item, overrides);
  return item;
}

describe("DropCommandFactory", () => {
  let factory: DropCommandFactory;

  beforeEach(() => {
    factory = new DropCommandFactory();
  });

  describe("createTopLevelDropCommand", () => {
    test("creates addElement command", () => {
      const cmd = factory.createTopLevelDropCommand(PaletteSchemaConstruct.Element);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addElement");
      expect((cmd! as { payload: { parentId: string; elementName: string } }).payload).toMatchObject({
        parentId: "/schema",
        elementName: "Element1",
      });
    });

    test("creates addAttribute command", () => {
      const cmd = factory.createTopLevelDropCommand(PaletteSchemaConstruct.Attribute);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addAttribute");
      expect((cmd! as { payload: { parentId: string; attributeName: string } }).payload).toMatchObject({
        parentId: "/schema",
        attributeName: "Attribute1",
      });
    });

    test("creates addSimpleType command", () => {
      const cmd = factory.createTopLevelDropCommand(PaletteSchemaConstruct.SimpleType);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addSimpleType");
      expect((cmd! as { payload: { parentId: string; typeName: string } }).payload).toMatchObject({
        parentId: "/schema",
        typeName: "SimpleType1",
      });
    });

    test("creates addComplexType command", () => {
      const cmd = factory.createTopLevelDropCommand(PaletteSchemaConstruct.ComplexType);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addComplexType");
      expect((cmd! as { payload: { parentId: string; typeName: string } }).payload).toMatchObject({
        parentId: "/schema",
        typeName: "ComplexType1",
      });
    });

    test("creates restriction as a top-level simpleType command", () => {
      const cmd = factory.createTopLevelDropCommand(PaletteSchemaConstruct.Restriction);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addSimpleType");
      expect((cmd! as { payload: { parentId: string; typeName?: string; baseType: string } }).payload).toMatchObject({
        parentId: "/schema",
        typeName: "SimpleType1",
        baseType: "xs:string",
      });
    });

    test("creates extension as a top-level complexType command", () => {
      const cmd = factory.createTopLevelDropCommand(PaletteSchemaConstruct.Extension);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addComplexType");
      expect((cmd! as { payload: { parentId: string; typeName?: string; baseType: string } }).payload).toMatchObject({
        parentId: "/schema",
        typeName: "ComplexType1",
        baseType: "xs:anyType",
      });
    });

    test("creates addGroup command", () => {
      const cmd = factory.createTopLevelDropCommand(PaletteSchemaConstruct.Group);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addGroup");
      expect((cmd! as { payload: { groupName: string } }).payload.groupName).toBe(
        "Group1"
      );
    });

    test("returns null for unsupported top-level construct", () => {
      const cmd = factory.createTopLevelDropCommand(PaletteSchemaConstruct.Any);
      expect(cmd).toBeNull();
    });
  });

  describe("createNodeDropCommand — element", () => {
    test("allows schema root", () => {
      const item = makeItem("/schema", DiagramItemType.element);
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Element);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addElement");
      expect((cmd! as { payload: { parentId: string } }).payload.parentId).toBe("/schema");
    });

    test("allows sequence/choice/all groups", () => {
      const sequence = makeItem("/e/g[0]", DiagramItemType.group, {
        groupType: DiagramItemGroupType.Sequence,
      });
      const choice = makeItem("/e/g[1]", DiagramItemType.group, {
        groupType: DiagramItemGroupType.Choice,
      });
      const all = makeItem("/e/g[2]", DiagramItemType.group, {
        groupType: DiagramItemGroupType.All,
      });

      expect(factory.createNodeDropCommand(sequence, PaletteSchemaConstruct.Element)).not.toBeNull();
      expect(factory.createNodeDropCommand(choice, PaletteSchemaConstruct.Element)).not.toBeNull();
      expect(factory.createNodeDropCommand(all, PaletteSchemaConstruct.Element)).not.toBeNull();
    });

    test("rejects unsupported target", () => {
      const item = makeItem("/simpleType:S", DiagramItemType.type, { type: "simpleType" });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Element);
      expect(cmd).toBeNull();
    });
  });

  describe("createNodeDropCommand — attribute", () => {
    test("should produce addAttribute command when target is the schema root", () => {
      const item = makeItem("/schema", DiagramItemType.element);
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Attribute);

      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addAttribute");
      expect((cmd! as { payload: { parentId: string } }).payload.parentId).toBe("/schema");
    });

    test("should produce addAttribute command when target is a named complexType node", () => {
      const item = makeItem(
        "/complexType:PersonType",
        DiagramItemType.type,
        { type: "complexType" }
      );
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Attribute);

      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addAttribute");
      expect((cmd! as { payload: { parentId: string } }).payload.parentId).toBe(
        "/complexType:PersonType"
      );
    });

    test("should produce addAttribute targeting the anonymousComplexType when element has one", () => {
      const item = makeItem("/element:person", DiagramItemType.element, {
        hasAnonymousComplexType: true,
      });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Attribute);

      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addAttribute");
      expect(
        (cmd! as { payload: { parentId: string } }).payload.parentId
      ).toBe("/element:person/anonymousComplexType[0]");
    });

    test("should return null when target is a plain element without anonymous complexType", () => {
      const item = makeItem("/element:person", DiagramItemType.element, {
        hasAnonymousComplexType: false,
      });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Attribute);

      expect(cmd).toBeNull();
    });

    test("should return null when target is a sequence group", () => {
      const item = makeItem("/element:person/group[0]", DiagramItemType.group, {
        groupType: DiagramItemGroupType.Sequence,
      });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Attribute);

      expect(cmd).toBeNull();
    });
  });

  describe("createNodeDropCommand — simpleType", () => {
    test("allows schema root and sets generated typeName", () => {
      const item = makeItem("/schema", DiagramItemType.element);
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.SimpleType);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addSimpleType");
      expect((cmd! as { payload: { parentId: string; typeName?: string } }).payload).toMatchObject({
        parentId: "/schema",
        typeName: "SimpleType1",
      });
    });

    test("allows element target without typeName", () => {
      const item = makeItem("/element:person", DiagramItemType.element);
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.SimpleType);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addSimpleType");
      const payload = (cmd! as { payload: { parentId: string; typeName?: string } }).payload;
      expect(payload.parentId).toBe("/element:person");
      expect(payload.typeName).toBeUndefined();
    });

    test("uses the element itself as the replacement target when it already has an inline complexType", () => {
      const item = makeItem("/element:person", DiagramItemType.element, {
        hasAnonymousComplexType: true,
      });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.SimpleType);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addSimpleType");
      const payload = (cmd! as { payload: { parentId: string; typeName?: string } }).payload;
      expect(payload.parentId).toBe("/element:person");
      expect(payload.typeName).toBeUndefined();
    });

    test("rejects unsupported target", () => {
      const item = makeItem("/group:G", DiagramItemType.group);
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.SimpleType);
      expect(cmd).toBeNull();
    });
  });

  describe("createNodeDropCommand — complexType", () => {
    test("allows schema root and sets generated typeName", () => {
      const item = makeItem("/schema", DiagramItemType.element);
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.ComplexType);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addComplexType");
      expect((cmd! as { payload: { parentId: string; typeName?: string } }).payload).toMatchObject({
        parentId: "/schema",
        typeName: "ComplexType1",
      });
    });

    test("allows element target without typeName", () => {
      const item = makeItem("/element:person", DiagramItemType.element);
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.ComplexType);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addComplexType");
      const payload = (cmd! as { payload: { parentId: string; typeName?: string } }).payload;
      expect(payload.parentId).toBe("/element:person");
      expect(payload.typeName).toBeUndefined();
    });

    test("uses the element itself as the replacement target when it already has an inline simpleType", () => {
      const item = makeItem("/element:person", DiagramItemType.element, {
        isSimpleContent: true,
      });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.ComplexType);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addComplexType");
      const payload = (cmd! as { payload: { parentId: string; typeName?: string } }).payload;
      expect(payload.parentId).toBe("/element:person");
      expect(payload.typeName).toBeUndefined();
    });

    test("rejects unsupported target", () => {
      const item = makeItem("/group:G", DiagramItemType.group);
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.ComplexType);
      expect(cmd).toBeNull();
    });
  });

  describe("createNodeDropCommand — group", () => {
    test("allows schema root", () => {
      const item = makeItem("/schema", DiagramItemType.element);
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Group);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addGroup");
      expect((cmd! as { payload: { groupName: string } }).payload.groupName).toBe(
        "Group1"
      );
    });

    test("rejects non-root target", () => {
      const item = makeItem("/complexType:C", DiagramItemType.type, { type: "complexType" });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Group);
      expect(cmd).toBeNull();
    });
  });

  describe("createNodeDropCommand — restriction", () => {
    test("creates an anonymous simpleType replacement for typed elements", () => {
      const item = makeItem("/element:code", DiagramItemType.element, { type: "CustomerCodeType" });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Restriction);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addSimpleType");
      expect((cmd! as { payload: { parentId: string; baseType: string } }).payload).toMatchObject({
        parentId: "/element:code",
        baseType: "CustomerCodeType",
      });
    });

    test("modifies existing inline simpleType elements in place", () => {
      const item = makeItem("/element:code", DiagramItemType.element, {
        type: "<anonymous simpleType> (restricts xs:string)",
        isSimpleContent: true,
      });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Restriction);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("modifySimpleType");
      expect((cmd! as { payload: { typeId: string; baseType: string } }).payload).toMatchObject({
        typeId: "/element:code/anonymousSimpleType[0]",
        baseType: "xs:string",
      });
    });

    test("modifies existing inline complexType elements into restrictions in place", () => {
      const item = makeItem("/element:person", DiagramItemType.element, {
        type: "<anonymous complexType> (extends BasePersonType)",
        hasAnonymousComplexType: true,
      });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Restriction);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("modifyComplexType");
      expect((cmd! as {
        payload: { typeId: string; baseType: string; derivationKind: string };
      }).payload).toMatchObject({
        typeId: "/element:person/anonymousComplexType[0]",
        baseType: "BasePersonType",
        derivationKind: "restriction",
      });
    });

    test("modifies named complexType nodes into restrictions in place", () => {
      const item = makeItem("/complexType:PersonType", DiagramItemType.type, {
        type: "complexType (extends BasePersonType)",
      });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Restriction);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("modifyComplexType");
      expect((cmd! as {
        payload: { typeId: string; baseType: string; derivationKind: string };
      }).payload).toMatchObject({
        typeId: "/complexType:PersonType",
        baseType: "BasePersonType",
        derivationKind: "restriction",
      });
    });

    test("defaults complexType restrictions to xs:anyType when no base can be inferred", () => {
      const item = makeItem("/complexType:ChoiceType", DiagramItemType.type, {
        type: "complexType",
      });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Restriction);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("modifyComplexType");
      expect((cmd! as {
        payload: { typeId: string; baseType: string; derivationKind: string };
      }).payload).toMatchObject({
        typeId: "/complexType:ChoiceType",
        baseType: "xs:anyType",
        derivationKind: "restriction",
      });
    });
  });

  describe("createNodeDropCommand — extension", () => {
    test("creates an anonymous complexType extension for typed elements", () => {
      const item = makeItem("/element:person", DiagramItemType.element, { type: "PersonType" });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Extension);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("addComplexType");
      expect((cmd! as {
        payload: { parentId: string; baseType: string; contentModel: string; derivationKind: string };
      }).payload).toMatchObject({
        parentId: "/element:person",
        baseType: "PersonType",
        contentModel: "sequence",
        derivationKind: "extension",
      });
    });

    describe("createNodeDropCommand — compositors", () => {
      test("modifies named complexType content model", () => {
        const item = makeItem("/complexType:PersonType", DiagramItemType.type, {
          type: "complexType",
        });

        const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Choice);

        expect(cmd).toEqual({
          type: "modifyComplexType",
          payload: {
            typeId: "/complexType:PersonType",
            contentModel: "choice",
          },
        });
      });

      test("modifies inline anonymous complexType content model", () => {
        const item = makeItem("/element:person", DiagramItemType.element, {
          hasAnonymousComplexType: true,
        });

        const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.All);

        expect(cmd).toEqual({
          type: "modifyComplexType",
          payload: {
            typeId: "/element:person/anonymousComplexType[0]",
            contentModel: "all",
          },
        });
      });

      test("adds complexType with dropped content model for plain elements", () => {
        const item = makeItem("/element:person", DiagramItemType.element);

        const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Sequence);

        expect(cmd).toEqual({
          type: "addComplexType",
          payload: {
            parentId: "/element:person",
            contentModel: "sequence",
          },
        });
      });

      test("modifies top-level named groups", () => {
        const item = makeItem("/group:PeopleGroup", DiagramItemType.group);

        const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Choice);

        expect(cmd).toEqual({
          type: "modifyGroup",
          payload: {
            groupId: "/group:PeopleGroup",
            contentModel: "choice",
          },
        });
      });

      test("rejects compositor drop on compositor-group nodes", () => {
        const item = makeItem("/complexType:PersonType/group:sequence[0]", DiagramItemType.group, {
          groupType: DiagramItemGroupType.Sequence,
        });

        const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.All);

        expect(cmd).toBeNull();
      });
    });

    test("modifies existing inline complexType elements in place", () => {
      const item = makeItem("/element:person", DiagramItemType.element, {
        type: "<anonymous complexType> (extends BasePersonType)",
        hasAnonymousComplexType: true,
      });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Extension);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("modifyComplexType");
      expect((cmd! as {
        payload: { typeId: string; baseType: string; derivationKind: string };
      }).payload).toMatchObject({
        typeId: "/element:person/anonymousComplexType[0]",
        baseType: "BasePersonType",
        derivationKind: "extension",
      });
    });

    test("defaults complexType extensions to xs:anyType when no base can be inferred", () => {
      const item = makeItem("/complexType:ChoiceType", DiagramItemType.type, {
        type: "complexType",
      });
      const cmd = factory.createNodeDropCommand(item, PaletteSchemaConstruct.Extension);
      expect(cmd).not.toBeNull();
      expect(cmd!.type).toBe("modifyComplexType");
      expect((cmd! as {
        payload: { typeId: string; baseType: string; derivationKind: string };
      }).payload).toMatchObject({
        typeId: "/complexType:ChoiceType",
        baseType: "xs:anyType",
        derivationKind: "extension",
      });
    });
  });

  describe("createNodeDropCommand — facets", () => {
    test("adds a default facet to a restriction simpleType", () => {
      const item = makeItem("/simpleType:Status", DiagramItemType.type, {
        type: "simpleType (restricts xs:string)",
        simpleTypeDerivationKind: "restriction",
        restrictions: { enumeration: ["active"] },
      });

      const command = factory.createNodeDropCommand(item, PaletteSchemaConstruct.MinLength);

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

    test.each(["list", "union"] as const)("rejects facet drops on %s simpleTypes", (kind) => {
      const item = makeItem("/simpleType:Values", DiagramItemType.type, {
        type: `simpleType (${kind})`,
        simpleTypeDerivationKind: kind,
      });

      expect(factory.createNodeDropCommand(item, PaletteSchemaConstruct.Enumeration)).toBeNull();
    });
  });

  describe("name generation and schema updates", () => {
    test("avoids top-level name collisions from schema", () => {
      factory.updateNamesFromSchema({
        element: [{ name: "Element1" }, { name: "Element2" }],
        attribute: [{ name: "Attribute1" }],
        simpleType: [{ name: "SimpleType1" }],
        complexType: [{ name: "ComplexType1" }],
        group: [{ name: "Group1" }],
      });

      const element = factory.createTopLevelDropCommand(PaletteSchemaConstruct.Element);
      const attribute = factory.createTopLevelDropCommand(PaletteSchemaConstruct.Attribute);
      const simple = factory.createTopLevelDropCommand(PaletteSchemaConstruct.SimpleType);
      const complex = factory.createTopLevelDropCommand(PaletteSchemaConstruct.ComplexType);
      const group = factory.createTopLevelDropCommand(PaletteSchemaConstruct.Group);

      expect((element! as { payload: { elementName: string } }).payload.elementName).toBe(
        "Element3"
      );
      expect((attribute! as { payload: { attributeName: string } }).payload.attributeName).toBe(
        "Attribute2"
      );
      expect((simple! as { payload: { typeName: string } }).payload.typeName).toBe(
        "SimpleType2"
      );
      expect((complex! as { payload: { typeName: string } }).payload.typeName).toBe(
        "ComplexType2"
      );
      expect((group! as { payload: { groupName: string } }).payload.groupName).toBe(
        "Group2"
      );
    });

    test("resets cached names on updateSchema", () => {
      factory.updateNamesFromSchema({ element: [{ name: "Element1" }] });
      const first = factory.createTopLevelDropCommand(PaletteSchemaConstruct.Element);
      expect((first! as { payload: { elementName: string } }).payload.elementName).toBe(
        "Element2"
      );

      factory.updateNamesFromSchema({});
      const second = factory.createTopLevelDropCommand(PaletteSchemaConstruct.Element);
      expect((second! as { payload: { elementName: string } }).payload.elementName).toBe(
        "Element1"
      );
    });

    test("does not consume generated names during canDrop validation", () => {
      const root = makeItem("/schema", DiagramItemType.element);

      // Simulate repeated dragover checks.
      expect(factory.canDropOnNode(root, PaletteSchemaConstruct.Element)).toBe(true);
      expect(factory.canDropOnNode(root, PaletteSchemaConstruct.Element)).toBe(true);
      expect(factory.canDropOnNode(root, PaletteSchemaConstruct.Element)).toBe(true);

      const command = factory.createTopLevelDropCommand(PaletteSchemaConstruct.Element);
      expect((command! as { payload: { elementName: string } }).payload.elementName).toBe(
        "Element1"
      );
    });

    test("still increments after clashes when validation runs first", () => {
      factory.updateNamesFromSchema({ element: [{ name: "Element1" }] });
      const root = makeItem("/schema", DiagramItemType.element);

      expect(factory.canDropOnNode(root, PaletteSchemaConstruct.Element)).toBe(true);
      expect(factory.canDropOnNode(root, PaletteSchemaConstruct.Element)).toBe(true);

      const command = factory.createTopLevelDropCommand(PaletteSchemaConstruct.Element);
      expect((command! as { payload: { elementName: string } }).payload.elementName).toBe(
        "Element2"
      );
    });
  });

  describe("canDropOnNode", () => {
    test("matches createNodeDropCommand validity for supported drops", () => {
      const root = makeItem("/schema", DiagramItemType.element);
      expect(factory.canDropOnNode(root, PaletteSchemaConstruct.Group)).toBe(true);
      expect(factory.createNodeDropCommand(root, PaletteSchemaConstruct.Group)).not.toBeNull();
    });

    test("rejects unsupported target/construct combinations", () => {
      const simpleTypeNode = makeItem("/simpleType:S", DiagramItemType.type, {
        type: "simpleType",
      });
      expect(factory.canDropOnNode(simpleTypeNode, PaletteSchemaConstruct.Attribute)).toBe(false);
      expect(factory.createNodeDropCommand(simpleTypeNode, PaletteSchemaConstruct.Attribute)).toBeNull();
    });
  });
});
