/**
 * Unit tests for SchemaProcessors module.
 */

import {
  processExtension,
  processRestriction,
  processAnonymousSimpleType,
  processComplexType,
  extractRestrictionFacets,
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

  describe("extractRestrictionFacets", () => {
    it("should extract enumeration values", () => {
      const restriction = {
        enumeration: [{ value: "error" }, { value: "warning" }, { value: "info" }],
      };

      extractRestrictionFacets(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.enumeration).toEqual(["error", "warning", "info"]);
    });

    it("should extract pattern values", () => {
      const restriction = {
        pattern: [{ value: "[A-Z]{3}" }, { value: "[0-9]+" }],
      };

      extractRestrictionFacets(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.pattern).toEqual(["[A-Z]{3}", "[0-9]+"]);
    });

    it("should extract length constraints", () => {
      const restriction = {
        length: [{ value: 10 }],
        minLength: [{ value: 5 }],
        maxLength: [{ value: 255 }],
      };

      extractRestrictionFacets(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.length).toBe(10);
      expect(item.restrictions?.minLength).toBe(5);
      expect(item.restrictions?.maxLength).toBe(255);
    });

    it("should extract min/max value constraints", () => {
      const restriction = {
        minInclusive: [{ value: "0" }],
        maxInclusive: [{ value: "100" }],
      };

      extractRestrictionFacets(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.minInclusive).toBe("0");
      expect(item.restrictions?.maxInclusive).toBe("100");
    });

    it("should extract exclusive value constraints", () => {
      const restriction = {
        minExclusive: [{ value: "-10" }],
        maxExclusive: [{ value: "10" }],
      };

      extractRestrictionFacets(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.minExclusive).toBe("-10");
      expect(item.restrictions?.maxExclusive).toBe("10");
    });

    it("should extract digit constraints", () => {
      const restriction = {
        totalDigits: [{ value: 10 }],
        fractionDigits: [{ value: 2 }],
      };

      extractRestrictionFacets(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.totalDigits).toBe(10);
      expect(item.restrictions?.fractionDigits).toBe(2);
    });

    it("should extract whiteSpace constraint", () => {
      const restriction = {
        whiteSpace: [{ value: "collapse" }],
      };

      extractRestrictionFacets(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.whiteSpace).toBe("collapse");
    });

    it("should extract multiple facets at once", () => {
      const restriction = {
        enumeration: [{ value: "one" }, { value: "two" }],
        pattern: [{ value: "[a-z]+" }],
        minLength: [{ value: 1 }],
        maxLength: [{ value: 10 }],
      };

      extractRestrictionFacets(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.enumeration).toEqual(["one", "two"]);
      expect(item.restrictions?.pattern).toEqual(["[a-z]+"]);
      expect(item.restrictions?.minLength).toBe(1);
      expect(item.restrictions?.maxLength).toBe(10);
    });

    it("should not create restrictions object if no facets present", () => {
      const restriction = {};

      extractRestrictionFacets(item, restriction);

      expect(item.restrictions).toBeUndefined();
    });

    it("should handle empty arrays", () => {
      const restriction = {
        enumeration: [],
        pattern: [],
      };

      extractRestrictionFacets(item, restriction);

      expect(item.restrictions).toBeUndefined();
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

    it("should extract restriction facets when processing restriction", () => {
      item.type = "simpleType";
      const restriction = {
        base: "string",
        enumeration: [{ value: "A" }, { value: "B" }],
        maxLength: [{ value: 10 }],
      };

      processRestriction(item, restriction);

      expect(item.type).toBe("simpleType (restricts string)");
      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.enumeration).toEqual(["A", "B"]);
      expect(item.restrictions?.maxLength).toBe(10);
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
