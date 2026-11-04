/**
 * Integration tests: complex chained editing pipeline.
 *
 * Exercises realistic multi-command editing scenarios that go well beyond
 * single-handler unit tests. Each scenario chains several commands across
 * different handler groups (addComplexType → addElement → addComplexType
 * for anonymous types → addAttribute …) and verifies the final schema object
 * obtained by unmarshalling the resulting XML.
 *
 * The starting schema for the main scenario is the project's `example.xsd`.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types.js";
import type { SchemaCommand, localElement, topLevelComplexType } from "../../shared/types.js";
import {
  runCommandExpectSuccess,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./pipelineTestHelpers.js";

// ─── Fixture: project example schema ─────────────────────────────────────────

/** Read the shared example schema from disk so the test always reflects the real file. */
const EXAMPLE_XSD = readFileSync(resolve(import.meta.dirname, "../../exampleFiles/example.xsd"), "utf-8");

/**
 * The commands of the main scenario, in this order. Together they build the complexType
 * `OrderType` and the top-level element `order` in `example.xsd`.
 */
const BUILD_ORDER_TYPE: SchemaCommand[] = [
  // Step 1: add OrderType complexType with sequence
  {
    type: "addComplexType",
    payload: { parentId: "/schema", typeName: "OrderType", contentModel: "sequence" },
  },
  // Step 2: add orderId (xs:string, required 1..1)
  {
    type: "addElement",
    payload: {
      parentId: "/complexType:OrderType/sequence",
      elementName: "orderId",
      elementType: "xs:string",
      minOccurs: 1,
      maxOccurs: 1,
    },
  },
  // Step 3: add qty (xs:integer, optional 0..1)
  {
    type: "addElement",
    payload: {
      parentId: "/complexType:OrderType/sequence",
      elementName: "qty",
      elementType: "xs:integer",
      minOccurs: 0,
      maxOccurs: 1,
    },
  },
  // Step 4: add items WITHOUT a type (anonymous complexType comes next)
  // elementType is intentionally omitted here; the validator must accept this.
  {
    type: "addElement",
    payload: {
      parentId: "/complexType:OrderType/sequence",
      elementName: "items",
      minOccurs: 1,
      maxOccurs: "unbounded",
    },
  },
  // Step 5: attach anonymous complexType (sequence) to items
  {
    type: "addComplexType",
    payload: {
      parentId: "/complexType:OrderType/sequence/element:items",
      contentModel: "sequence",
    },
  },
  // Step 6: add item element inside items' anonymous complexType
  {
    type: "addElement",
    payload: {
      parentId: "/complexType:OrderType/sequence/element:items/anonymousComplexType[0]/sequence",
      elementName: "item",
      elementType: "lengthRestrictionType",
      minOccurs: 1,
      maxOccurs: "unbounded",
    },
  },
  // Step 7: add ref to the existing top-level element "example"
  {
    type: "addElement",
    payload: {
      parentId: "/complexType:OrderType/sequence",
      ref: "example",
      minOccurs: 0,
    },
  },
  // Step 8: add currency attribute to OrderType
  {
    type: "addAttribute",
    payload: {
      parentId: "/complexType:OrderType",
      attributeName: "currency",
      attributeType: "xs:string",
    },
  },
  // Step 9: add top-level order element of type OrderType
  {
    type: "addElement",
    payload: {
      parentId: "/schema",
      elementName: "order",
      elementType: "OrderType",
    },
  },
  // Step 10: add inline documentation to orderId
  {
    type: "modifyElement",
    payload: {
      elementId: "/complexType:OrderType/sequence/element:orderId",
      documentation: "Unique identifier for the order",
    },
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Integration: chained editing pipeline on example.xsd", () => {
  /**
   * Main scenario: build a complete OrderType with:
   * - `orderId`  xs:string,  minOccurs=1, maxOccurs=1
   * - `qty`      xs:integer, minOccurs=0, maxOccurs=1
   * - `items`    no type   , minOccurs=1, maxOccurs="unbounded"
   *              → anonymous complexType → sequence → item (lengthRestricitionType, 1..*)
   * - `example`  (ref element), minOccurs=0
   * - `currency` attribute (xs:string)
   * Plus a top-level `order` element of type OrderType.
   * Finally modifies `orderId` to carry inline documentation.
   */
  describe("builds OrderType with typed elements, an anonymous inner complexType, a reference, occurrence constraints, and an attribute", () => {
    let result: schema;
    let orderType: topLevelComplexType;
    let seqElements: localElement[];

    beforeEach(() => {
      result = unmarshal(schema, BUILD_ORDER_TYPE.reduce(runCommandExpectSuccess, EXAMPLE_XSD));
      orderType = (result.complexType ?? []).find((t) => t.name === "OrderType")!;
      seqElements = orderType.sequence?.element ?? [];
    });

    test("adds the top-level element order of type OrderType", () => {
      // Two top-level elements: example and order
      const topElements = result.element ?? [];
      expect(topElements.length).toBe(2);
      const orderElement = topElements.find((e) => e.name === "order");
      expect(orderElement).toBeDefined();
      expect(orderElement!.type_).toBe("OrderType");
    });

    test("adds OrderType with a sequence of four elements", () => {
      // Three named complexTypes: choiceType, loggingType, OrderType
      expect((result.complexType ?? []).length).toBe(3);
      expect(orderType).toBeDefined();
      expect(orderType.sequence).toBeDefined();
      // OrderType sequence: orderId, qty, items, example (ref)
      expect(seqElements.length).toBe(4);
    });

    test("adds orderId and qty with their types, occurrences and documentation", () => {
      // orderId: xs:string, 1..1, with documentation
      const orderIdEl = seqElements.find((e) => e.name === "orderId");
      expect(orderIdEl).toBeDefined();
      expect(orderIdEl!.type_).toBe("xs:string");
      expect(orderIdEl!.minOccurs).toBe(1);
      expect(orderIdEl!.maxOccurs).toBe(1);
      expect(orderIdEl!.annotation).toBeDefined();
      const documentationText = (orderIdEl!.annotation!.documentation ?? [])[0]?.value;
      expect(documentationText).toBe("Unique identifier for the order");

      // qty: xs:integer, 0..1
      const qtyEl = seqElements.find((e) => e.name === "qty");
      expect(qtyEl).toBeDefined();
      expect(qtyEl!.type_).toBe("xs:integer");
      expect(qtyEl!.minOccurs).toBe(0);
      expect(qtyEl!.maxOccurs).toBe(1);
    });

    test("adds items with an anonymous complexType that holds item", () => {
      // items: no type attribute, 1..unbounded, with anonymous complexType
      const itemsEl = seqElements.find((e) => e.name === "items");
      expect(itemsEl).toBeDefined();
      expect(itemsEl!.type_).toBeUndefined();
      expect(itemsEl!.minOccurs).toBe(1);
      expect(itemsEl!.maxOccurs).toBe("unbounded");
      expect(itemsEl!.complexType).toBeDefined();

      // items anonymous complexType → sequence → item (lengthRestrictionType, 1..*)
      const itemsAnonCT = itemsEl!.complexType!;
      expect(itemsAnonCT.sequence).toBeDefined();
      const innerElements = itemsAnonCT.sequence!.element ?? [];
      expect(innerElements.length).toBe(1);
      const itemEl = innerElements.find((e) => e.name === "item");
      expect(itemEl).toBeDefined();
      expect(itemEl!.type_).toBe("lengthRestrictionType");
      expect(itemEl!.minOccurs).toBe(1);
      expect(itemEl!.maxOccurs).toBe("unbounded");
    });

    test("adds the reference to example and the attribute currency", () => {
      // example ref element, minOccurs=0
      const exampleRef = seqElements.find((e) => e.ref === "example");
      expect(exampleRef).toBeDefined();
      expect(exampleRef!.minOccurs).toBe(0);

      // currency attribute on OrderType
      const attrs = orderType.attribute ?? [];
      expect(attrs.length).toBe(1);
      expect(attrs[0].name).toBe("currency");
      expect(attrs[0].type_).toBe("xs:string");
    });
  });

  test("rejects adding a duplicate element into OrderType sequence", () => {
    // Build a schema that already has orderId in OrderType/sequence
    let xml = runCommandExpectSuccess(EXAMPLE_XSD, {
      type: "addComplexType",
      payload: { parentId: "/schema", typeName: "OrderType", contentModel: "sequence" },
    });
    xml = runCommandExpectSuccess(xml, {
      type: "addElement",
      payload: {
        parentId: "/complexType:OrderType/sequence",
        elementName: "orderId",
        elementType: "xs:string",
      },
    });

    // Attempt to add orderId again
    runCommandExpectValidationFailure(
      xml,
      {
        type: "addElement",
        payload: {
          parentId: "/complexType:OrderType/sequence",
          elementName: "orderId",
          elementType: "xs:integer",
        },
      },
      "Cannot add element: duplicate element name 'orderId' in sequence"
    );
  });

  test("replaces an element type attribute when adding an anonymous complexType", () => {
    // qty starts with a type attribute and is then converted to an inline complexType
    let xml = runCommandExpectSuccess(EXAMPLE_XSD, {
      type: "addComplexType",
      payload: { parentId: "/schema", typeName: "OrderType", contentModel: "sequence" },
    });
    xml = runCommandExpectSuccess(xml, {
      type: "addElement",
      payload: {
        parentId: "/complexType:OrderType/sequence",
        elementName: "qty",
        elementType: "xs:integer",
      },
    });

    xml = runCommandExpectSuccess(xml, {
      type: "addComplexType",
      payload: {
        parentId: "/complexType:OrderType/sequence/element:qty",
        contentModel: "sequence",
      },
    });

    const result = unmarshal(schema, xml);
    const orderType = (result.complexType ?? []).find((t) => t.name === "OrderType");
    const qtyEl = (orderType!.sequence!.element ?? []).find((e) => e.name === "qty");
    expect(qtyEl).toBeDefined();
    expect(qtyEl!.type_).toBeUndefined();
    expect(qtyEl!.complexType?.sequence).toBeDefined();
  });

  test("chains addElement without type, then addSimpleType with enumeration restrictions", () => {
    // Build schema with OrderType, then add a status element with anonymous simpleType
    let xml = runCommandExpectSuccess(EXAMPLE_XSD, {
      type: "addComplexType",
      payload: { parentId: "/schema", typeName: "OrderType", contentModel: "sequence" },
    });

    // Add status element without a type (will carry an anonymous simpleType)
    xml = runCommandExpectSuccess(xml, {
      type: "addElement",
      payload: {
        parentId: "/complexType:OrderType/sequence",
        elementName: "status",
      },
    });

    // Add anonymous simpleType with enumeration restrictions in one command
    xml = runCommandExpectSuccess(xml, {
      type: "addSimpleType",
      payload: {
        parentId: "/complexType:OrderType/sequence/element:status",
        baseType: "xs:string",
        restrictions: {
          enumeration: ["pending", "shipped", "delivered"],
        },
      },
    });

    const result = unmarshal(schema, xml);
    const orderType = (result.complexType ?? []).find((t) => t.name === "OrderType");
    expect(orderType).toBeDefined();

    const statusEl = (orderType!.sequence!.element ?? []).find((e) => e.name === "status");
    expect(statusEl).toBeDefined();
    expect(statusEl!.type_).toBeUndefined();
    expect(statusEl!.simpleType).toBeDefined();

    const restriction = statusEl!.simpleType!.restriction!;
    expect(restriction.base).toBe("xs:string");
    const enumerations = restriction.enumeration ?? [];
    expect(enumerations.length).toBe(3);
    const values = enumerations.map((e) => e.value);
    expect(values).toContain("pending");
    expect(values).toContain("shipped");
    expect(values).toContain("delivered");
  });

  test("correctly wires an element reference to an existing element and verifies ref round-trip", () => {
    // Start from example.xsd and add a complexType that references the existing
    // top-level "example" element via a ref (checking that the element remains
    // unreferenced by type_, only by ref).
    let xml = runCommandExpectSuccess(EXAMPLE_XSD, {
      type: "addComplexType",
      payload: { parentId: "/schema", typeName: "WrapperType", contentModel: "sequence" },
    });

    xml = runCommandExpectSuccess(xml, {
      type: "addElement",
      payload: {
        parentId: "/complexType:WrapperType/sequence",
        ref: "example",
        minOccurs: 0,
        maxOccurs: "unbounded",
      },
    });

    const result: schema = runCommandExpectSuccessSchema(xml, {
      type: "addElement",
      payload: { parentId: "/schema", elementName: "wrapper", elementType: "WrapperType" },
    });

    const wrapperType = (result.complexType ?? []).find((t) => t.name === "WrapperType");
    expect(wrapperType).toBeDefined();

    const refEls = wrapperType!.sequence!.element ?? [];
    expect(refEls.length).toBe(1);
    expect(refEls[0].ref).toBe("example");
    expect(refEls[0].name).toBeUndefined();
    expect(refEls[0].type_).toBeUndefined();
    expect(refEls[0].minOccurs).toBe(0);
    expect(refEls[0].maxOccurs).toBe("unbounded");
  });
});
