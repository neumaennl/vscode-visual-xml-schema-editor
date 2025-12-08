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
import {
  topLevelElement,
  topLevelComplexType,
  topLevelSimpleType,
} from "../../shared/types";

describe("TypeNodeCreators", () => {
  let diagram: Diagram;

  beforeEach(() => {
    diagram = new Diagram();
    resetIdCounter();
  });

  describe("createElementNode", () => {
    it("should return null for element without name", () => {
      const element = new topLevelElement();
      // Don't set name - it will be undefined
      expect(createElementNode(element, diagram)).toBeNull();
    });

    it("should create element node with name", () => {
      const element = new topLevelElement();
      element.name = "TestElement";
      const node = createElementNode(element, diagram);

      expect(node).not.toBeNull();
      expect(node!.name).toBe("TestElement");
      expect(node!.itemType).toBe(DiagramItemType.element);
    });

    it("should extract type information", () => {
      const element = new topLevelElement();
      element.name = "TestElement";
      element.type_ = "string";
      const node = createElementNode(element, diagram);

      expect(node!.type).toBe("string");
    });

    it("should extract documentation from annotation", () => {
      const element = new topLevelElement();
      element.name = "TestElement";
      element.annotation = {
        documentation: [{ value: "Test doc" }],
      };
      const node = createElementNode(element, diagram);

      expect(node!.documentation).toBe("Test doc");
    });
  });

  describe("createComplexTypeNode", () => {
    it("should return null for type without name", () => {
      const complexType = new topLevelComplexType();
      // Don't set name - it will be undefined
      expect(createComplexTypeNode(complexType, diagram)).toBeNull();
    });

    it("should create complex type node", () => {
      const complexType = new topLevelComplexType();
      complexType.name = "PersonType";
      const node = createComplexTypeNode(complexType, diagram);

      expect(node).not.toBeNull();
      expect(node!.name).toBe("PersonType");
      expect(node!.itemType).toBe(DiagramItemType.type);
      expect(node!.type).toBe("complexType");
    });

    it("should extract documentation", () => {
      const complexType = new topLevelComplexType();
      complexType.name = "PersonType";
      complexType.annotation = {
        documentation: [{ value: "A person type" }],
      };
      const node = createComplexTypeNode(complexType, diagram);

      expect(node!.documentation).toBe("A person type");
    });
  });

  describe("createSimpleTypeNode", () => {
    it("should return null for type without name", () => {
      const simpleType = new topLevelSimpleType();
      // Don't set name - it will be undefined
      expect(createSimpleTypeNode(simpleType, diagram)).toBeNull();
    });

    it("should create simple type node", () => {
      const simpleType = new topLevelSimpleType();
      simpleType.name = "AgeType";
      const node = createSimpleTypeNode(simpleType, diagram);

      expect(node).not.toBeNull();
      expect(node!.name).toBe("AgeType");
      expect(node!.itemType).toBe(DiagramItemType.type);
      expect(node!.type).toBe("simpleType");
      expect(node!.isSimpleContent).toBe(true);
    });

    it("should extract documentation", () => {
      const simpleType = new topLevelSimpleType();
      simpleType.name = "AgeType";
      simpleType.annotation = {
        documentation: [{ value: "Age restriction" }],
      };
      const node = createSimpleTypeNode(simpleType, diagram);

      expect(node!.documentation).toBe("Age restriction");
    });
  });
});
