/**
 * Unit tests for `SchemaProcessors` module.
 */

import { processSequence, processChoice, processAll, processAnonymousTypes } from "../diagram/SchemaProcessors";
import { DiagramItem } from "../diagram/DiagramItem";
import { isReference } from "../diagram/schemaAccessors";
import { getComplexDerivation } from "../diagram/typeAccessors";
import { getDocumentationAnnotations } from "../diagram/documentationAccessors";
import { Diagram } from "../diagram/Diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";
import { schema } from "../../shared/types";
import { SchemaNodeType } from "../../shared/idStrategy";
import { NOT_READ_SCHEMA_OBJECT } from "../__tests__/diagramTestHelpers";

describe("SchemaProcessors", () => {
  let diagram: Diagram;

  /**
   * Creates the item of a named complex type in the diagram, as the parent of the content to process.
   *
   * @param name - The name of the type
   * @returns The item
   */
  function complexTypeItem(name: string): DiagramItem {
    return new DiagramItem(`/complexType:${name}`, name, DiagramItemType.type, NOT_READ_SCHEMA_OBJECT, diagram);
  }

  beforeEach(() => {
    diagram = new Diagram(new schema());
  });

  describe("processAnonymousTypes", () => {
    test("should add the content of an anonymous complexType and nothing for an anonymous simpleType or a named type", () => {
      const schemaObj =
        webviewSchemaWith(`<xs:element name="c"><xs:complexType><xs:sequence/></xs:complexType></xs:element>
<xs:element name="s"><xs:simpleType><xs:restriction base="xs:string"><xs:maxLength value="5"/></xs:restriction></xs:simpleType></xs:element>
<xs:element name="n" type="xs:string"/>`);
      const items = (schemaObj.element ?? []).map((element) => {
        const elementItem = new DiagramItem(
          `/element:${element.name}`,
          element.name,
          DiagramItemType.element,
          element,
          diagram
        );
        processAnonymousTypes(elementItem, element);
        return elementItem;
      });

      expect(items.map((i) => i.childElements.map((child) => child.label))).toEqual([["sequence"], [], []]);
    });
  });

  describe("processSequence / processChoice / processAll — group IDs", () => {
    test("should generate a group ID containing 'sequence' for a sequence under a named complexType", () => {
      const ctItem = complexTypeItem("PersonType");

      processSequence(ctItem, { element: [{ name: "name", type_: "xs:string" }] });

      expect(ctItem.childElements).toHaveLength(1);
      const seq = ctItem.childElements[0]!;
      expect(seq.compositor).toBe("sequence");
      expect(seq.id).toBe("/complexType:PersonType/sequence[0]");
    });

    test("should generate a group ID containing 'choice' for a choice under a named complexType", () => {
      const ctItem = complexTypeItem("ChoiceType");

      processChoice(ctItem, { element: [{ name: "opt", type_: "xs:string" }] });

      const choice = ctItem.childElements[0]!;
      expect(choice.compositor).toBe("choice");
      expect(choice.id).toBe("/complexType:ChoiceType/choice[0]");
    });

    test("should generate a group ID containing 'all' for an all under a named complexType", () => {
      const ctItem = complexTypeItem("AllType");

      processAll(ctItem, { element: [{ name: "field", type_: "xs:string" }] });

      const allGroup = ctItem.childElements[0]!;
      expect(allGroup.compositor).toBe("all");
      expect(allGroup.id).toBe("/complexType:AllType/all[0]");
    });

    test("should include anonymousComplexType in the group ID when parent is an element with anonymous CT", () => {
      const elemItem = new DiagramItem(
        "/element:person",
        "person",
        DiagramItemType.element,
        { complexType: {} },
        diagram
      );
      elemItem.nodeType = SchemaNodeType.Element;

      processSequence(elemItem, { element: [{ name: "name", type_: "xs:string" }] });

      const seq = elemItem.childElements[0]!;
      expect(seq.id).toBe("/element:person/anonymousComplexType[0]/sequence[0]");
    });

    test("should give child elements inside a group IDs with the correct group parent", () => {
      const ctItem = complexTypeItem("PersonType");

      processSequence(ctItem, {
        element: [
          { name: "first", type_: "xs:string" },
          { name: "last", type_: "xs:string" },
        ],
      });

      const seq = ctItem.childElements[0]!;
      expect(seq.childElements[0]!.id).toBe("/complexType:PersonType/sequence[0]/element:first[0]");
      expect(seq.childElements[1]!.id).toBe("/complexType:PersonType/sequence[0]/element:last[1]");
    });

    test("should add an empty group to the parent so it can act as a drop target", () => {
      const ctItem = complexTypeItem("EmptyType");

      processSequence(ctItem, { element: [] });
      expect(ctItem.childElements).toHaveLength(1);
      expect(ctItem.childElements[0]!.compositor).toBe("sequence");
    });

    test("should process the extension of the anonymous complexType of a local element", () => {
      const ctItem = complexTypeItem("ContainerType");

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
      expect(meta.label).toBe("meta");
      expect(getComplexDerivation(meta)).toEqual({ kind: "extension", base: "xs:anyType", content: "complex" });
      expect(meta.childElements.map((child) => child.label)).toEqual(["sequence"]);
    });

    test("should render nested group references inside sequences", () => {
      const ctItem = complexTypeItem("PersonType");

      const reference = { ref: "SharedGroup", minOccurs: 0, maxOccurs: "unbounded" as const };

      processSequence(ctItem, { group: [reference] });

      const sequence = ctItem.childElements[0]!;
      expect(sequence.childElements).toHaveLength(1);
      expect(sequence.childElements[0]!.id).toBe("/complexType:PersonType/sequence[0]/groupRef:SharedGroup[0]");
      expect(sequence.childElements[0]!.schemaObject).toBe(reference);
      expect(isReference(sequence.childElements[0]!)).toBe(true);
    });

    test("should render nested compositors using schema positions", () => {
      const ctItem = complexTypeItem("PersonType");

      processSequence(ctItem, {
        element: [{ name: "first", type_: "xs:string" }],
        choice: [{ element: [{ name: "second", type_: "xs:string" }] }],
      });

      const sequence = ctItem.childElements[0]!;
      expect(sequence.childElements[1]!.id).toBe("/complexType:PersonType/sequence[0]/choice[0]");
    });

    test("should extract compositor documentation for properties-panel docs editing", () => {
      const ctItem = complexTypeItem("PersonType");

      processSequence(ctItem, {
        annotation: {
          documentation: [{ value: "Sequence docs" }],
        },
      });

      const sequence = ctItem.childElements[0]!;
      expect(getDocumentationAnnotations(sequence)).toEqual([
        {
          id: "/complexType:PersonType/sequence[0]",
          documentationEntries: [
            {
              id: "/complexType:PersonType/sequence[0]/documentation[0]",
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
      const person = { name: "person", complexType: { sequence: { element: [{ name: "name", type_: "xs:string" }] } } };
      const elemItem = new DiagramItem("/element:person", "person", DiagramItemType.element, person, diagram);
      elemItem.nodeType = SchemaNodeType.Element;

      processAnonymousTypes(elemItem, person);

      const seq = elemItem.childElements[0]!;
      expect(seq.id).toBe("/element:person/anonymousComplexType[0]/sequence[0]");
    });
  });
});
