/**
 * Unit tests for TypeNodeCreators module.
 */

import {
  createElementNode,
  createComplexTypeNode,
  createSimpleTypeNode,
} from "./TypeNodeCreators";
import { Diagram } from "./Diagram";
import { DiagramItemType } from "./DiagramTypes";
import { resetIdCounter } from "./DiagramBuilderHelpers";

describe("TypeNodeCreators", () => {
  let diagram: Diagram;

  beforeEach(() => {
    diagram = new Diagram();
    resetIdCounter();
  });

  describe("createElementNode", () => {
    it("should return null for undefined element", () => {
      expect(createElementNode(undefined, diagram)).toBeNull();
    });

    it("should return null for element without name", () => {
      expect(createElementNode({}, diagram)).toBeNull();
    });

    it("should create element node with name", () => {
      const element = { name: "TestElement" };
      const node = createElementNode(element, diagram);

      expect(node).not.toBeNull();
      expect(node!.name).toBe("TestElement");
      expect(node!.itemType).toBe(DiagramItemType.element);
    });

    it("should extract type information", () => {
      const element = { name: "TestElement", type_: "string" };
      const node = createElementNode(element, diagram);

      expect(node!.type).toBe("string");
    });

    it("should extract namespace", () => {
      const element = {
        name: "TestElement",
        targetNamespace: "http://example.com/ns",
      };
      const node = createElementNode(element, diagram);

      expect(node!.namespace).toBe("http://example.com/ns");
    });

    it("should extract documentation from annotation", () => {
      const element = {
        name: "TestElement",
        annotation: {
          documentation: [{ value: "Test doc" }],
        },
      };
      const node = createElementNode(element, diagram);

      expect(node!.documentation).toBe("Test doc");
    });

    it("should extract occurrence constraints", () => {
      const element = {
        name: "TestElement",
        minOccurs: "0",
        maxOccurs: "unbounded",
      };
      const node = createElementNode(element, diagram);

      expect(node!.minOccurrence).toBe(0);
      expect(node!.maxOccurrence).toBe(-1);
    });
  });

  describe("createComplexTypeNode", () => {
    it("should return null for undefined type", () => {
      expect(createComplexTypeNode(undefined, diagram)).toBeNull();
    });

    it("should return null for type without name", () => {
      expect(createComplexTypeNode({}, diagram)).toBeNull();
    });

    it("should create complex type node", () => {
      const complexType = { name: "PersonType" };
      const node = createComplexTypeNode(complexType, diagram);

      expect(node).not.toBeNull();
      expect(node!.name).toBe("PersonType");
      expect(node!.itemType).toBe(DiagramItemType.type);
      expect(node!.type).toBe("complexType");
    });

    it("should extract documentation", () => {
      const complexType = {
        name: "PersonType",
        annotation: {
          documentation: [{ value: "A person type" }],
        },
      };
      const node = createComplexTypeNode(complexType, diagram);

      expect(node!.documentation).toBe("A person type");
    });
  });

  describe("createSimpleTypeNode", () => {
    it("should return null for undefined type", () => {
      expect(createSimpleTypeNode(undefined, diagram)).toBeNull();
    });

    it("should return null for type without name", () => {
      expect(createSimpleTypeNode({}, diagram)).toBeNull();
    });

    it("should create simple type node", () => {
      const simpleType = { name: "AgeType" };
      const node = createSimpleTypeNode(simpleType, diagram);

      expect(node).not.toBeNull();
      expect(node!.name).toBe("AgeType");
      expect(node!.itemType).toBe(DiagramItemType.type);
      expect(node!.type).toBe("simpleType");
      expect(node!.isSimpleContent).toBe(true);
    });

    it("should extract documentation", () => {
      const simpleType = {
        name: "AgeType",
        annotation: {
          documentation: [{ value: "Age restriction" }],
        },
      };
      const node = createSimpleTypeNode(simpleType, diagram);

      expect(node!.documentation).toBe("Age restriction");
    });
  });
});
