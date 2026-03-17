/**
 * Unit tests for schema validators (Import and Include).
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";
import {
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
  AddIncludeCommand,
  RemoveIncludeCommand,
  ModifyIncludeCommand,
} from "../../shared/types";
import {
  validateAddImport,
  validateRemoveImport,
  validateModifyImport,
  validateAddInclude,
  validateRemoveInclude,
  validateModifyInclude,
} from "./schemaValidators";

describe("Import Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
    schemaObj = unmarshal(schema, simpleSchemaXml);
  });

describe("validateAddImport", () => {
    test("should accept addImport with both namespace and schemaLocation", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/schema",
          schemaLocation: "schema.xsd",
        },
      };

      const result = validateAddImport(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject addImport with missing namespace", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "",
          schemaLocation: "schema.xsd",
        },
      };

      const result = validateAddImport(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Namespace cannot be empty");
    });

    test("should reject addImport with invalid namespace URI", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "not-a-uri",
          schemaLocation: "schema.xsd",
        },
      };

      const result = validateAddImport(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("valid absolute URI");
    });

    test("should accept addImport with urn: namespace URI", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "urn:example:schema",
          schemaLocation: "schema.xsd",
        },
      };

      const result = validateAddImport(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject addImport with missing schemaLocation", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/schema",
          schemaLocation: "",
        },
      };

      const result = validateAddImport(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Schema location cannot be empty");
    });

    test("should reject addImport with whitespace in schemaLocation", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/schema",
          schemaLocation: "my schema.xsd",
        },
      };

      const result = validateAddImport(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("valid path or URI");
    });

    test("should reject addImport when namespace is already imported", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:import namespace="http://example.com/existing" schemaLocation="existing.xsd"/>
</xs:schema>`;
      const schemaWithImport = unmarshal(schema, xml);
      const command: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/existing",
          schemaLocation: "another.xsd",
        },
      };

      const result = validateAddImport(command, schemaWithImport);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("already exists");
    });

    test("should reject addImport with an already-used prefix bound to a different namespace", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/existing">
  <xs:import namespace="http://example.com/existing" schemaLocation="existing.xsd"/>
</xs:schema>`;
      const schemaWithPrefix = unmarshal(schema, xml);
      const command: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/new",
          schemaLocation: "new.xsd",
          prefix: "ext",
        },
      };

      const result = validateAddImport(command, schemaWithPrefix);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("already in use");
    });

    test("should accept addImport when prefix is already bound to the same namespace", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/new">
</xs:schema>`;
      const schemaWithPrefix = unmarshal(schema, xml);
      const command: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/new",
          schemaLocation: "new.xsd",
          prefix: "ext",
        },
      };

      const result = validateAddImport(command, schemaWithPrefix);
      expect(result.valid).toBe(true);
    });

    test("should reject addImport with an invalid XML prefix", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/schema",
          schemaLocation: "schema.xsd",
          prefix: "123invalid",
        },
      };

      const result = validateAddImport(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not a valid XML name");
    });

    test("should reject addImport with prefix containing whitespace", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: { namespace: "http://example.com/ns", schemaLocation: "schema.xsd", prefix: " ext" },
      };
      const result = validateAddImport(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("whitespace");
    });

    test("should reject addImport with reserved prefix 'xml'", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: { namespace: "http://example.com/ns", schemaLocation: "schema.xsd", prefix: "xml" },
      };
      const result = validateAddImport(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("reserved");
    });

    test("should reject addImport with reserved prefix 'xmlns'", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: { namespace: "http://example.com/ns", schemaLocation: "schema.xsd", prefix: "xmlns" },
      };
      const result = validateAddImport(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("reserved");
    });
  });

  describe("validateRemoveImport", () => {
    test("should reject removeImport with missing importId", () => {
      const command: RemoveImportCommand = {
        type: "removeImport",
        payload: {
          importId: "",
        },
      };

      const result = validateRemoveImport(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Import ID cannot be empty");
    });

    test("should reject removeImport when import does not exist", () => {
      const command: RemoveImportCommand = {
        type: "removeImport",
        payload: {
          importId: "/import[0]",
        },
      };

      const result = validateRemoveImport(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Import not found");
    });

    test("should accept removeImport when import exists and is not referenced", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:import namespace="http://example.com/ns1" schemaLocation="schema1.xsd"/>
</xs:schema>`;
      const schemaWithImport = unmarshal(schema, xml);
      const command: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[0]" },
      };

      const result = validateRemoveImport(command, schemaWithImport);
      expect(result.valid).toBe(true);
    });

    test("should reject removeImport when namespace prefix is referenced in an element type", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ext">
  <xs:import namespace="http://example.com/ext" schemaLocation="ext.xsd"/>
  <xs:element name="foo" type="ext:MyType"/>
</xs:schema>`;
      const schemaWithRef = unmarshal(schema, xml);
      const command: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[0]" },
      };

      const result = validateRemoveImport(command, schemaWithRef);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("still referenced");
    });

    test("should reject removeImport when prefix is referenced in a deeply nested element (sequence → choice → element)", () => {
      // This verifies that the full recursive traversal catches references
      // that were missed by the old shallow implementation.
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ext">
  <xs:import namespace="http://example.com/ext" schemaLocation="ext.xsd"/>
  <xs:complexType name="MyType">
    <xs:sequence>
      <xs:choice>
        <xs:element name="deep" type="ext:DeepType"/>
      </xs:choice>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
      const schemaWithDeepRef = unmarshal(schema, xml);
      const command: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[0]" },
      };

      const result = validateRemoveImport(command, schemaWithDeepRef);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("still referenced");
    });

    test("should reject removeImport when importId points to a non-import node type", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:include schemaLocation="other.xsd"/>
</xs:schema>`;
      const s = unmarshal(schema, xml);
      // /include[0] has the wrong node type — must be rejected
      const command: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/include[0]" },
      };
      const result = validateRemoveImport(command, s);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("does not refer to an import node");
    });
  });

  describe("validateModifyImport", () => {
    test("should reject modifyImport with missing importId", () => {
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: {
          importId: "",
        },
      };

      const result = validateModifyImport(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Import ID cannot be empty");
    });

    test("should reject modifyImport when import does not exist", () => {
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: {
          importId: "/import[0]",
        },
      };

      const result = validateModifyImport(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Import not found");
    });

    test("should accept modifyImport when import exists", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:import namespace="http://example.com/ns1" schemaLocation="schema1.xsd"/>
</xs:schema>`;
      const schemaWithImport = unmarshal(schema, xml);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: {
          importId: "/import[0]",
          namespace: "http://example.com/new-ns",
        },
      };

      const result = validateModifyImport(command, schemaWithImport);
      expect(result.valid).toBe(true);
    });

    test("should reject modifyImport with invalid namespace URI", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:import namespace="http://example.com/ns1" schemaLocation="schema1.xsd"/>
</xs:schema>`;
      const schemaWithImport = unmarshal(schema, xml);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", namespace: "not-a-uri" },
      };

      const result = validateModifyImport(command, schemaWithImport);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("valid absolute URI");
    });

    test("should reject modifyImport when changing to a duplicate namespace", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:import namespace="http://example.com/ns1" schemaLocation="schema1.xsd"/>
  <xs:import namespace="http://example.com/ns2" schemaLocation="schema2.xsd"/>
</xs:schema>`;
      const schemaWithImports = unmarshal(schema, xml);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", namespace: "http://example.com/ns2" },
      };

      const result = validateModifyImport(command, schemaWithImports);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("already exists");
    });

    test("should reject modifyImport with an already-used prefix", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ns1" xmlns:other="http://example.com/ns2">
  <xs:import namespace="http://example.com/ns1" schemaLocation="schema1.xsd"/>
  <xs:import namespace="http://example.com/ns2" schemaLocation="schema2.xsd"/>
</xs:schema>`;
      const schemaWithImports = unmarshal(schema, xml);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", prefix: "other" },
      };

      const result = validateModifyImport(command, schemaWithImports);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("already in use");
    });

    test("should accept modifyImport renaming prefix to same value (no-op)", () => {
      // Renaming ext→ext on the same namespace should be a no-op and accepted.
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ns1">
  <xs:import namespace="http://example.com/ns1" schemaLocation="schema1.xsd"/>
</xs:schema>`;
      const schemaWithImport = unmarshal(schema, xml);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", oldPrefix: "ext", prefix: "ext" },
      };

      const result = validateModifyImport(command, schemaWithImport);
      expect(result.valid).toBe(true);
    });

    test("should reject modifyImport when oldPrefix is not registered", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ns1">
  <xs:import namespace="http://example.com/ns1" schemaLocation="schema1.xsd"/>
</xs:schema>`;
      const schemaWithImport = unmarshal(schema, xml);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", oldPrefix: "nonexistent", prefix: "newpfx" },
      };

      const result = validateModifyImport(command, schemaWithImport);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not registered");
    });

    test("should reject modifyImport when oldPrefix belongs to a different namespace", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ns1" xmlns:other="http://example.com/ns2">
  <xs:import namespace="http://example.com/ns1" schemaLocation="schema1.xsd"/>
  <xs:import namespace="http://example.com/ns2" schemaLocation="schema2.xsd"/>
</xs:schema>`;
      const schemaWithImports = unmarshal(schema, xml);
      // Trying to rename the "other" prefix when modifying import[0] (ns1) — mismatch
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", oldPrefix: "other", prefix: "newpfx" },
      };

      const result = validateModifyImport(command, schemaWithImports);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not registered for namespace");
    });

    test("should reject modifyImport when oldPrefix is provided without prefix", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ns1">
  <xs:import namespace="http://example.com/ns1" schemaLocation="schema1.xsd"/>
</xs:schema>`;
      const schemaWithImport = unmarshal(schema, xml);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", oldPrefix: "ext" },
      };
      const result = validateModifyImport(command, schemaWithImport);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("'oldPrefix' requires 'prefix'");
    });

    test("should reject modifyImport with reserved prefix 'xml'", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="http://example.com/ns1">
  <xs:import namespace="http://example.com/ns1" schemaLocation="schema1.xsd"/>
</xs:schema>`;
      const schemaWithImport = unmarshal(schema, xml);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", oldPrefix: "ext", prefix: "xml" },
      };
      const result = validateModifyImport(command, schemaWithImport);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("reserved");
    });
  });
});

describe("Include Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    const simpleSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
    schemaObj = unmarshal(schema, simpleSchemaXml);
  });

  describe("validateAddInclude", () => {
    test("should reject addInclude with missing schemaLocation", () => {
      const command: AddIncludeCommand = {
        type: "addInclude",
        payload: {
          schemaLocation: "",
        },
      };

      const result = validateAddInclude(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Schema location cannot be empty");
    });
  });

  describe("validateRemoveInclude", () => {
    test("should reject removeInclude with missing includeId", () => {
      const command: RemoveIncludeCommand = {
        type: "removeInclude",
        payload: {
          includeId: "",
        },
      };

      const result = validateRemoveInclude(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Include ID cannot be empty");
    });
  });

  describe("validateModifyInclude", () => {
    test("should reject modifyInclude with missing includeId", () => {
      const command: ModifyIncludeCommand = {
        type: "modifyInclude",
        payload: {
          includeId: "",
        },
      };

      const result = validateModifyInclude(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Include ID cannot be empty");
    });

    test("should accept modifyInclude with valid payload", () => {
      const command: ModifyIncludeCommand = {
        type: "modifyInclude",
        payload: {
          includeId: "include1",
          schemaLocation: "newSchema.xsd",
        },
      };

      const result = validateModifyInclude(command, schemaObj);
      expect(result.valid).toBe(true);
    });
  });
});
