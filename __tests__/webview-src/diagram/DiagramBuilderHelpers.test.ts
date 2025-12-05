/**
 * Unit tests for DiagramBuilderHelpers module.
 */

import {
  toArray,
  extractDocumentation,
  extractOccurrenceConstraints,
  extractAttributes,
  generateId,
  resetIdCounter,
} from "../DiagramBuilderHelpers";
import { DiagramItem } from "../DiagramItem";
import { Diagram } from "../Diagram";
import { DiagramItemType } from "../DiagramTypes";

describe("DiagramBuilderHelpers", () => {
  describe("toArray", () => {
    it("should return empty array for undefined", () => {
      expect(toArray(undefined)).toEqual([]);
    });

    it("should wrap single value in array", () => {
      expect(toArray("single")).toEqual(["single"]);
      expect(toArray(42)).toEqual([42]);
    });

    it("should return array unchanged", () => {
      const arr = ["a", "b", "c"];
      expect(toArray(arr)).toEqual(arr);
    });
  });

  describe("extractDocumentation", () => {
    it("should return undefined when no annotation", () => {
      expect(extractDocumentation(undefined)).toBeUndefined();
      expect(extractDocumentation({})).toBeUndefined();
    });

    it("should extract single documentation", () => {
      const annotation = {
        documentation: { value: "Test documentation" },
      };
      expect(extractDocumentation(annotation)).toBe("Test documentation");
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
      const source = { minOccurs: "0", maxOccurs: "10" };
      extractOccurrenceConstraints(item, source);
      expect(item.minOccurrence).toBe(0);
      expect(item.maxOccurrence).toBe(10);
    });

    it("should handle unbounded maxOccurs", () => {
      const source = { maxOccurs: "unbounded" };
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
