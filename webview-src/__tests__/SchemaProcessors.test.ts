/**
 * Unit tests for SchemaProcessors module.
 */

import {
  processExtension,
  processRestriction,
  processAnonymousSimpleType,
  processComplexType,
} from "../diagram/SchemaProcessors";
import { DiagramItem } from "../diagram/DiagramItem";
import { Diagram } from "../diagram/Diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";

describe("SchemaProcessors", () => {
  let diagram: Diagram;
  let item: DiagramItem;

  beforeEach(() => {
    diagram = new Diagram();
    item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
  });

  describe("processExtension", () => {
    it("should append extension info to existing type", () => {
      item.type = "complexType";
      const extension = { base: "BaseType" };

      processExtension(item, extension);

      expect(item.type).toBe("complexType (extends BaseType)");
    });

    it("should append extension info to empty type", () => {
      item.type = "";
      const extension = { base: "BaseType" };

      processExtension(item, extension);

      expect(item.type).toBe(" (extends BaseType)");
    });
  });

  describe("processRestriction", () => {
    it("should append restriction info to existing type", () => {
      item.type = "simpleType";
      const restriction = { base: "string" };

      processRestriction(item, restriction);

      expect(item.type).toBe("simpleType (restricts string)");
    });

    it("should append restriction info to empty type", () => {
      item.type = "";
      const restriction = { base: "integer" };

      processRestriction(item, restriction);

      expect(item.type).toBe(" (restricts integer)");
    });
  });

  describe("processAnonymousSimpleType", () => {
    it("should set type before processing restriction", () => {
      const simpleType = {
        restriction: { base: "string" },
      };

      processAnonymousSimpleType(item, simpleType);

      expect(item.isSimpleContent).toBe(true);
      expect(item.type).toContain("anonymous simpleType");
      expect(item.type).toContain("restricts string");
    });

    it("should mark item as simple content", () => {
      const simpleType = {};

      processAnonymousSimpleType(item, simpleType);

      expect(item.isSimpleContent).toBe(true);
    });
  });

  describe("processComplexType", () => {
    it("should process complexContent with extension", () => {
      item.type = "complexType";
      const complexType = {
        complexContent: {
          extension: { base: "BaseType" },
        },
      };

      processComplexType(item, complexType);

      expect(item.type).toContain("with complexContent");
      expect(item.type).toContain("extends BaseType");
    });

    it("should process simpleContent with restriction", () => {
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
  });
});
