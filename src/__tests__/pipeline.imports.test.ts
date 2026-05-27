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
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { describe, it, expect } from "vitest";
import {
  MINIMAL_SCHEMA,
  SCHEMA_WITH_IMPORT,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./testHelpers";

/** Schema that already has two imports so we can test position-based IDs. */
const SCHEMA_TWO_IMPORTS = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:import namespace="http://example.com/a" schemaLocation="a.xsd"/>
  <xs:import namespace="http://example.com/b" schemaLocation="b.xsd"/>
</xs:schema>`;

describe("Integration: Import pipeline", () => {
  // ─── addImport ─────────────────────────────────────────────────────────────

  describe("addImport", () => {
    it("adds an import with a namespace and schemaLocation", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/ext",
          schemaLocation: "ext.xsd",
        },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const imports = toArray(result.import_);

      expect(imports.some((i) => i.namespace === "http://example.com/ext" && i.schemaLocation === "ext.xsd")).toBe(true);
    });

    it("adds an import with an explicit prefix", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/ext",
          schemaLocation: "ext.xsd",
          prefix: "ext",
        },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const imports = toArray(result.import_);

      expect(imports.some((i) => i.namespace === "http://example.com/ext")).toBe(true);
      expect(result._namespacePrefixes?.["ext"]).toBe("http://example.com/ext");
    });

    it("auto-generates a prefix when none is provided", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/auto",
          schemaLocation: "auto.xsd",
        },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const imports = toArray(result.import_);

      expect(imports.some((i) => i.namespace === "http://example.com/auto")).toBe(true);
      // A prefix in the format "ns0", "ns1", ... must have been registered
      const prefixes = result._namespacePrefixes ?? {};
      const autoPrefix = Object.keys(prefixes).find(
        (k) => prefixes[k] === "http://example.com/auto"
      );
      expect(autoPrefix).toBeDefined();
      expect(autoPrefix).toMatch(/^ns\d+$/);
    });

    it("returns validation error for an invalid namespace URI", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: { namespace: "not a uri", schemaLocation: "x.xsd" },
      };

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "Namespace must be a valid absolute URI");
    });

    it("returns validation error for a duplicate namespace", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/ext",
          schemaLocation: "other.xsd",
        },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_IMPORT, cmd, "An import for namespace 'http://example.com/ext' already exists");
    });

    it("returns validation error for a reserved prefix 'xml'", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/new",
          schemaLocation: "new.xsd",
          prefix: "xml",
        },
      };

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "Prefix 'xml' is reserved and cannot be used");
    });
  });

  // ─── removeImport ──────────────────────────────────────────────────────────

  describe("removeImport", () => {
    it("removes the first import by position ID", () => {
      const cmd: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[0]" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_IMPORT, cmd);
      const imports = toArray(result.import_);

      expect(imports.some((i) => i.namespace === "http://example.com/ext")).toBe(false);
    });

    it("removes a specific import from a multi-import schema", () => {
      const cmd: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[0]" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_TWO_IMPORTS, cmd);
      const imports = toArray(result.import_);

      expect(imports.some((i) => i.namespace === "http://example.com/a")).toBe(false);
      expect(imports.some((i) => i.namespace === "http://example.com/b")).toBe(true);
    });

    it("returns validation error when import ID is out of range", () => {
      const cmd: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[5]" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_IMPORT, cmd, "Import not found: /import[5]");
    });
  });

  // ─── modifyImport ──────────────────────────────────────────────────────────

  describe("modifyImport", () => {
    it("changes the schemaLocation of an existing import", () => {
      const cmd: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", schemaLocation: "updated-ext.xsd" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_IMPORT, cmd);
      const imports = toArray(result.import_);
      const ext = imports.find((i) => i.namespace === "http://example.com/ext");

      expect(ext).toBeDefined();
      expect(ext!.schemaLocation).toBe("updated-ext.xsd");
    });

    it("returns validation error when import ID is out of range", () => {
      const cmd: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[99]", schemaLocation: "x.xsd" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_IMPORT, cmd, "Import not found: /import[99]");
    });
  });
});
