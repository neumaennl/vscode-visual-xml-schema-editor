/**
 * Unit tests for DiagramBuilderHelpers module.
 */

import {
  extractDocumentation,
  extractOccurrenceConstraints,
  extractAttributes,
  generateId,
  resetIdCounter,
} from "./DiagramBuilderHelpers";
import { DiagramItem } from "./DiagramItem";
import { Diagram } from "./Diagram";
import { DiagramItemType } from "./DiagramTypes";

describe("DiagramBuilderHelpers", () => {
  describe("extractDocumentation", () => {
    it("should return undefined when no annotation", () => {
      expect(extractDocumentation(undefined)).toBeUndefined();
      expect(extractDocumentation({})).toBeUndefined();
    });

    it("should extract single documentation", () => {
      const annotation = {
        documentation: [{ value: "Test documentation" }],
      };
      expect(extractDocumentation(annotation)).toBe("Test documentation");
    });

    it("should extract multiple documentation entries", () => {
      const annotation = {
        documentation: [
          { value: "First line" },
          { value: "Second line" },
        ],
      };
      expect(extractDocumentation(annotation)).toBe("First line\nSecond line");
    });

    it("should handle empty documentation array", () => {
      const annotation = {
        documentation: [],
      };
      expect(extractDocumentation(annotation)).toBe("");
    });
  });

  describe("extractOccurrenceConstraints", () => {
    let diagram: Diagram;
    let item: DiagramItem;

    beforeEach(() => {
      diagram = new Diagram();
      item = new DiagramItem("test-1", "TestElement", DiagramItemType.element, diagram);
    });

    it("should extract minOccurs and maxOccurs", () => {
      const source = { minOccurs: 0, maxOccurs: 10 };
      extractOccurrenceConstraints(item, source);
      expect(item.minOccurrence).toBe(0);
      expect(item.maxOccurrence).toBe(10);
    });

    it("should handle unbounded maxOccurs", () => {
      const source = { maxOccurs: "unbounded" as const };
      extractOccurrenceConstraints(item, source);
      expect(item.maxOccurrence).toBe(-1);
    });
  });

  describe("extractAttributes", () => {
    let diagram: Diagram;
    let item: DiagramItem;

    beforeEach(() => {
      diagram = new Diagram();
      item = new DiagramItem("test-1", "TestElement", DiagramItemType.element, diagram);
    });

    it("should extract single attribute", () => {
      const source = {
        attribute: {
          name: "id",
          type_: "string",
          use: "required",
        },
      };
      extractAttributes(item, source);
      expect(item.attributes).toHaveLength(1);
      expect(item.attributes[0].name).toBe("id");
      expect(item.attributes[0].type).toBe("string");
    });

    it("should handle null/undefined source", () => {
      extractAttributes(item, null);
      expect(item.attributes).toHaveLength(0);
      
      extractAttributes(item, undefined);
      expect(item.attributes).toHaveLength(0);
    });

    it("should skip attributes without name", () => {
      const source = {
        attribute: [
          { type_: "string" }, // No name
          { name: "validAttr", type_: "string" },
        ],
      };
      extractAttributes(item, source);
      expect(item.attributes).toHaveLength(1);
      expect(item.attributes[0].name).toBe("validAttr");
    });

    it("should extract multiple attributes", () => {
      const source = {
        attribute: [
          { name: "id", type_: "string" },
          { name: "value", type_: "number" },
        ],
      };
      extractAttributes(item, source);
      expect(item.attributes).toHaveLength(2);
    });

    it("should handle attribute without type", () => {
      const source = {
        attribute: {
          name: "id",
        },
      };
      extractAttributes(item, source);
      expect(item.attributes).toHaveLength(1);
      expect(item.attributes[0].type).toBe("inner simpleType or ref");
    });

    it("should handle attribute without use", () => {
      const source = {
        attribute: {
          name: "id",
          type_: "string",
        },
      };
      extractAttributes(item, source);
      expect(item.attributes).toHaveLength(1);
      expect(item.attributes[0].use).toBeUndefined();
    });
  });

  describe("generateId", () => {
    it("should generate unique sequential IDs", () => {
      resetIdCounter();
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBe("item_0");
      expect(id2).toBe("item_1");
    });
  });
});
