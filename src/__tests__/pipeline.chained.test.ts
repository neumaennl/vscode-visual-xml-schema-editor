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

import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import type {
  AddComplexTypeCommand,
  AddElementCommand,
  AddAttributeCommand,
  ModifyElementCommand,
} from "../../shared/types";
import {
  runCommandExpectSuccess,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./testHelpers";

// ─── Fixture: project example schema ─────────────────────────────────────────

/**
 * The `exampleFiles/example.xsd` content inlined as a test fixture.
 *
 * Starting state:
 *  - 1 top-level element: `example` (with inline anonymous complexType)
 *  - 2 named complexTypes: `choiceType`, `loggingType`
 *  - 1 named simpleType: `lengthRestricitionType`
 */
const EXAMPLE_XSD = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified"
  attributeFormDefault="unqualified">
  <xs:element name="example">
    <xs:annotation>
      <xs:documentation>root element</xs:documentation>
    </xs:annotation>
    <xs:complexType>
      <xs:sequence>
        <xs:element name="meta" type="choiceType" minOccurs="0" />
        <xs:element name="product" type="loggingType" minOccurs="0" maxOccurs="unbounded" />
      </xs:sequence>
      <xs:attribute name="created" type="xs:dateTime" use="required" />
    </xs:complexType>
  </xs:element>

  <xs:complexType name="choiceType">
    <xs:annotation>
      <xs:documentation>complexType showing a choice</xs:documentation>
    </xs:annotation>
    <xs:choice>
      <xs:element name="either" type="lengthRestricitionType" minOccurs="1" maxOccurs="unbounded" />
      <xs:element name="or" type="lengthRestricitionType" minOccurs="2" maxOccurs="4" />
    </xs:choice>
    <xs:attribute name="url" type="xs:anyURI" use="optional" />
  </xs:complexType>

  <xs:complexType name="loggingType">
    <xs:annotation>
      <xs:documentation>complexType decribing a log entry</xs:documentation>
    </xs:annotation>
    <xs:all>
      <xs:element name="time" type="xs:dateTime" />
      <xs:element name="message" type="xs:string"/>
    </xs:all>
    <xs:attribute name="logLevel" use="required">
      <xs:simpleType>
        <xs:restriction base="xs:string">
          <xs:enumeration value="error" />
          <xs:enumeration value="warning" />
          <xs:enumeration value="info" />
          <xs:enumeration value="debug" />
          <xs:enumeration value="trace" />
        </xs:restriction>
      </xs:simpleType>
    </xs:attribute>
  </xs:complexType>

  <xs:simpleType name="lengthRestricitionType">
    <xs:annotation>
      <xs:documentation>a simple string with a max length</xs:documentation>
    </xs:annotation>
    <xs:restriction base="xs:string">
      <xs:maxLength value="255" />
    </xs:restriction>
  </xs:simpleType>
</xs:schema>`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Runs a typed command against the current XML and returns the updated XML.
 * Thin alias for `runCommandExpectSuccess` that preserves the typed cmd parameter.
 */
function step(xml: string, cmd: Parameters<typeof runCommandExpectSuccess>[1]): string {
  return runCommandExpectSuccess(xml, cmd);
}

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
  it("builds OrderType with typed elements, an anonymous inner complexType, a reference, occurrence constraints, and an attribute", () => {
    // ── Step 1: add OrderType complexType with sequence ─────────────────────
    const addOrderType: AddComplexTypeCommand = {
      type: "addComplexType",
      payload: { parentId: "schema", typeName: "OrderType", contentModel: "sequence" },
    };
    let xml = step(EXAMPLE_XSD, addOrderType);

    // ── Step 2: add orderId (xs:string, required 1..1) ───────────────────────
    const addOrderId: AddElementCommand = {
      type: "addElement",
      payload: {
        parentId: "/complexType:OrderType/sequence",
        elementName: "orderId",
        elementType: "xs:string",
        minOccurs: 1,
        maxOccurs: 1,
      },
    };
    xml = step(xml, addOrderId);

    // ── Step 3: add qty (xs:integer, optional 0..1) ──────────────────────────
    const addQty: AddElementCommand = {
      type: "addElement",
      payload: {
        parentId: "/complexType:OrderType/sequence",
        elementName: "qty",
        elementType: "xs:integer",
        minOccurs: 0,
        maxOccurs: 1,
      },
    };
    xml = step(xml, addQty);

    // ── Step 4: add items WITHOUT a type (anonymous complexType comes next) ──
    // elementType is intentionally omitted here; the validator must accept this.
    const addItems: AddElementCommand = {
      type: "addElement",
      payload: {
        parentId: "/complexType:OrderType/sequence",
        elementName: "items",
        minOccurs: 1,
        maxOccurs: "unbounded",
      },
    };
    xml = step(xml, addItems);

    // ── Step 5: attach anonymous complexType (sequence) to items ─────────────
    const addItemsAnonCT: AddComplexTypeCommand = {
      type: "addComplexType",
      payload: {
        parentId: "/complexType:OrderType/sequence/element:items",
        contentModel: "sequence",
      },
    };
    xml = step(xml, addItemsAnonCT);

    // ── Step 6: add item element inside items' anonymous complexType ──────────
    const addItem: AddElementCommand = {
      type: "addElement",
      payload: {
        parentId: "/complexType:OrderType/sequence/element:items/anonymousComplexType[0]/sequence",
        elementName: "item",
        elementType: "lengthRestricitionType",
        minOccurs: 1,
        maxOccurs: "unbounded",
      },
    };
    xml = step(xml, addItem);

    // ── Step 7: add ref to the existing top-level element "example" ──────────
    const addExampleRef: AddElementCommand = {
      type: "addElement",
      payload: {
        parentId: "/complexType:OrderType/sequence",
        ref: "example",
        minOccurs: 0,
      },
    };
    xml = step(xml, addExampleRef);

    // ── Step 8: add currency attribute to OrderType ───────────────────────────
    const addCurrency: AddAttributeCommand = {
      type: "addAttribute",
      payload: {
        parentId: "/complexType:OrderType",
        attributeName: "currency",
        attributeType: "xs:string",
      },
    };
    xml = step(xml, addCurrency);

    // ── Step 9: add top-level order element of type OrderType ─────────────────
    const addOrderElement: AddElementCommand = {
      type: "addElement",
      payload: {
        parentId: "schema",
        elementName: "order",
        elementType: "OrderType",
      },
    };
    xml = step(xml, addOrderElement);

    // ── Step 10: add inline documentation to orderId ──────────────────────────
    const documentOrderId: ModifyElementCommand = {
      type: "modifyElement",
      payload: {
        elementId: "/complexType:OrderType/sequence/element:orderId",
        documentation: "Unique identifier for the order",
      },
    };
    xml = step(xml, documentOrderId);

    // ── Assertions on final schema ────────────────────────────────────────────
    const result = unmarshal(schema, xml);

    // Two top-level elements: example and order
    const topElements = toArray(result.element);
    expect(topElements.length).toBe(2);
    const orderElement = topElements.find((e) => e.name === "order");
    expect(orderElement).toBeDefined();
    expect(orderElement!.type_).toBe("OrderType");

    // Three named complexTypes: choiceType, loggingType, OrderType
    const complexTypes = toArray(result.complexType);
    expect(complexTypes.length).toBe(3);

    const orderType = complexTypes.find((t) => t.name === "OrderType");
    expect(orderType).toBeDefined();
    expect(orderType!.sequence).toBeDefined();

    // OrderType sequence: orderId, qty, items, example (ref) → 4 elements
    const seqElements = toArray(orderType!.sequence!.element);
    expect(seqElements.length).toBe(4);

    // orderId: xs:string, 1..1, with documentation
    const orderIdEl = seqElements.find((e) => e.name === "orderId");
    expect(orderIdEl).toBeDefined();
    expect(orderIdEl!.type_).toBe("xs:string");
    expect(Number(orderIdEl!.minOccurs)).toBe(1);
    expect(Number(orderIdEl!.maxOccurs)).toBe(1);
    expect(orderIdEl!.annotation).toBeDefined();
    const docText = toArray(orderIdEl!.annotation!.documentation)[0]?.value;
    expect(docText).toBe("Unique identifier for the order");

    // qty: xs:integer, 0..1
    const qtyEl = seqElements.find((e) => e.name === "qty");
    expect(qtyEl).toBeDefined();
    expect(qtyEl!.type_).toBe("xs:integer");
    expect(Number(qtyEl!.minOccurs)).toBe(0);
    expect(Number(qtyEl!.maxOccurs)).toBe(1);

    // items: no type attribute, 1..unbounded, with anonymous complexType
    const itemsEl = seqElements.find((e) => e.name === "items");
    expect(itemsEl).toBeDefined();
    expect(itemsEl!.type_).toBeUndefined();
    expect(Number(itemsEl!.minOccurs)).toBe(1);
    expect(itemsEl!.maxOccurs).toBe("unbounded");
    expect(itemsEl!.complexType).toBeDefined();

    // items anonymous complexType → sequence → item (lengthRestricitionType, 1..*)
    const itemsAnonCT = itemsEl!.complexType!;
    expect(itemsAnonCT.sequence).toBeDefined();
    const innerElements = toArray(itemsAnonCT.sequence!.element);
    expect(innerElements.length).toBe(1);
    const itemEl = innerElements.find((e) => e.name === "item");
    expect(itemEl).toBeDefined();
    expect(itemEl!.type_).toBe("lengthRestricitionType");
    expect(Number(itemEl!.minOccurs)).toBe(1);
    expect(itemEl!.maxOccurs).toBe("unbounded");

    // example ref element, minOccurs=0
    const exampleRef = seqElements.find((e) => e.ref === "example");
    expect(exampleRef).toBeDefined();
    expect(Number(exampleRef!.minOccurs)).toBe(0);

    // currency attribute on OrderType
    const attrs = toArray(orderType!.attribute);
    expect(attrs.length).toBe(1);
    expect(attrs[0].name).toBe("currency");
    expect(attrs[0].type_).toBe("xs:string");
  });

  it("rejects adding a duplicate element into OrderType sequence", () => {
    // Build a schema that already has orderId in OrderType/sequence
    let xml = step(EXAMPLE_XSD, {
      type: "addComplexType",
      payload: { parentId: "schema", typeName: "OrderType", contentModel: "sequence" },
    } as AddComplexTypeCommand);
    xml = step(xml, {
      type: "addElement",
      payload: {
        parentId: "/complexType:OrderType/sequence",
        elementName: "orderId",
        elementType: "xs:string",
      },
    } as AddElementCommand);

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
      } as AddElementCommand,
      "Cannot add element: duplicate element name 'orderId' in sequence"
    );
  });

  it("rejects adding an anonymous complexType to an element that already has a type attribute", () => {
    // qty has type xs:integer – adding an anonymous complexType must be rejected
    let xml = step(EXAMPLE_XSD, {
      type: "addComplexType",
      payload: { parentId: "schema", typeName: "OrderType", contentModel: "sequence" },
    } as AddComplexTypeCommand);
    xml = step(xml, {
      type: "addElement",
      payload: {
        parentId: "/complexType:OrderType/sequence",
        elementName: "qty",
        elementType: "xs:integer",
      },
    } as AddElementCommand);

    runCommandExpectValidationFailure(
      xml,
      {
        type: "addComplexType",
        payload: {
          parentId: "/complexType:OrderType/sequence/element:qty",
          contentModel: "sequence",
        },
      } as AddComplexTypeCommand,
      "'/complexType:OrderType/sequence/element:qty' already has a type attribute ('xs:integer'); cannot add an inline complexType"
    );
  });

  it("chains addElement without type, then addSimpleType with enumeration restrictions", () => {
    // Build schema with OrderType, then add a status element with anonymous simpleType
    let xml = step(EXAMPLE_XSD, {
      type: "addComplexType",
      payload: { parentId: "schema", typeName: "OrderType", contentModel: "sequence" },
    } as AddComplexTypeCommand);

    // Add status element without a type (will carry an anonymous simpleType)
    xml = step(xml, {
      type: "addElement",
      payload: {
        parentId: "/complexType:OrderType/sequence",
        elementName: "status",
      },
    } as AddElementCommand);

    // Add anonymous simpleType with enumeration restrictions in one command
    xml = step(xml, {
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
    const orderType = toArray(result.complexType).find((t) => t.name === "OrderType");
    expect(orderType).toBeDefined();

    const statusEl = toArray(orderType!.sequence!.element).find((e) => e.name === "status");
    expect(statusEl).toBeDefined();
    expect(statusEl!.type_).toBeUndefined();
    expect(statusEl!.simpleType).toBeDefined();

    const restriction = statusEl!.simpleType!.restriction!;
    expect(restriction.base).toBe("xs:string");
    const enumerations = toArray(restriction.enumeration);
    expect(enumerations.length).toBe(3);
    const values = enumerations.map((e) => e.value);
    expect(values).toContain("pending");
    expect(values).toContain("shipped");
    expect(values).toContain("delivered");
  });

  it("correctly wires an element reference to an existing element and verifies ref round-trip", () => {
    // Start from example.xsd and add a complexType that references the existing
    // top-level "example" element via a ref (checking that the element remains
    // unreferenced by type_, only by ref).
    let xml = step(EXAMPLE_XSD, {
      type: "addComplexType",
      payload: { parentId: "schema", typeName: "WrapperType", contentModel: "sequence" },
    } as AddComplexTypeCommand);

    xml = step(xml, {
      type: "addElement",
      payload: {
        parentId: "/complexType:WrapperType/sequence",
        ref: "example",
        minOccurs: 0,
        maxOccurs: "unbounded",
      },
    } as AddElementCommand);

    const result: schema = runCommandExpectSuccessSchema(xml, {
      type: "addElement",
      payload: { parentId: "schema", elementName: "wrapper", elementType: "WrapperType" },
    } as AddElementCommand);

    const wrapperType = toArray(result.complexType).find((t) => t.name === "WrapperType");
    expect(wrapperType).toBeDefined();

    const refEls = toArray(wrapperType!.sequence!.element);
    expect(refEls.length).toBe(1);
    expect(refEls[0].ref).toBe("example");
    expect(refEls[0].name).toBeUndefined();
    expect(refEls[0].type_).toBeUndefined();
    expect(Number(refEls[0].minOccurs)).toBe(0);
    expect(refEls[0].maxOccurs).toBe("unbounded");
  });
});
