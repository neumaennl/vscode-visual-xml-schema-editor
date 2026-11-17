/**
 * Unit tests for `SchemaModelManager`.
 * Tests schema loading, marshalling/unmarshalling and cloning.
 */

import { SchemaModelManager } from "./schemaModelManager.js";
import { schema } from "../shared/types.js";
import { schemaXmlWith } from "../shared/__tests__/schemaTestHelpers.js";

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
      expect(manager.getSchema()).toBeNull();
    });

    test("should create an instance with initial schema", () => {
      const testSchema = new schema();
      testSchema.targetNamespace = "http://example.com/test";

      const manager = new SchemaModelManager(testSchema);
      expect(manager.getSchema()).toBe(testSchema);
      expect(manager.getSchema()?.targetNamespace).toBe("http://example.com/test");
    });
  });

  describe("loadFromXml", () => {
    test("should load schema from valid XML", () => {
      const manager = new SchemaModelManager();
      const xml = SCHEMA_WITH_TARGET_NAMESPACE;

      manager.loadFromXml(xml);

      expect(manager.getSchema()).not.toBeNull();
      expect(manager.getSchema()?.targetNamespace).toBe("http://example.com/test");
      expect(manager.getSchema()?.element).toHaveLength(1);
      expect(manager.getSchema()?.element?.[0]!.name).toBe("root");
    });

    test("should throw error for invalid XML", () => {
      const manager = new SchemaModelManager();
      const invalidXml = "not valid xml";

      expect(() => {
        manager.loadFromXml(invalidXml);
      }).toThrow("Failed to load schema from XML");
    });

    test("should keep the parse error as the cause", () => {
      const manager = new SchemaModelManager();
      let thrown: Error | undefined;

      try {
        manager.loadFromXml("not valid xml");
      } catch (error) {
        thrown = error as Error;
      }

      expect(thrown?.cause).toBeInstanceOf(Error);
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
      expect(manager.getSchema()?.targetNamespace).toBe("http://example.com/first");

      manager.loadFromXml(xml2);
      expect(manager.getSchema()?.targetNamespace).toBe("http://example.com/second");
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
      expect(manager.getSchema()).toBeNull();

      const testSchema = new schema();
      testSchema.targetNamespace = "http://example.com/test";

      manager.setSchema(testSchema);
      expect(manager.getSchema()).not.toBeNull();
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

    test("should start with the XML declaration and end with one line break", () => {
      const manager = new SchemaModelManager();
      manager.loadFromXml(`${schemaXmlWith(`<xs:element name="root" type="xs:string"/>`)}\n`);

      const output = manager.toXml();

      expect(output.startsWith("<?xml ")).toBe(true);
      expect(output.endsWith("</xs:schema>\n")).toBe(true);
    });

    test.each([
      ["the root element", `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"/>`, "<xs:schema "],
      ["a comment", `<!--header-->\n<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"/>`, "<!--header-->"],
    ])("should start with %s and end with one line break without an XML declaration", (_, xml, start) => {
      const manager = new SchemaModelManager();
      manager.loadFromXml(xml);

      const output = manager.toXml();

      expect(output.startsWith(start)).toBe(true);
      expect(output.endsWith("\n")).toBe(true);
      expect(output.endsWith("\n\n")).toBe(false);
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

      expect(manager2.getSchema()?.targetNamespace).toBe("http://example.com/test");
      expect(manager2.getSchema()?.element).toHaveLength(2);
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

      const clonedElements = cloned.element ?? [];
      expect(clonedElements).toHaveLength(1);
      expect(clonedElements[0]!.name).toBe("root");
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
      const clonedElements = cloned.element ?? [];
      clonedElements[0]!.name = "modified";

      // Original should be unchanged
      const originalElements = original?.element ?? [];
      expect(originalElements[0]!.name).toBe("root");
      expect(clonedElements[0]!.name).toBe("modified");
    });
  });
});
