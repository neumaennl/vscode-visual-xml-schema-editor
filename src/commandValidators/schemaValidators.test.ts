/**
 * Unit tests for schema validators (Import and Include).
 */

import { schema } from "../../shared/types.js";
import {
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
  AddIncludeCommand,
  RemoveIncludeCommand,
  ModifyIncludeCommand,
  ModifySchemaNamespacesCommand,
} from "../../shared/types.js";
import {
  validateAddImport,
  validateRemoveImport,
  validateModifyImport,
  validateAddInclude,
  validateRemoveInclude,
  validateModifyInclude,
  validateModifySchemaNamespaces,
} from "./schemaValidators.js";
import { expectInvalid } from "../__tests__/validationTestHelpers.js";
import { emptySchema, readTestSchema, schemaWith, schemaWithIncludes } from "../__tests__/schemaTestHelpers.js";

/** An import of the namespace `http://example.com/ns1`. */
const NS1_IMPORT = `<xs:import namespace="http://example.com/ns1" schemaLocation="schema1.xsd"/>`;

/** Imports of the namespaces `http://example.com/ns1` and `http://example.com/ns2`. */
const NS1_AND_NS2_IMPORTS = `${NS1_IMPORT}
<xs:import namespace="http://example.com/ns2" schemaLocation="schema2.xsd"/>`;

/** The prefix `ext` for the namespace `http://example.com/ns1`. */
const EXT_PREFIX = { ext: "http://example.com/ns1" };

/** The prefixes `ext` and `other` for the namespaces `http://example.com/ns1` and `http://example.com/ns2`. */
const EXT_AND_OTHER_PREFIXES = { ...EXT_PREFIX, other: "http://example.com/ns2" };

describe("Import Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    schemaObj = emptySchema();
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
      expect(result.error).toContain("valid path or URI");
    });

    test("should reject addImport when namespace is already imported", () => {
      const schemaWithImport = schemaWith(`<xs:import namespace="http://example.com/existing" schemaLocation="existing.xsd"/>`);
      const command: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/existing",
          schemaLocation: "another.xsd",
        },
      };

      const result = validateAddImport(command, schemaWithImport);
      expectInvalid(result);
      expect(result.error).toContain("already exists");
    });

    test("should reject addImport with an already-used prefix bound to a different namespace", () => {
      const schemaWithPrefix = schemaWith(`<xs:import namespace="http://example.com/existing" schemaLocation="existing.xsd"/>`, { ext: "http://example.com/existing" });
      const command: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/new",
          schemaLocation: "new.xsd",
          prefix: "ext",
        },
      };

      const result = validateAddImport(command, schemaWithPrefix);
      expectInvalid(result);
      expect(result.error).toContain("already in use");
    });

    test("should accept addImport when prefix is already bound to the same namespace", () => {
      const schemaWithPrefix = schemaWith("", { ext: "http://example.com/new" });
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
      expectInvalid(result);
      expect(result.error).toContain("not a valid XML name");
    });

    test("should reject addImport with prefix containing whitespace", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: { namespace: "http://example.com/ns", schemaLocation: "schema.xsd", prefix: " ext" },
      };
      const result = validateAddImport(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("whitespace");
    });

    test("should reject addImport with reserved prefix 'xml'", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: { namespace: "http://example.com/ns", schemaLocation: "schema.xsd", prefix: "xml" },
      };
      const result = validateAddImport(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("reserved");
    });

    test("should reject addImport with reserved prefix 'xmlns'", () => {
      const command: AddImportCommand = {
        type: "addImport",
        payload: { namespace: "http://example.com/ns", schemaLocation: "schema.xsd", prefix: "xmlns" },
      };
      const result = validateAddImport(command, schemaObj);
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
      expect(result.error).toContain("Import not found");
    });

    test("should accept removeImport when import exists and is not referenced", () => {
      const schemaWithImport = schemaWith(NS1_IMPORT);
      const command: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[0]" },
      };

      const result = validateRemoveImport(command, schemaWithImport);
      expect(result.valid).toBe(true);
    });

    test("should reject removeImport when namespace prefix is referenced in an element type", () => {
      const prefixes = { ext: "http://example.com/ext" };
      const schemaWithRef = schemaWith(`<xs:import namespace="http://example.com/ext" schemaLocation="ext.xsd"/>
<xs:element name="foo" type="ext:MyType"/>`, prefixes);
      const command: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[0]" },
      };

      const result = validateRemoveImport(command, schemaWithRef);
      expectInvalid(result);
      expect(result.error).toContain("still referenced");
    });

    test("should reject removeImport when prefix is referenced in a deeply nested element (sequence → choice → element)", () => {
      // This verifies that the full recursive traversal catches references
      // that were missed by the old shallow implementation.
      const schemaWithDeepRef = readTestSchema("import-with-type-used-in-nested-choice.xsd");
      const command: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[0]" },
      };

      const result = validateRemoveImport(command, schemaWithDeepRef);
      expectInvalid(result);
      expect(result.error).toContain("still referenced");
    });

    test("should reject removeImport when importId points to a non-import node type", () => {
      const s = schemaWith(`<xs:include schemaLocation="other.xsd"/>`);
      // /include[0] has the wrong node type — must be rejected
      const command: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/include[0]" },
      };
      const result = validateRemoveImport(command, s);
      expectInvalid(result);
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
      expectInvalid(result);
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
      expectInvalid(result);
      expect(result.error).toContain("Import not found");
    });

    test("should accept modifyImport when import exists", () => {
      const schemaWithImport = schemaWith(NS1_IMPORT);
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
      const schemaWithImport = schemaWith(NS1_IMPORT);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", namespace: "not-a-uri" },
      };

      const result = validateModifyImport(command, schemaWithImport);
      expectInvalid(result);
      expect(result.error).toContain("valid absolute URI");
    });

    test("should reject modifyImport when changing to a duplicate namespace", () => {
      const schemaWithImports = schemaWith(NS1_AND_NS2_IMPORTS);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", namespace: "http://example.com/ns2" },
      };

      const result = validateModifyImport(command, schemaWithImports);
      expectInvalid(result);
      expect(result.error).toContain("already exists");
    });

    test("should reject modifyImport with an already-used prefix", () => {
      const schemaWithImports = schemaWith(NS1_AND_NS2_IMPORTS, EXT_AND_OTHER_PREFIXES);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", prefix: "other" },
      };

      const result = validateModifyImport(command, schemaWithImports);
      expectInvalid(result);
      expect(result.error).toContain("already in use");
    });

    test("should accept modifyImport renaming prefix to same value (no-op)", () => {
      // Renaming ext→ext on the same namespace should be a no-op and accepted.
      const schemaWithImport = schemaWith(NS1_IMPORT, EXT_PREFIX);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", oldPrefix: "ext", prefix: "ext" },
      };

      const result = validateModifyImport(command, schemaWithImport);
      expect(result.valid).toBe(true);
    });

    test("should reject modifyImport when oldPrefix is not registered", () => {
      const schemaWithImport = schemaWith(NS1_IMPORT, EXT_PREFIX);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", oldPrefix: "nonexistent", prefix: "newpfx" },
      };

      const result = validateModifyImport(command, schemaWithImport);
      expectInvalid(result);
      expect(result.error).toContain("not registered");
    });

    test("should reject modifyImport when oldPrefix belongs to a different namespace", () => {
      const schemaWithImports = schemaWith(NS1_AND_NS2_IMPORTS, EXT_AND_OTHER_PREFIXES);
      // Trying to rename the "other" prefix when modifying import[0] (ns1) — mismatch
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", oldPrefix: "other", prefix: "newpfx" },
      };

      const result = validateModifyImport(command, schemaWithImports);
      expectInvalid(result);
      expect(result.error).toContain("not registered for namespace");
    });

    test("should reject modifyImport when oldPrefix is provided without prefix", () => {
      const schemaWithImport = schemaWith(NS1_IMPORT, EXT_PREFIX);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", oldPrefix: "ext" },
      };
      const result = validateModifyImport(command, schemaWithImport);
      expectInvalid(result);
      expect(result.error).toContain("'oldPrefix' requires 'prefix'");
    });

    test("should reject modifyImport with reserved prefix 'xml'", () => {
      const schemaWithImport = schemaWith(NS1_IMPORT, EXT_PREFIX);
      const command: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", oldPrefix: "ext", prefix: "xml" },
      };
      const result = validateModifyImport(command, schemaWithImport);
      expectInvalid(result);
      expect(result.error).toContain("reserved");
    });
  });
});

describe("Include Validators", () => {
  let schemaObj: schema;

  beforeEach(() => {
    schemaObj = emptySchema();
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
      expectInvalid(result);
      expect(result.error).toBe("Schema location cannot be empty");
    });

    test("should reject addInclude with whitespace-only schemaLocation", () => {
      const command: AddIncludeCommand = {
        type: "addInclude",
        payload: { schemaLocation: "   " },
      };

      const result = validateAddInclude(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Schema location cannot be empty");
    });

    test("should reject addInclude when schemaLocation contains whitespace", () => {
      const command: AddIncludeCommand = {
        type: "addInclude",
        payload: { schemaLocation: "my schema.xsd" },
      };

      const result = validateAddInclude(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Schema location must be a valid path or URI without whitespace");
    });

    test("should accept addInclude with valid schemaLocation", () => {
      const command: AddIncludeCommand = {
        type: "addInclude",
        payload: { schemaLocation: "other.xsd" },
      };

      const result = validateAddInclude(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject addInclude when the same schemaLocation already exists", () => {
      const schemaWithInclude = schemaWithIncludes("other.xsd");
      const command: AddIncludeCommand = {
        type: "addInclude",
        payload: { schemaLocation: "other.xsd" },
      };

      const result = validateAddInclude(command, schemaWithInclude);
      expectInvalid(result);
      expect(result.error).toBe("An include for schema location 'other.xsd' already exists");
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
      expectInvalid(result);
      expect(result.error).toBe("Include ID cannot be empty");
    });

    test("should reject removeInclude with malformed includeId", () => {
      const command: RemoveIncludeCommand = {
        type: "removeInclude",
        payload: { includeId: "include0" },
      };

      const result = validateRemoveInclude(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toMatch(/Invalid include ID/);
    });

    test("should reject removeInclude when include does not exist at position", () => {
      const command: RemoveIncludeCommand = {
        type: "removeInclude",
        payload: { includeId: "/include[0]" },
      };

      const result = validateRemoveInclude(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Include not found: /include[0]");
    });

    test("should reject removeInclude with wrong node type", () => {
      const schemaWithInclude = schemaWithIncludes("other.xsd");
      const command: RemoveIncludeCommand = {
        type: "removeInclude",
        // /import[0] has the wrong node type — must be rejected
        payload: { includeId: "/import[0]" },
      };

      const result = validateRemoveInclude(command, schemaWithInclude);
      expectInvalid(result);
      expect(result.error).toMatch(/does not refer to an include node/);
    });

    test("should accept removeInclude with valid includeId", () => {
      const schemaWithInclude = schemaWithIncludes("other.xsd");
      const command: RemoveIncludeCommand = {
        type: "removeInclude",
        payload: { includeId: "/include[0]" },
      };

      const result = validateRemoveInclude(command, schemaWithInclude);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateModifyInclude", () => {
    test("should reject modifyInclude with missing includeId", () => {
      const command: ModifyIncludeCommand = {
        type: "modifyInclude",
        payload: {
          includeId: "",
          schemaLocation: "other.xsd",
        },
      };

      const result = validateModifyInclude(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Include ID cannot be empty");
    });

    test("should reject modifyInclude with malformed includeId", () => {
      const command: ModifyIncludeCommand = {
        type: "modifyInclude",
        payload: { includeId: "include1", schemaLocation: "other.xsd" },
      };

      const result = validateModifyInclude(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toMatch(/Invalid include ID/);
    });

    test("should reject modifyInclude when include does not exist at position", () => {
      const command: ModifyIncludeCommand = {
        type: "modifyInclude",
        payload: { includeId: "/include[0]", schemaLocation: "other.xsd" },
      };

      const result = validateModifyInclude(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toBe("Include not found: /include[0]");
    });

    test("should accept modifyInclude with valid payload", () => {
      const schemaWithInclude = schemaWithIncludes("other.xsd");
      const command: ModifyIncludeCommand = {
        type: "modifyInclude",
        payload: {
          includeId: "/include[0]",
          schemaLocation: "newSchema.xsd",
        },
      };

      const result = validateModifyInclude(command, schemaWithInclude);
      expect(result.valid).toBe(true);
    });

    test("should reject modifyInclude with empty schemaLocation", () => {
      const schemaWithInclude = schemaWithIncludes("other.xsd");
      const command: ModifyIncludeCommand = {
        type: "modifyInclude",
        payload: { includeId: "/include[0]", schemaLocation: "" },
      };

      const result = validateModifyInclude(command, schemaWithInclude);
      expectInvalid(result);
      expect(result.error).toBe("Schema location cannot be empty");
    });

    test("should reject modifyInclude with schemaLocation containing whitespace", () => {
      const schemaWithInclude = schemaWithIncludes("other.xsd");
      const command: ModifyIncludeCommand = {
        type: "modifyInclude",
        payload: { includeId: "/include[0]", schemaLocation: "my schema.xsd" },
      };

      const result = validateModifyInclude(command, schemaWithInclude);
      expectInvalid(result);
      expect(result.error).toBe("Schema location must be a valid path or URI without whitespace");
    });

    test("should reject modifyInclude when schemaLocation already exists on another include", () => {
      const schemaWithTwoIncludes = schemaWithIncludes("first.xsd", "second.xsd");
      const command: ModifyIncludeCommand = {
        type: "modifyInclude",
        payload: { includeId: "/include[0]", schemaLocation: "second.xsd" },
      };

      const result = validateModifyInclude(command, schemaWithTwoIncludes);
      expectInvalid(result);
      expect(result.error).toBe("An include for schema location 'second.xsd' already exists");
    });

    test("should accept modifyInclude when schemaLocation matches the same include (no-op)", () => {
      const schemaWithInclude = schemaWithIncludes("other.xsd");
      const command: ModifyIncludeCommand = {
        type: "modifyInclude",
        payload: { includeId: "/include[0]", schemaLocation: "other.xsd" },
      };

      const result = validateModifyInclude(command, schemaWithInclude);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateModifySchemaNamespaces", () => {
    test("should accept valid targetNamespace and namespace declarations", () => {
      const command: ModifySchemaNamespacesCommand = {
        type: "modifySchemaNamespaces",
        payload: {
          targetNamespace: "http://example.com/new-target",
          namespacePrefixes: {
            xs: "http://www.w3.org/2001/XMLSchema",
            tns: "http://example.com/new-target",
          },
        },
      };

      const result = validateModifySchemaNamespaces(command, schemaObj);
      expect(result.valid).toBe(true);
    });

    test("should reject invalid targetNamespace URI", () => {
      const command: ModifySchemaNamespacesCommand = {
        type: "modifySchemaNamespaces",
        payload: {
          targetNamespace: "not-a-uri",
          namespacePrefixes: {
            xs: "http://www.w3.org/2001/XMLSchema",
          },
        },
      };

      const result = validateModifySchemaNamespaces(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("targetNamespace must be a valid absolute URI");
    });

    test("should reject reserved namespace prefixes", () => {
      const command: ModifySchemaNamespacesCommand = {
        type: "modifySchemaNamespaces",
        payload: {
          targetNamespace: "http://example.com/new-target",
          namespacePrefixes: {
            xmlns: "http://example.com/new-target",
          },
        },
      };

      const result = validateModifySchemaNamespaces(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("reserved");
    });

    test("should reject when targetNamespace is not declared in namespace prefixes", () => {
      const command: ModifySchemaNamespacesCommand = {
        type: "modifySchemaNamespaces",
        payload: {
          targetNamespace: "http://example.com/new-target",
          namespacePrefixes: {
            xs: "http://www.w3.org/2001/XMLSchema",
          },
        },
      };

      const result = validateModifySchemaNamespaces(command, schemaObj);
      expectInvalid(result);
      expect(result.error).toContain("must match one of the declared namespace URIs");
    });
  });
});
