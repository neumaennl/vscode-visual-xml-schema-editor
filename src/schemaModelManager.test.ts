/**
 * Unit tests for SchemaModelManager.
 * Tests schema loading, marshalling/unmarshalling, and query capabilities.
 */

import { SchemaModelManager } from "./schemaModelManager.js";
import { schema } from "../shared/types.js";
import { emptySchemaXml, readTestXml, schemaXmlWith } from "./__tests__/schemaTestHelpers.js";

/** A schema with a target namespace and the element `root`. */
const SCHEMA_WITH_TARGET_NAMESPACE = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/test">
  <xs:element name="root" type="xs:string"/>
</xs:schema>`;

describe("SchemaModelManager", () => {
  describe("constructor", () => {
    test("should create an instance with no initial schema", () => {
      const manager = new SchemaModelManager();
      expect(manager.isLoaded()).toBe(false);
      expect(manager.getSchema()).toBeNull();
    });

    test("should create an instance with initial schema", () => {
      const testSchema = new schema();
      testSchema.targetNamespace = "http://example.com/test";

      const manager = new SchemaModelManager(testSchema);
      expect(manager.isLoaded()).toBe(true);
      expect(manager.getSchema()).toBe(testSchema);
      expect(manager.getTargetNamespace()).toBe("http://example.com/test");
    });
  });

  describe("loadFromXml", () => {
    test("should load schema from valid XML", () => {
      const manager = new SchemaModelManager();
      const xml = SCHEMA_WITH_TARGET_NAMESPACE;

      manager.loadFromXml(xml);

      expect(manager.isLoaded()).toBe(true);
      expect(manager.getTargetNamespace()).toBe("http://example.com/test");
      expect(manager.getAllElements()).toHaveLength(1);
      expect(manager.getAllElements()[0].name).toBe("root");
    });

    test("should throw error for invalid XML", () => {
      const manager = new SchemaModelManager();
      const invalidXml = "not valid xml";

      expect(() => {
        manager.loadFromXml(invalidXml);
      }).toThrow("Failed to load schema from XML");
    });

    test("should replace existing schema when loading new one", () => {
      const manager = new SchemaModelManager();
      const xml1 = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/first">
</xs:schema>`;

      const xml2 = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/second">
</xs:schema>`;

      manager.loadFromXml(xml1);
      expect(manager.getTargetNamespace()).toBe("http://example.com/first");

      manager.loadFromXml(xml2);
      expect(manager.getTargetNamespace()).toBe("http://example.com/second");
    });
  });

  describe("getSchema and setSchema", () => {
    test("should get the current schema", () => {
      const testSchema = new schema();
      testSchema.targetNamespace = "http://example.com/test";

      const manager = new SchemaModelManager(testSchema);
      const retrieved = manager.getSchema();

      expect(retrieved).toBe(testSchema);
      expect(retrieved?.targetNamespace).toBe("http://example.com/test");
    });

    test("should set a new schema", () => {
      const manager = new SchemaModelManager();
      expect(manager.isLoaded()).toBe(false);

      const testSchema = new schema();
      testSchema.targetNamespace = "http://example.com/test";

      manager.setSchema(testSchema);
      expect(manager.isLoaded()).toBe(true);
      expect(manager.getSchema()).toBe(testSchema);
    });
  });

  describe("toXml", () => {
    test("should marshal schema to XML", () => {
      const xml = SCHEMA_WITH_TARGET_NAMESPACE;

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const output = manager.toXml();
      expect(output).toContain("schema");
      expect(output).toContain("http://example.com/test");
      expect(output).toContain("root");
    });

    test("should throw error when schema not loaded", () => {
      const manager = new SchemaModelManager();

      expect(() => {
        manager.toXml();
      }).toThrow("Cannot marshal: schema not loaded");
    });

    test("should support round-trip conversion", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/test"
           elementFormDefault="qualified">
  <xs:element name="root" type="xs:string"/>
  <xs:element name="item" type="xs:int"/>
</xs:schema>`;

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const outputXml = manager.toXml();

      // Load the output back and verify it matches
      const manager2 = new SchemaModelManager();
      manager2.loadFromXml(outputXml);

      expect(manager2.getTargetNamespace()).toBe("http://example.com/test");
      expect(manager2.getAllElements()).toHaveLength(2);
    });
  });

  describe("cloneSchema", () => {
    test("should create a deep copy of the schema", () => {
      const xml = SCHEMA_WITH_TARGET_NAMESPACE;

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const cloned = manager.cloneSchema();

      expect(cloned).not.toBe(manager.getSchema());
      expect(cloned.targetNamespace).toBe("http://example.com/test");
      
      const clonedElements = Array.isArray(cloned.element) 
        ? cloned.element 
        : cloned.element ? [cloned.element] : [];
      expect(clonedElements).toHaveLength(1);
      expect(clonedElements[0].name).toBe("root");
    });

    test("should throw error when schema not loaded", () => {
      const manager = new SchemaModelManager();

      expect(() => {
        manager.cloneSchema();
      }).toThrow("Cannot clone: schema not loaded");
    });

    test("should create independent copies", () => {
      const xml = SCHEMA_WITH_TARGET_NAMESPACE;

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const original = manager.getSchema();
      const cloned = manager.cloneSchema();

      // Modify the cloned schema
      const clonedElements = Array.isArray(cloned.element)
        ? cloned.element
        : cloned.element ? [cloned.element] : [];
      
      if (clonedElements.length > 0) {
        clonedElements[0].name = "modified";
      }

      // Original should be unchanged
      const originalElements = Array.isArray(original?.element)
        ? original?.element
        : original?.element ? [original.element] : [];
      expect(originalElements[0]?.name).toBe("root");
      expect(clonedElements[0].name).toBe("modified");
    });
  });

  describe("isLoaded and clear", () => {
    test("should report loaded state correctly", () => {
      const manager = new SchemaModelManager();
      expect(manager.isLoaded()).toBe(false);

      const testSchema = new schema();
      manager.setSchema(testSchema);
      expect(manager.isLoaded()).toBe(true);
    });

    test("should clear the schema state", () => {
      const testSchema = new schema();
      const manager = new SchemaModelManager(testSchema);

      expect(manager.isLoaded()).toBe(true);

      manager.clear();

      expect(manager.isLoaded()).toBe(false);
      expect(manager.getSchema()).toBeNull();
    });
  });

  describe("findElement", () => {
    test("should find element by name", () => {
      const xml = schemaXmlWith(`<xs:element name="root" type="xs:string"/>
<xs:element name="item" type="xs:int"/>`);

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const result = manager.findElement("root");
      expect(result.found).toBe(true);
      expect(result.item?.name).toBe("root");
    });

    test("should return not found for non-existent element", () => {
      const xml = schemaXmlWith(`<xs:element name="root" type="xs:string"/>`);

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const result = manager.findElement("nonexistent");
      expect(result.found).toBe(false);
      expect(result.item).toBeUndefined();
    });

    test("should return not found when no elements exist", () => {

      const manager = new SchemaModelManager();
      manager.loadFromXml(emptySchemaXml());

      const result = manager.findElement("root");
      expect(result.found).toBe(false);
    });
  });

  describe("findSimpleType", () => {
    test("should find simple type by name", () => {
      const xml = schemaXmlWith(`<xs:simpleType name="MyString">
  <xs:restriction base="xs:string">
    <xs:maxLength value="100"/>
  </xs:restriction>
</xs:simpleType>`);

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const result = manager.findSimpleType("MyString");
      expect(result.found).toBe(true);
      expect(result.item?.name).toBe("MyString");
    });

    test("should return not found for non-existent simple type", () => {

      const manager = new SchemaModelManager();
      manager.loadFromXml(emptySchemaXml());

      const result = manager.findSimpleType("MyString");
      expect(result.found).toBe(false);
    });
  });

  describe("findComplexType", () => {
    test("should find complex type by name", () => {
      const xml = schemaXmlWith(`<xs:complexType name="MyType">
  <xs:sequence>
    <xs:element name="child" type="xs:string"/>
  </xs:sequence>
</xs:complexType>`);

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const result = manager.findComplexType("MyType");
      expect(result.found).toBe(true);
      expect(result.item?.name).toBe("MyType");
    });

    test("should return not found for non-existent complex type", () => {

      const manager = new SchemaModelManager();
      manager.loadFromXml(emptySchemaXml());

      const result = manager.findComplexType("MyType");
      expect(result.found).toBe(false);
    });
  });

  describe("findGroup", () => {
    test("should find group by name", () => {
      const xml = schemaXmlWith(`<xs:group name="MyGroup">
  <xs:sequence>
    <xs:element name="item" type="xs:string"/>
  </xs:sequence>
</xs:group>`);

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const result = manager.findGroup("MyGroup");
      expect(result.found).toBe(true);
      expect(result.item?.name).toBe("MyGroup");
    });

    test("should return not found for non-existent group", () => {

      const manager = new SchemaModelManager();
      manager.loadFromXml(emptySchemaXml());

      const result = manager.findGroup("MyGroup");
      expect(result.found).toBe(false);
    });
  });

  describe("findAttributeGroup", () => {
    test("should find attribute group by name", () => {
      const xml = schemaXmlWith(`<xs:attributeGroup name="MyAttrGroup">
  <xs:attribute name="id" type="xs:string"/>
</xs:attributeGroup>`);

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const result = manager.findAttributeGroup("MyAttrGroup");
      expect(result.found).toBe(true);
      expect(result.item?.name).toBe("MyAttrGroup");
    });

    test("should return not found for non-existent attribute group", () => {

      const manager = new SchemaModelManager();
      manager.loadFromXml(emptySchemaXml());

      const result = manager.findAttributeGroup("MyAttrGroup");
      expect(result.found).toBe(false);
    });
  });

  describe("getAllElements", () => {
    test("should return all top-level elements", () => {
      const xml = schemaXmlWith(`<xs:element name="root" type="xs:string"/>
<xs:element name="item" type="xs:int"/>
<xs:element name="data" type="xs:boolean"/>`);

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const elements = manager.getAllElements();
      expect(elements).toHaveLength(3);
      expect(elements.map((e) => e.name)).toEqual(["root", "item", "data"]);
    });

    test("should return empty array when no elements exist", () => {

      const manager = new SchemaModelManager();
      manager.loadFromXml(emptySchemaXml());

      const elements = manager.getAllElements();
      expect(elements).toEqual([]);
    });
  });

  describe("getAllSimpleTypes", () => {
    test("should return all simple types", () => {
      const xml = schemaXmlWith(`<xs:simpleType name="Type1">
  <xs:restriction base="xs:string"/>
</xs:simpleType>
<xs:simpleType name="Type2">
  <xs:restriction base="xs:int"/>
</xs:simpleType>`);

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const types = manager.getAllSimpleTypes();
      expect(types).toHaveLength(2);
      expect(types.map((t) => t.name)).toEqual(["Type1", "Type2"]);
    });

    test("should return empty array when no simple types exist", () => {

      const manager = new SchemaModelManager();
      manager.loadFromXml(emptySchemaXml());

      const types = manager.getAllSimpleTypes();
      expect(types).toEqual([]);
    });
  });

  describe("getAllComplexTypes", () => {
    test("should return all complex types", () => {
      const xml = readTestXml("two-complex-types-with-sequences.xsd");

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const types = manager.getAllComplexTypes();
      expect(types).toHaveLength(2);
      expect(types.map((t) => t.name)).toEqual(["Type1", "Type2"]);
    });

    test("should return empty array when no complex types exist", () => {

      const manager = new SchemaModelManager();
      manager.loadFromXml(emptySchemaXml());

      const types = manager.getAllComplexTypes();
      expect(types).toEqual([]);
    });
  });

  describe("getAllGroups", () => {
    test("should return all groups", () => {
      const xml = readTestXml("two-groups-with-sequences.xsd");

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const groups = manager.getAllGroups();
      expect(groups).toHaveLength(2);
      expect(groups.map((g) => g.name)).toEqual(["Group1", "Group2"]);
    });

    test("should return empty array when no groups exist", () => {

      const manager = new SchemaModelManager();
      manager.loadFromXml(emptySchemaXml());

      const groups = manager.getAllGroups();
      expect(groups).toEqual([]);
    });
  });

  describe("getAllAttributeGroups", () => {
    test("should return all attribute groups", () => {
      const xml = schemaXmlWith(`<xs:attributeGroup name="AttrGroup1">
  <xs:attribute name="id" type="xs:string"/>
</xs:attributeGroup>
<xs:attributeGroup name="AttrGroup2">
  <xs:attribute name="name" type="xs:string"/>
</xs:attributeGroup>`);

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const attrGroups = manager.getAllAttributeGroups();
      expect(attrGroups).toHaveLength(2);
      expect(attrGroups.map((ag) => ag.name)).toEqual([
        "AttrGroup1",
        "AttrGroup2",
      ]);
    });

    test("should return empty array when no attribute groups exist", () => {

      const manager = new SchemaModelManager();
      manager.loadFromXml(emptySchemaXml());

      const attrGroups = manager.getAllAttributeGroups();
      expect(attrGroups).toEqual([]);
    });
  });

  describe("getTargetNamespace", () => {
    test("should return target namespace", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/ns">
</xs:schema>`;

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      expect(manager.getTargetNamespace()).toBe("http://example.com/ns");
    });

    test("should return undefined when no target namespace", () => {

      const manager = new SchemaModelManager();
      manager.loadFromXml(emptySchemaXml());

      expect(manager.getTargetNamespace()).toBeUndefined();
    });
  });

  describe("getImports", () => {
    test("should return all imports", () => {
      const xml = schemaXmlWith(`<xs:import namespace="http://example.com/ns1" schemaLocation="schema1.xsd"/>
<xs:import namespace="http://example.com/ns2" schemaLocation="schema2.xsd"/>`);

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const imports = manager.getImports();
      expect(imports).toHaveLength(2);
      expect(imports[0].namespace).toBe("http://example.com/ns1");
      expect(imports[0].schemaLocation).toBe("schema1.xsd");
      expect(imports[1].namespace).toBe("http://example.com/ns2");
      expect(imports[1].schemaLocation).toBe("schema2.xsd");
    });

    test("should return empty array when no imports exist", () => {

      const manager = new SchemaModelManager();
      manager.loadFromXml(emptySchemaXml());

      const imports = manager.getImports();
      expect(imports).toEqual([]);
    });
  });

  describe("getIncludes", () => {
    test("should return all includes", () => {
      const xml = schemaXmlWith(`<xs:include schemaLocation="common.xsd"/>
<xs:include schemaLocation="types.xsd"/>`);

      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const includes = manager.getIncludes();
      expect(includes).toHaveLength(2);
      expect(includes[0].schemaLocation).toBe("common.xsd");
      expect(includes[1].schemaLocation).toBe("types.xsd");
    });

    test("should return empty array when no includes exist", () => {

      const manager = new SchemaModelManager();
      manager.loadFromXml(emptySchemaXml());

      const includes = manager.getIncludes();
      expect(includes).toEqual([]);
    });
  });
});
