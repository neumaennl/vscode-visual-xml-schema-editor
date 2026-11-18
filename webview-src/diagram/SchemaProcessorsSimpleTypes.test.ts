/**
 * Unit tests for `SchemaProcessorsSimpleTypes`: the restrictions of simple types and their facets.
 */

import { processRestriction } from "./SchemaProcessorsSimpleTypes";
import { DiagramItem } from "./DiagramItem";
import { Diagram } from "./Diagram";
import { DiagramItemType } from "./DiagramTypes";

describe("SchemaProcessorsSimpleTypes", () => {
  let item: DiagramItem;

  beforeEach(() => {
    item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, new Diagram());
  });

  describe("processRestriction: facets", () => {
    test("should extract enumeration values", () => {
      const restriction = {
        base: "xs:string",
        enumeration: [{ value: "error" }, { value: "warning" }, { value: "info" }],
      };

      processRestriction(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.enumeration).toEqual(["error", "warning", "info"]);
    });

    test("should extract pattern values", () => {
      const restriction = {
        base: "xs:string",
        pattern: [{ value: "[A-Z]{3}" }, { value: "[0-9]+" }],
      };

      processRestriction(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.pattern).toEqual(["[A-Z]{3}", "[0-9]+"]);
    });

    test("should extract length constraints", () => {
      const restriction = {
        base: "xs:string",
        length: [{ value: 10 }],
        minLength: [{ value: 5 }],
        maxLength: [{ value: 255 }],
      };

      processRestriction(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.length).toBe(10);
      expect(item.restrictions?.minLength).toBe(5);
      expect(item.restrictions?.maxLength).toBe(255);
    });

    test("should extract min/max value constraints", () => {
      const restriction = {
        base: "xs:string",
        minInclusive: [{ value: "0" }],
        maxInclusive: [{ value: "100" }],
      };

      processRestriction(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.minInclusive).toBe("0");
      expect(item.restrictions?.maxInclusive).toBe("100");
    });

    test("should extract exclusive value constraints", () => {
      const restriction = {
        base: "xs:string",
        minExclusive: [{ value: "-10" }],
        maxExclusive: [{ value: "10" }],
      };

      processRestriction(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.minExclusive).toBe("-10");
      expect(item.restrictions?.maxExclusive).toBe("10");
    });

    test("should extract digit constraints", () => {
      const restriction = {
        base: "xs:string",
        totalDigits: [{ value: 10 }],
        fractionDigits: [{ value: 2 }],
      };

      processRestriction(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.totalDigits).toBe(10);
      expect(item.restrictions?.fractionDigits).toBe(2);
    });

    test("should extract whiteSpace constraint", () => {
      const restriction = {
        base: "xs:string",
        whiteSpace: [{ value: "collapse" }],
      };

      processRestriction(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.whiteSpace).toBe("collapse");
    });

    test("should leave out a whiteSpace value that the schema does not allow", () => {
      const restriction = { base: "xs:string", whiteSpace: [{ value: "trim" }], length: [{ value: 3 }] };

      processRestriction(item, restriction);

      expect(item.restrictions).toEqual({ length: 3 });
    });

    test("should extract multiple facets at once", () => {
      const restriction = {
        base: "xs:string",
        enumeration: [{ value: "one" }, { value: "two" }],
        pattern: [{ value: "[a-z]+" }],
        minLength: [{ value: 1 }],
        maxLength: [{ value: 10 }],
      };

      processRestriction(item, restriction);

      expect(item.restrictions).toBeDefined();
      expect(item.restrictions?.enumeration).toEqual(["one", "two"]);
      expect(item.restrictions?.pattern).toEqual(["[a-z]+"]);
      expect(item.restrictions?.minLength).toBe(1);
      expect(item.restrictions?.maxLength).toBe(10);
    });

    test("should not create restrictions object if no facets present", () => {
      const restriction = { base: "xs:string" };

      processRestriction(item, restriction);

      expect(item.restrictions).toBeUndefined();
    });

    test("should handle empty arrays", () => {
      const restriction = {
        base: "xs:string",
        enumeration: [],
        pattern: [],
      };

      processRestriction(item, restriction);

      expect(item.restrictions).toBeUndefined();
    });
  });

  describe("processRestriction", () => {
    test("should append restriction info to existing type", () => {
      item.type = "simpleType";
      const restriction = { base: "string" };

      processRestriction(item, restriction);

      expect(item.type).toBe("simpleType (restricts string)");
    });

    test("should append restriction info to empty type", () => {
      item.type = "";
      const restriction = { base: "integer" };

      processRestriction(item, restriction);

      expect(item.type).toBe(" (restricts integer)");
    });

    test("should extract restriction facets when processing restriction", () => {
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
});
