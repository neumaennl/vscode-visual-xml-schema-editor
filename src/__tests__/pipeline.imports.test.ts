/**
 * Integration tests: import add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for xs:import commands,
 * including namespace prefix handling and QName rewriting.
 * Success-path assertions are made against the unmarshalled schema object.
 */

import type {
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
} from "../../shared/types.js";
import {
  SCHEMA_WITH_IMPORT,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./pipelineTestHelpers.js";
import { emptySchemaXml, schemaXmlWith } from "../../shared/__tests__/schemaTestHelpers.js";

/** Schema that already has two imports so we can test position-based IDs. */
const SCHEMA_TWO_IMPORTS = schemaXmlWith(`<xs:import namespace="http://example.com/a" schemaLocation="a.xsd"/>
<xs:import namespace="http://example.com/b" schemaLocation="b.xsd"/>`);

/** Schema with an import without a namespace, which imports a schema without a target namespace. */
const SCHEMA_WITH_NO_NAMESPACE_IMPORT = schemaXmlWith(`<xs:import schemaLocation="no-namespace.xsd"/>`);

/** Schema with an import of `http://example.com/ext` that is bound to the prefix `ext`. */
const SCHEMA_WITH_EXT_IMPORT = schemaXmlWith(`<xs:import namespace="http://example.com/ext" schemaLocation="ext.xsd"/>`, {
  ext: "http://example.com/ext",
});

/** Schema whose only use of the imported namespace is the prefix `ext` in the XPath of a key. */
const SCHEMA_WITH_PREFIX_IN_XPATH = schemaXmlWith(
  `<xs:import namespace="http://example.com/ext" schemaLocation="ext.xsd"/>
<xs:element name="root">
  <xs:key name="itemKey"><xs:selector xpath="ext:item"/><xs:field xpath="@id"/></xs:key>
</xs:element>`,
  { ext: "http://example.com/ext" }
);

describe("Integration: Import pipeline", () => {
  // ─── addImport ─────────────────────────────────────────────────────────────

  describe("addImport", () => {
    test("adds an import with a namespace and schemaLocation", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/ext",
          schemaLocation: "ext.xsd",
        },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const imports = result.import_ ?? [];

      expect(imports.some((i) => i.namespace === "http://example.com/ext" && i.schemaLocation === "ext.xsd")).toBe(true);
    });

    test("adds an import with an explicit prefix", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/ext",
          schemaLocation: "ext.xsd",
          prefix: "ext",
        },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const imports = result.import_ ?? [];

      expect(imports.some((i) => i.namespace === "http://example.com/ext")).toBe(true);
      expect(result._namespacePrefixes?.["ext"]).toBe("http://example.com/ext");
    });

    test("auto-generates a prefix when none is provided", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/auto",
          schemaLocation: "auto.xsd",
        },
      };

      const result = runCommandExpectSuccessSchema(emptySchemaXml(), cmd);
      const imports = result.import_ ?? [];

      expect(imports.some((i) => i.namespace === "http://example.com/auto")).toBe(true);
      // A prefix in the format "ns0", "ns1", ... must have been registered
      const prefixes = result._namespacePrefixes ?? {};
      const autoPrefix = Object.keys(prefixes).find(
        (k) => prefixes[k] === "http://example.com/auto"
      );
      expect(autoPrefix).toBeDefined();
      expect(autoPrefix).toMatch(/^ns\d+$/);
    });

    test("returns validation error for an invalid namespace URI", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: { namespace: "not a uri", schemaLocation: "x.xsd" },
      };

      runCommandExpectValidationFailure(emptySchemaXml(), cmd, "Namespace must be a valid absolute URI");
    });

    test("returns validation error for a duplicate namespace", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/ext",
          schemaLocation: "other.xsd",
        },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_IMPORT, cmd, "An import for namespace 'http://example.com/ext' already exists");
    });

    test("returns validation error for a reserved prefix 'xml'", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/new",
          schemaLocation: "new.xsd",
          prefix: "xml",
        },
      };

      runCommandExpectValidationFailure(emptySchemaXml(), cmd, "Prefix 'xml' is reserved and cannot be used");
    });
  });

  // ─── removeImport ──────────────────────────────────────────────────────────

  describe("removeImport", () => {
    test("removes the first import by position ID", () => {
      const cmd: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[0]" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_IMPORT, cmd);
      const imports = result.import_ ?? [];

      expect(imports.some((i) => i.namespace === "http://example.com/ext")).toBe(false);
    });

    test("removes a specific import from a multi-import schema", () => {
      const cmd: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[0]" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_TWO_IMPORTS, cmd);
      const imports = result.import_ ?? [];

      expect(imports.some((i) => i.namespace === "http://example.com/a")).toBe(false);
      expect(imports.some((i) => i.namespace === "http://example.com/b")).toBe(true);
    });

    test("returns validation error when the namespace is only used in the XPath of a key", () => {
      const cmd: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[0]" },
      };

      runCommandExpectValidationFailure(
        SCHEMA_WITH_PREFIX_IN_XPATH,
        cmd,
        "Cannot remove import: namespace 'http://example.com/ext' is still referenced in the schema"
      );
    });

    test("returns validation error when import ID is out of range", () => {
      const cmd: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[5]" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_IMPORT, cmd, "Import not found: /import[5]");
    });
  });

  // ─── modifyImport ──────────────────────────────────────────────────────────

  describe("modifyImport", () => {
    test("changes the schemaLocation of an existing import", () => {
      const cmd: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", schemaLocation: "updated-ext.xsd" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_IMPORT, cmd);
      const imports = result.import_ ?? [];
      const ext = imports.find((i) => i.namespace === "http://example.com/ext");

      expect(ext).toBeDefined();
      expect(ext!.schemaLocation).toBe("updated-ext.xsd");
    });

    test("rewrites the prefix in the XPath of a key when the prefix is renamed", () => {
      const cmd: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", oldPrefix: "ext", prefix: "neu" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_PREFIX_IN_XPATH, cmd);

      expect(result.element?.[0]?.key?.[0]?.selector.xpath).toBe("neu:item");
    });

    test("returns validation error when import ID is out of range", () => {
      const cmd: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[99]", schemaLocation: "x.xsd" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_IMPORT, cmd, "Import not found: /import[99]");
    });
  });

  // ─── imports without a namespace and prefix bindings ──────────────────────

  describe("namespaces of imports", () => {
    test("removes an import without a namespace", () => {
      const cmd: RemoveImportCommand = { type: "removeImport", payload: { importId: "/import[0]" } };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_NO_NAMESPACE_IMPORT, cmd);

      expect(result.import_ ?? []).toHaveLength(0);
    });

    test("gives an import without a namespace a namespace", () => {
      const cmd: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", namespace: "http://example.com/new" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_NO_NAMESPACE_IMPORT, cmd);

      expect(result.import_?.[0]?.namespace).toBe("http://example.com/new");
    });

    test("returns validation error for a prefix for an import without a namespace", () => {
      const cmd: ModifyImportCommand = { type: "modifyImport", payload: { importId: "/import[0]", prefix: "none" } };

      runCommandExpectValidationFailure(
        SCHEMA_WITH_NO_NAMESPACE_IMPORT,
        cmd,
        "Cannot bind prefix 'none' to an import without a namespace"
      );
    });

    test("binds an additional prefix to the namespace of an import", () => {
      const cmd: ModifyImportCommand = { type: "modifyImport", payload: { importId: "/import[0]", prefix: "more" } };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_EXT_IMPORT, cmd);

      expect(result._namespacePrefixes).toMatchObject({ ext: "http://example.com/ext", more: "http://example.com/ext" });
    });

    test("keeps the binding when a prefix is renamed to itself", () => {
      const cmd: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", oldPrefix: "ext", prefix: "ext" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_EXT_IMPORT, cmd);

      expect(result._namespacePrefixes).toMatchObject({ ext: "http://example.com/ext" });
    });
  });
});
