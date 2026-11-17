/**
 * Unit tests for `SchemaProcessors` module.
 */

import {
  processComplexType,
  processSequence,
  processChoice,
  processAll,
  processAnonymousTypes,
  processSimpleTypeBody,
} from "../diagram/SchemaProcessors";
import { DiagramItem } from "../diagram/DiagramItem";
import { Diagram } from "../diagram/Diagram";
import { DiagramItemGroupType, DiagramItemType } from "../diagram/DiagramTypes";
import { DERIVATIONS, derivedComplexTypeT, schemaWith } from "../../shared/__tests__/schemaTestHelpers";

describe("SchemaProcessors", () => {
  let diagram: Diagram;
  let item: DiagramItem;

  beforeEach(() => {
    diagram = new Diagram();
    item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
  });

  describe("processAnonymousTypes", () => {
    test("should process an anonymous complexType or simpleType and ignores an element without one", () => {
      const schemaObj = schemaWith(`<xs:element name="c"><xs:complexType mixed="true"/></xs:element>
<xs:element name="s"><xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType></xs:element>
<xs:element name="n" type="xs:string"/>`);
      const [complexElement, simpleElement, namedElement] = schemaObj.element ?? [];
      const items = [complexElement, simpleElement, namedElement].map((element) => {
        const elementItem = new DiagramItem(
          `/element:${element!.name}`,
          element!.name,
          DiagramItemType.element,
          diagram
        );
        processAnonymousTypes(elementItem, element!);
        return elementItem;
      });
      expect(items.map((i) => [i.hasAnonymousComplexType, i.isMixed, i.isSimpleContent])).toEqual([
        [true, true, false],
        [false, false, true],
        [false, false, false],
      ]);
    });
  });

  describe("processSimpleTypeBody", () => {
    test.each([
      ["restriction", `<xs:restriction base="xs:string"/>`],
      ["list", `<xs:list itemType="xs:int"/>`],
      ["union", `<xs:union memberTypes="xs:int xs:string"/>`],
    ])("should process a %s", (kind, body) => {
      const simpleType = schemaWith(`<xs:simpleType name="S">${body}</xs:simpleType>`).simpleType?.[0];
      processSimpleTypeBody(item, simpleType ?? {});
      expect(item.simpleTypeDerivationKind ?? "restriction").toBe(kind);
    });
  });

  describe("processAnonymousTypes with an anonymous simpleType", () => {
    test("should set type before processing restriction", () => {
      const simpleType = {
        restriction: { base: "string" },
      };

      processAnonymousTypes(item, { simpleType });

      expect(item.isSimpleContent).toBe(true);
      expect(item.type).toContain("anonymous simpleType");
      expect(item.type).toContain("restricts string");
    });

    test("should mark item as simple content", () => {
      const simpleType = {};

      processAnonymousTypes(item, { simpleType });

      expect(item.isSimpleContent).toBe(true);
    });

    test("should extract list itemType metadata", () => {
      const simpleType = {
        list: { itemType: "xs:token" },
      };

      processAnonymousTypes(item, { simpleType });

      expect(item.isSimpleContent).toBe(true);
      expect(item.simpleTypeDerivationKind).toBe("list");
      expect(item.simpleTypeListItemType).toBe("xs:token");
      expect(item.type).toContain("list of xs:token");
    });

    test("should extract union memberTypes metadata", () => {
      const simpleType = {
        union: { memberTypes: "xs:string xs:integer" },
      };

      processAnonymousTypes(item, { simpleType });

      expect(item.isSimpleContent).toBe(true);
      expect(item.simpleTypeDerivationKind).toBe("union");
      expect(item.simpleTypeUnionMemberTypes).toEqual(["xs:string", "xs:integer"]);
      expect(item.type).toContain("union of xs:string, xs:integer");
    });
  });

  describe("processComplexType", () => {
    test("should process complexContent with extension", () => {
      item.type = "complexType";
      const complexType = {
        complexContent: {
          extension: { base: "BaseType" },
        },
      };

      processComplexType(item, complexType);

      expect(item.type).toBe("complexType with complexContent (extends BaseType)");
    });

    test("should append the extension to an empty type", () => {
      item.type = "";

      processComplexType(item, { complexContent: { extension: { base: "BaseType" } } });

      expect(item.type).toBe(" with complexContent (extends BaseType)");
    });

    test("should process simpleContent with restriction", () => {
      item.type = "complexType";
      const complexType = {
        simpleContent: {
          restriction: { base: "string" },
        },
      };

      processComplexType(item, complexType);

      expect(item.type).toContain("with simpleContent");
      expect(item.type).toContain("restricts string");
      expect(item.isSimpleContent).toBe(true);
    });

    test.each(DERIVATIONS)("should read the attributes of the %s %s", (content, derivation) => {
      const complexType = schemaWith(
        derivedComplexTypeT(content, derivation, `<xs:attribute name="id" type="xs:integer"/>`)
      ).complexType![0]!;

      processComplexType(item, complexType);

      expect(item.attributes.map((attribute) => attribute.name)).toEqual(["id"]);
    });
  });

  describe("processSequence / processChoice / processAll — group IDs", () => {
    test("should generate a group ID containing 'sequence' for a sequence under a named complexType", () => {
      const ctItem = new DiagramItem("/complexType:PersonType", "PersonType", DiagramItemType.type, diagram);

      processSequence(ctItem, { element: [{ name: "name", type_: "xs:string" }] });

      expect(ctItem.childElements).toHaveLength(1);
      const seq = ctItem.childElements[0]!;
      expect(seq.groupType).toBe(DiagramItemGroupType.Sequence);
      expect(seq.id).toBe("/complexType:PersonType/group:sequence[0]");
    });

    test("should generate a group ID containing 'choice' for a choice under a named complexType", () => {
      const ctItem = new DiagramItem("/complexType:ChoiceType", "ChoiceType", DiagramItemType.type, diagram);

      processChoice(ctItem, { element: [{ name: "opt", type_: "xs:string" }] });

      const choice = ctItem.childElements[0]!;
      expect(choice.groupType).toBe(DiagramItemGroupType.Choice);
      expect(choice.id).toBe("/complexType:ChoiceType/group:choice[0]");
    });

    test("should generate a group ID containing 'all' for an all group under a named complexType", () => {
      const ctItem = new DiagramItem("/complexType:AllType", "AllType", DiagramItemType.type, diagram);

      processAll(ctItem, { element: [{ name: "field", type_: "xs:string" }] });

      const allGroup = ctItem.childElements[0]!;
      expect(allGroup.groupType).toBe(DiagramItemGroupType.All);
      expect(allGroup.id).toBe("/complexType:AllType/group:all[0]");
    });

    test("should include anonymousComplexType in the group ID when parent is an element with anonymous CT", () => {
      const elemItem = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
      // Mark as having anonymous complex type (as processAnonymousComplexType does)
      elemItem.hasAnonymousComplexType = true;

      processSequence(elemItem, { element: [{ name: "name", type_: "xs:string" }] });

      const seq = elemItem.childElements[0]!;
      expect(seq.id).toBe("/element:person/anonymousComplexType[0]/group:sequence[0]");
    });

    test("should give child elements inside a group IDs with the correct group parent", () => {
      const ctItem = new DiagramItem("/complexType:PersonType", "PersonType", DiagramItemType.type, diagram);

      processSequence(ctItem, {
        element: [
          { name: "first", type_: "xs:string" },
          { name: "last", type_: "xs:string" },
        ],
      });

      const seq = ctItem.childElements[0]!;
      expect(seq.childElements[0]!.id).toBe("/complexType:PersonType/group:sequence[0]/element:first[0]");
      expect(seq.childElements[1]!.id).toBe("/complexType:PersonType/group:sequence[0]/element:last[1]");
    });

    test("should add an empty group to the parent so it can act as a drop target", () => {
      const ctItem = new DiagramItem("/complexType:EmptyType", "EmptyType", DiagramItemType.type, diagram);

      processSequence(ctItem, { element: [] });
      expect(ctItem.childElements).toHaveLength(1);
      expect(ctItem.childElements[0]!.groupType).toBe(DiagramItemGroupType.Sequence);
    });

    test("should mark local group elements with inline anonymous complexType and extension base", () => {
      const ctItem = new DiagramItem("/complexType:ContainerType", "ContainerType", DiagramItemType.type, diagram);

      processSequence(ctItem, {
        element: [
          {
            name: "meta",
            complexType: {
              complexContent: {
                extension: {
                  base: "xs:anyType",
                  sequence: {},
                },
              },
            },
          },
        ],
      });

      const sequence = ctItem.childElements[0]!;
      const meta = sequence.childElements[0]!;
      expect(meta.name).toBe("meta");
      expect(meta.hasAnonymousComplexType).toBe(true);
      expect(meta.complexDerivationKind).toBe("extension");
      expect(meta.type).toContain("extends xs:anyType");
    });

    test("should render nested group references inside sequence groups", () => {
      const ctItem = new DiagramItem("/complexType:PersonType", "PersonType", DiagramItemType.type, diagram);

      processSequence(ctItem, {
        group: [{ ref: "SharedGroup", minOccurs: 0, maxOccurs: "unbounded" }],
      });

      const sequence = ctItem.childElements[0]!;
      expect(sequence.childElements).toHaveLength(1);
      expect(sequence.childElements[0]!.id).toBe("/complexType:PersonType/group:sequence[0]/groupRef:SharedGroup[0]");
      expect(sequence.childElements[0]!.minOccurrence).toBe(0);
      expect(sequence.childElements[0]!.maxOccurrence).toBe(-1);
      expect(sequence.childElements[0]!.isReference).toBe(true);
    });

    test("should render nested compositors using schema positions", () => {
      const ctItem = new DiagramItem("/complexType:PersonType", "PersonType", DiagramItemType.type, diagram);

      processSequence(ctItem, {
        element: [{ name: "first", type_: "xs:string" }],
        choice: [{ element: [{ name: "second", type_: "xs:string" }] }],
      });

      const sequence = ctItem.childElements[0]!;
      expect(sequence.childElements[1]!.id).toBe("/complexType:PersonType/group:sequence[0]/group:choice[0]");
    });

    test("should extract compositor documentation for properties-panel docs editing", () => {
      const ctItem = new DiagramItem("/complexType:PersonType", "PersonType", DiagramItemType.type, diagram);

      processSequence(ctItem, {
        annotation: {
          documentation: [{ value: "Sequence docs" }],
        },
      });

      const sequence = ctItem.childElements[0]!;
      expect(sequence.documentation).toBe("Sequence docs");
      expect(sequence.documentationAnnotations).toEqual([
        {
          id: "/complexType:PersonType/group:sequence[0]",
          documentationEntries: [
            {
              id: "/complexType:PersonType/group:sequence[0]/documentation[0]",
              content: "Sequence docs",
              lang: undefined,
            },
          ],
        },
      ]);
    });
  });

  describe("processAnonymousTypes with an anonymous complexType — group IDs", () => {
    test("should produce sequence ID with anonymousComplexType segment", () => {
      const elemItem = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);

      processAnonymousTypes(elemItem, {
        complexType: { sequence: { element: [{ name: "name", type_: "xs:string" }] } },
      });

      const seq = elemItem.childElements[0]!;
      expect(seq.id).toBe("/element:person/anonymousComplexType[0]/group:sequence[0]");
    });
  });
});
