/**
 * Unit tests for ID strategy implementation.
 */

import {
  generateSchemaId,
  parseSchemaId,
  isTopLevelId,
  getParentId,
  getNodeType,
  getNodeName,
  SchemaNodeType,
} from "./idStrategy";

describe("generateSchemaId", () => {
  describe("Top-level nodes", () => {
    test("should generate ID for top-level element", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "person",
      });
      expect(id).toBe("/element:person");
    });

    test("should generate ID for top-level complexType", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.ComplexType,
        name: "PersonType",
      });
      expect(id).toBe("/complexType:PersonType");
    });

    test("should generate ID for top-level simpleType", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.SimpleType,
        name: "EmailType",
      });
      expect(id).toBe("/simpleType:EmailType");
    });

    test("should generate ID for schema root", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.Schema,
      });
      expect(id).toBe("/schema");
    });
  });

  describe("Hierarchical nodes", () => {
    test("should generate ID for child element", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "address",
        parentId: "/element:person",
        position: 0,
      });
      expect(id).toBe("/element:person/element:address[0]");
    });

    test("should generate ID for nested child element", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "street",
        parentId: "/element:person/element:address[0]",
        position: 0,
      });
      expect(id).toBe("/element:person/element:address[0]/element:street[0]");
    });

    test("should generate ID for attribute", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.Attribute,
        name: "id",
        parentId: "/element:person",
        position: 0,
      });
      expect(id).toBe("/element:person/attribute:id[0]");
    });
  });

  describe("Anonymous types", () => {
    test("should generate ID for anonymous complex type", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.AnonymousComplexType,
        parentId: "/element:person",
        position: 0,
      });
      expect(id).toBe("/element:person/anonymousComplexType[0]");
    });

    test("should generate ID for anonymous simple type", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.AnonymousSimpleType,
        parentId: "/element:email",
        position: 0,
      });
      expect(id).toBe("/element:email/anonymousSimpleType[0]");
    });
  });

  describe("Namespaces", () => {
    test("should generate ID with namespace for element", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "person",
        namespace: "http://example.com/schema",
      });
      expect(id).toBe("/element:{http://example.com/schema}person");
    });

    test("should generate ID with namespace for complex type", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.ComplexType,
        name: "PersonType",
        namespace: "http://example.com/types",
      });
      expect(id).toBe("/complexType:{http://example.com/types}PersonType");
    });
  });

  describe("Parent ID normalization", () => {
    test("should handle parent ID without leading slash", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "child",
        parentId: "element:parent",
      });
      expect(id).toBe("/element:parent/element:child");
    });

    test("should handle parent ID with leading slash", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.Element,
        name: "child",
        parentId: "/element:parent",
      });
      expect(id).toBe("/element:parent/element:child");
    });
  });

  describe("Groups and imports", () => {
    test("should generate ID for group", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.Group,
        name: "personGroup",
      });
      expect(id).toBe("/group:personGroup");
    });

    test("should generate ID for attribute group", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.AttributeGroup,
        name: "commonAttrs",
      });
      expect(id).toBe("/attributeGroup:commonAttrs");
    });

    test("should generate ID for import with position", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.Import,
        position: 0,
      });
      expect(id).toBe("/import[0]");
    });

    test("should generate ID for include with position", () => {
      const id = generateSchemaId({
        nodeType: SchemaNodeType.Include,
        position: 1,
      });
      expect(id).toBe("/include[1]");
    });
  });
});

describe("parseSchemaId", () => {
  describe("Top-level nodes", () => {
    test("should parse top-level element ID", () => {
      const parsed = parseSchemaId("/element:person");
      expect(parsed.nodeType).toBe(SchemaNodeType.Element);
      expect(parsed.name).toBe("person");
      expect(parsed.parentId).toBeUndefined();
      expect(parsed.path).toEqual(["element:person"]);
    });

    test("should parse top-level complexType ID", () => {
      const parsed = parseSchemaId("/complexType:PersonType");
      expect(parsed.nodeType).toBe(SchemaNodeType.ComplexType);
      expect(parsed.name).toBe("PersonType");
      expect(parsed.parentId).toBeUndefined();
    });

    test("should parse schema root ID", () => {
      const parsed = parseSchemaId("/schema");
      expect(parsed.nodeType).toBe(SchemaNodeType.Schema);
      expect(parsed.name).toBeUndefined();
      expect(parsed.parentId).toBeUndefined();
    });
  });

  describe("Hierarchical nodes", () => {
    test("should parse child element ID", () => {
      const parsed = parseSchemaId("/element:person/element:address[0]");
      expect(parsed.nodeType).toBe(SchemaNodeType.Element);
      expect(parsed.name).toBe("address");
      expect(parsed.position).toBe(0);
      expect(parsed.parentId).toBe("/element:person");
      expect(parsed.path).toEqual(["element:person", "element:address[0]"]);
    });

    test("should parse deeply nested element ID", () => {
      const parsed = parseSchemaId(
        "/element:person/element:address[0]/element:street[0]"
      );
      expect(parsed.nodeType).toBe(SchemaNodeType.Element);
      expect(parsed.name).toBe("street");
      expect(parsed.position).toBe(0);
      expect(parsed.parentId).toBe("/element:person/element:address[0]");
    });
  });

  describe("Anonymous types", () => {
    test("should parse anonymous complex type ID", () => {
      const parsed = parseSchemaId("/element:person/anonymousComplexType[0]");
      expect(parsed.nodeType).toBe(SchemaNodeType.AnonymousComplexType);
      expect(parsed.name).toBeUndefined();
      expect(parsed.position).toBe(0);
      expect(parsed.parentId).toBe("/element:person");
    });

    test("should parse anonymous simple type ID", () => {
      const parsed = parseSchemaId("/element:email/anonymousSimpleType[0]");
      expect(parsed.nodeType).toBe(SchemaNodeType.AnonymousSimpleType);
      expect(parsed.position).toBe(0);
    });
  });

  describe("Namespaces", () => {
    test("should parse ID with namespace", () => {
      const parsed = parseSchemaId(
        "/element:{http://example.com/schema}person"
      );
      expect(parsed.nodeType).toBe(SchemaNodeType.Element);
      expect(parsed.name).toBe("person");
      expect(parsed.namespace).toBe("http://example.com/schema");
    });

    test("should parse nested ID with namespace", () => {
      const parsed = parseSchemaId(
        "/element:{http://example.com/schema}person/element:{http://example.com/schema}address[0]"
      );
      expect(parsed.name).toBe("address");
      expect(parsed.namespace).toBe("http://example.com/schema");
    });
  });

  describe("Error handling", () => {
    test("should throw error for ID without leading slash", () => {
      expect(() => parseSchemaId("element:person")).toThrow(
        "Invalid schema ID format"
      );
    });

    test("should throw error for empty string", () => {
      expect(() => parseSchemaId("")).toThrow("Invalid schema ID format");
    });
  });
});

describe("isTopLevelId", () => {
  test("should return true for top-level element", () => {
    expect(isTopLevelId("/element:person")).toBe(true);
  });

  test("should return true for top-level complexType", () => {
    expect(isTopLevelId("/complexType:PersonType")).toBe(true);
  });

  test("should return false for child element", () => {
    expect(isTopLevelId("/element:person/element:address[0]")).toBe(false);
  });

  test("should return false for nested element", () => {
    expect(
      isTopLevelId("/element:person/element:address[0]/element:street[0]")
    ).toBe(false);
  });

  test("should return true for schema root", () => {
    expect(isTopLevelId("/schema")).toBe(true);
  });

  test("should return true for top-level element with namespace", () => {
    expect(isTopLevelId("/element:{http://example.com/schema}person")).toBe(
      true
    );
  });

  test("should return false for child element with namespace", () => {
    expect(
      isTopLevelId(
        "/element:{http://example.com/schema}person/element:{http://example.com/schema}address[0]"
      )
    ).toBe(false);
  });
});

describe("getParentId", () => {
  test("should return undefined for top-level element", () => {
    expect(getParentId("/element:person")).toBeUndefined();
  });

  test("should return parent ID for child element", () => {
    expect(getParentId("/element:person/element:address[0]")).toBe(
      "/element:person"
    );
  });

  test("should return parent ID for deeply nested element", () => {
    expect(
      getParentId("/element:person/element:address[0]/element:street[0]")
    ).toBe("/element:person/element:address[0]");
  });

  test("should return parent ID for anonymous type", () => {
    expect(getParentId("/element:person/anonymousComplexType[0]")).toBe(
      "/element:person"
    );
  });
});

describe("getNodeType", () => {
  test("should return Element for element ID", () => {
    expect(getNodeType("/element:person")).toBe(SchemaNodeType.Element);
  });

  test("should return ComplexType for complexType ID", () => {
    expect(getNodeType("/complexType:PersonType")).toBe(
      SchemaNodeType.ComplexType
    );
  });

  test("should return SimpleType for simpleType ID", () => {
    expect(getNodeType("/simpleType:EmailType")).toBe(
      SchemaNodeType.SimpleType
    );
  });

  test("should return correct type for child element", () => {
    expect(getNodeType("/element:person/element:address[0]")).toBe(
      SchemaNodeType.Element
    );
  });

  test("should return correct type for anonymous type", () => {
    expect(getNodeType("/element:person/anonymousComplexType[0]")).toBe(
      SchemaNodeType.AnonymousComplexType
    );
  });
});

describe("getNodeName", () => {
  test("should return name for named element", () => {
    expect(getNodeName("/element:person")).toBe("person");
  });

  test("should return name for named complexType", () => {
    expect(getNodeName("/complexType:PersonType")).toBe("PersonType");
  });

  test("should return undefined for anonymous type", () => {
    expect(getNodeName("/element:person/anonymousComplexType[0]")).toBeUndefined();
  });

  test("should return name for child element", () => {
    expect(getNodeName("/element:person/element:address[0]")).toBe("address");
  });

  test("should return name with namespace stripped", () => {
    expect(getNodeName("/element:{http://example.com/schema}person")).toBe(
      "person"
    );
  });
});

describe("Round-trip conversion", () => {
  test("should generate and parse consistently for top-level element", () => {
    const params = {
      nodeType: SchemaNodeType.Element,
      name: "person",
    };
    const id = generateSchemaId(params);
    const parsed = parseSchemaId(id);
    expect(parsed.nodeType).toBe(params.nodeType);
    expect(parsed.name).toBe(params.name);
  });

  test("should generate and parse consistently for child element", () => {
    const params = {
      nodeType: SchemaNodeType.Element,
      name: "address",
      parentId: "/element:person",
      position: 0,
    };
    const id = generateSchemaId(params);
    const parsed = parseSchemaId(id);
    expect(parsed.nodeType).toBe(params.nodeType);
    expect(parsed.name).toBe(params.name);
    expect(parsed.position).toBe(params.position);
    expect(parsed.parentId).toBe(params.parentId);
  });

  test("should generate and parse consistently with namespace", () => {
    const params = {
      nodeType: SchemaNodeType.ComplexType,
      name: "PersonType",
      namespace: "http://example.com/types",
    };
    const id = generateSchemaId(params);
    const parsed = parseSchemaId(id);
    expect(parsed.nodeType).toBe(params.nodeType);
    expect(parsed.name).toBe(params.name);
    expect(parsed.namespace).toBe(params.namespace);
  });

  test("should generate and parse consistently for anonymous type", () => {
    const params = {
      nodeType: SchemaNodeType.AnonymousComplexType,
      parentId: "/element:person",
      position: 0,
    };
    const id = generateSchemaId(params);
    const parsed = parseSchemaId(id);
    expect(parsed.nodeType).toBe(params.nodeType);
    expect(parsed.position).toBe(params.position);
    expect(parsed.parentId).toBe(params.parentId);
  });
});

describe("Edge cases", () => {
  test("should handle element names with special characters", () => {
    const id = generateSchemaId({
      nodeType: SchemaNodeType.Element,
      name: "my-element_123",
    });
    expect(id).toBe("/element:my-element_123");
    const parsed = parseSchemaId(id);
    expect(parsed.name).toBe("my-element_123");
  });

  test("should handle multiple siblings with same name", () => {
    const id1 = generateSchemaId({
      nodeType: SchemaNodeType.Element,
      name: "item",
      parentId: "/element:list",
      position: 0,
    });
    const id2 = generateSchemaId({
      nodeType: SchemaNodeType.Element,
      name: "item",
      parentId: "/element:list",
      position: 1,
    });
    expect(id1).toBe("/element:list/element:item[0]");
    expect(id2).toBe("/element:list/element:item[1]");
    expect(id1).not.toBe(id2);
  });

  test("should handle zero position", () => {
    const id = generateSchemaId({
      nodeType: SchemaNodeType.Element,
      name: "first",
      parentId: "/element:parent",
      position: 0,
    });
    expect(id).toBe("/element:parent/element:first[0]");
    const parsed = parseSchemaId(id);
    expect(parsed.position).toBe(0);
  });
});
