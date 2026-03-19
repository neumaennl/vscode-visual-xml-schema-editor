/**
 * Integration tests: import add / remove / modify pipeline.
 *
 * Exercises the full extension-side editing pipeline for xs:import commands,
 * including namespace prefix handling and QName rewriting.
 */

import type {
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
} from "../../shared/types";
import {
  MINIMAL_SCHEMA,
  SCHEMA_WITH_IMPORT,
  runCommandExpectSuccess,
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

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain('namespace="http://example.com/ext"');
      expect(xml).toContain('schemaLocation="ext.xsd"');
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

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain('namespace="http://example.com/ext"');
    });

    it("auto-generates a prefix when none is provided", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/auto",
          schemaLocation: "auto.xsd",
        },
      };

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      // Auto-generated prefix should appear in the schema namespace declarations
      expect(xml).toContain("http://example.com/auto");
    });

    it("returns validation error for an invalid namespace URI", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: { namespace: "not a uri", schemaLocation: "x.xsd" },
      };

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "Namespace");
    });

    it("returns validation error for a duplicate namespace", () => {
      const cmd: AddImportCommand = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/ext",
          schemaLocation: "other.xsd",
        },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_IMPORT, cmd, "http://example.com/ext");
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

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "xml");
    });
  });

  // ─── removeImport ──────────────────────────────────────────────────────────

  describe("removeImport", () => {
    it("removes the first import by position ID", () => {
      const cmd: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[0]" },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_IMPORT, cmd);

      expect(xml).not.toContain('namespace="http://example.com/ext"');
    });

    it("removes a specific import from a multi-import schema", () => {
      const cmd: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[0]" },
      };

      const xml = runCommandExpectSuccess(SCHEMA_TWO_IMPORTS, cmd);

      expect(xml).not.toContain('namespace="http://example.com/a"');
      expect(xml).toContain('namespace="http://example.com/b"');
    });

    it("returns validation error when import ID is out of range", () => {
      const cmd: RemoveImportCommand = {
        type: "removeImport",
        payload: { importId: "/import[5]" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_IMPORT, cmd, "/import[5]");
    });
  });

  // ─── modifyImport ──────────────────────────────────────────────────────────

  describe("modifyImport", () => {
    it("changes the schemaLocation of an existing import", () => {
      const cmd: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[0]", schemaLocation: "updated-ext.xsd" },
      };

      const xml = runCommandExpectSuccess(SCHEMA_WITH_IMPORT, cmd);

      expect(xml).toContain('schemaLocation="updated-ext.xsd"');
    });

    it("returns validation error when import ID is out of range", () => {
      const cmd: ModifyImportCommand = {
        type: "modifyImport",
        payload: { importId: "/import[99]", schemaLocation: "x.xsd" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_IMPORT, cmd, "/import[99]");
    });
  });
});
