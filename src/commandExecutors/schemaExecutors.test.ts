/**
 * Unit tests for schema import executors.
 * Tests add, remove, and modify operations for xs:import declarations.
 *
 * Import ID Convention:
 * - Imports are addressed by zero-based position: /import[0], /import[1], …
 *
 * Prefix Convention:
 * - executeAddImport always registers a namespace prefix in _namespacePrefixes.
 * - If the caller omits `prefix`, a unique prefix is auto-generated (e.g. "ns0").
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import {
  schema,
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
} from "../../shared/types";
import {
  executeAddImport,
  executeRemoveImport,
  executeModifyImport,
} from "./schemaExecutors";
import { toArray } from "../../shared/schemaUtils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptySchema(): schema {
  return unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"></xs:schema>`
  );
}

function schemaWithImports(
  ...imports: Array<{ namespace: string; schemaLocation: string; prefix?: string }>
): schema {
  const nsParts = imports
    .filter((i) => i.prefix)
    .map((i) => `xmlns:${i.prefix}="${i.namespace}"`)
    .join(" ");
  const importXml = imports
    .map(
      (i) =>
        `  <xs:import namespace="${i.namespace}" schemaLocation="${i.schemaLocation}"/>`
    )
    .join("\n");
  return unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"${nsParts ? " " + nsParts : ""}>
${importXml}
</xs:schema>`
  );
}

// ---------------------------------------------------------------------------
// executeAddImport
// ---------------------------------------------------------------------------

describe("executeAddImport", () => {
  it("should add a single import to a schema with no existing imports", () => {
    const schemaObj = emptySchema();
    const command: AddImportCommand = {
      type: "addImport",
      payload: {
        namespace: "http://example.com/ns1",
        schemaLocation: "schema1.xsd",
      },
    };

    executeAddImport(command, schemaObj);

    const imports = toArray(schemaObj.import_);
    expect(imports).toHaveLength(1);
    expect(imports[0].namespace).toBe("http://example.com/ns1");
    expect(imports[0].schemaLocation).toBe("schema1.xsd");
  });

  it("should append a second import without removing existing ones", () => {
    const schemaObj = schemaWithImports({
      namespace: "http://example.com/ns1",
      schemaLocation: "schema1.xsd",
    });
    const command: AddImportCommand = {
      type: "addImport",
      payload: {
        namespace: "http://example.com/ns2",
        schemaLocation: "schema2.xsd",
      },
    };

    executeAddImport(command, schemaObj);

    const imports = toArray(schemaObj.import_);
    expect(imports).toHaveLength(2);
    expect(imports[0].namespace).toBe("http://example.com/ns1");
    expect(imports[1].namespace).toBe("http://example.com/ns2");
  });

  it("should produce a schema that survives a marshal/unmarshal round-trip", () => {
    const schemaObj = emptySchema();
    const command: AddImportCommand = {
      type: "addImport",
      payload: {
        namespace: "http://example.com/types",
        schemaLocation: "types.xsd",
        prefix: "ext",
      },
    };

    executeAddImport(command, schemaObj);

    // Marshal to XML and unmarshal back to verify the result is a valid schema
    const xml = marshal(schemaObj);
    const roundTripped = unmarshal(schema, xml);
    const imports = toArray(roundTripped.import_);
    expect(imports).toHaveLength(1);
    expect(imports[0].namespace).toBe("http://example.com/types");
    expect(imports[0].schemaLocation).toBe("types.xsd");
    // The prefix binding must survive the round-trip as an xmlns: declaration
    expect(roundTripped._namespacePrefixes?.["ext"]).toBe("http://example.com/types");
  });

  it("should register the explicit prefix in _namespacePrefixes", () => {
    const schemaObj = emptySchema();
    const command: AddImportCommand = {
      type: "addImport",
      payload: {
        namespace: "http://example.com/ns",
        schemaLocation: "schema.xsd",
        prefix: "ext",
      },
    };

    executeAddImport(command, schemaObj);

    expect(schemaObj._namespacePrefixes?.["ext"]).toBe("http://example.com/ns");
  });

  it("should auto-generate a prefix when none is provided", () => {
    const schemaObj = emptySchema();
    const command: AddImportCommand = {
      type: "addImport",
      payload: {
        namespace: "http://example.com/ns",
        schemaLocation: "schema.xsd",
      },
    };

    executeAddImport(command, schemaObj);

    // A prefix must have been registered
    const prefixes = schemaObj._namespacePrefixes ?? {};
    const entry = Object.entries(prefixes).find(
      ([, ns]) => ns === "http://example.com/ns"
    );
    expect(entry).toBeDefined();
    expect(entry![0]).toMatch(/^ns\d+$/);
  });

  it("should auto-generate distinct prefixes for multiple imports", () => {
    const schemaObj = emptySchema();

    executeAddImport({
      type: "addImport",
      payload: { namespace: "http://example.com/ns1", schemaLocation: "s1.xsd" },
    }, schemaObj);

    executeAddImport({
      type: "addImport",
      payload: { namespace: "http://example.com/ns2", schemaLocation: "s2.xsd" },
    }, schemaObj);

    const prefixes = schemaObj._namespacePrefixes ?? {};
    const nsEntries = Object.entries(prefixes).filter(
      ([, ns]) => ns.startsWith("http://example.com/ns")
    );
    expect(nsEntries).toHaveLength(2);
    // The two auto-generated prefixes must be distinct
    expect(nsEntries[0][0]).not.toBe(nsEntries[1][0]);
  });
});

// ---------------------------------------------------------------------------
// executeRemoveImport
// ---------------------------------------------------------------------------

describe("executeRemoveImport", () => {
  it("should remove the only import, leaving import_ undefined", () => {
    const schemaObj = schemaWithImports({
      namespace: "http://example.com/ns1",
      schemaLocation: "schema1.xsd",
    });
    const command: RemoveImportCommand = {
      type: "removeImport",
      payload: { importId: "/import[0]" },
    };

    executeRemoveImport(command, schemaObj);

    expect(schemaObj.import_).toBeUndefined();
  });

  it("should remove the first import when multiple imports exist", () => {
    const schemaObj = schemaWithImports(
      { namespace: "http://example.com/ns1", schemaLocation: "schema1.xsd" },
      { namespace: "http://example.com/ns2", schemaLocation: "schema2.xsd" }
    );
    const command: RemoveImportCommand = {
      type: "removeImport",
      payload: { importId: "/import[0]" },
    };

    executeRemoveImport(command, schemaObj);

    const imports = toArray(schemaObj.import_);
    expect(imports).toHaveLength(1);
    expect(imports[0].namespace).toBe("http://example.com/ns2");
  });

  it("should remove the last import when multiple imports exist", () => {
    const schemaObj = schemaWithImports(
      { namespace: "http://example.com/ns1", schemaLocation: "schema1.xsd" },
      { namespace: "http://example.com/ns2", schemaLocation: "schema2.xsd" }
    );
    const command: RemoveImportCommand = {
      type: "removeImport",
      payload: { importId: "/import[1]" },
    };

    executeRemoveImport(command, schemaObj);

    const imports = toArray(schemaObj.import_);
    expect(imports).toHaveLength(1);
    expect(imports[0].namespace).toBe("http://example.com/ns1");
  });

  it("should remove the namespace prefix registration when removing an import", () => {
    const schemaObj = schemaWithImports({
      namespace: "http://example.com/ns1",
      schemaLocation: "schema1.xsd",
      prefix: "ext",
    });

    executeRemoveImport({
      type: "removeImport",
      payload: { importId: "/import[0]" },
    }, schemaObj);

    expect(schemaObj._namespacePrefixes?.["ext"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// executeModifyImport
// ---------------------------------------------------------------------------

describe("executeModifyImport", () => {
  it("should update namespace only", () => {
    const schemaObj = schemaWithImports({
      namespace: "http://example.com/old-ns",
      schemaLocation: "schema.xsd",
    });
    const command: ModifyImportCommand = {
      type: "modifyImport",
      payload: {
        importId: "/import[0]",
        namespace: "http://example.com/new-ns",
      },
    };

    executeModifyImport(command, schemaObj);

    const imports = toArray(schemaObj.import_);
    expect(imports[0].namespace).toBe("http://example.com/new-ns");
    expect(imports[0].schemaLocation).toBe("schema.xsd");
  });

  it("should update schemaLocation only", () => {
    const schemaObj = schemaWithImports({
      namespace: "http://example.com/ns",
      schemaLocation: "old-schema.xsd",
    });
    const command: ModifyImportCommand = {
      type: "modifyImport",
      payload: {
        importId: "/import[0]",
        schemaLocation: "new-schema.xsd",
      },
    };

    executeModifyImport(command, schemaObj);

    const imports = toArray(schemaObj.import_);
    expect(imports[0].namespace).toBe("http://example.com/ns");
    expect(imports[0].schemaLocation).toBe("new-schema.xsd");
  });

  it("should update both namespace and schemaLocation", () => {
    const schemaObj = schemaWithImports({
      namespace: "http://example.com/old-ns",
      schemaLocation: "old-schema.xsd",
    });
    const command: ModifyImportCommand = {
      type: "modifyImport",
      payload: {
        importId: "/import[0]",
        namespace: "http://example.com/new-ns",
        schemaLocation: "new-schema.xsd",
      },
    };

    executeModifyImport(command, schemaObj);

    const imports = toArray(schemaObj.import_);
    expect(imports[0].namespace).toBe("http://example.com/new-ns");
    expect(imports[0].schemaLocation).toBe("new-schema.xsd");
  });

  it("should modify only the import at the specified position", () => {
    const schemaObj = schemaWithImports(
      { namespace: "http://example.com/ns1", schemaLocation: "schema1.xsd" },
      { namespace: "http://example.com/ns2", schemaLocation: "schema2.xsd" }
    );
    const command: ModifyImportCommand = {
      type: "modifyImport",
      payload: {
        importId: "/import[1]",
        namespace: "http://example.com/modified",
      },
    };

    executeModifyImport(command, schemaObj);

    const imports = toArray(schemaObj.import_);
    expect(imports[0].namespace).toBe("http://example.com/ns1");
    expect(imports[1].namespace).toBe("http://example.com/modified");
  });

  it("should not change any property when payload has no optional fields", () => {
    const schemaObj = schemaWithImports({
      namespace: "http://example.com/ns",
      schemaLocation: "schema.xsd",
    });
    const command: ModifyImportCommand = {
      type: "modifyImport",
      payload: { importId: "/import[0]" },
    };

    executeModifyImport(command, schemaObj);

    const imports = toArray(schemaObj.import_);
    expect(imports[0].namespace).toBe("http://example.com/ns");
    expect(imports[0].schemaLocation).toBe("schema.xsd");
  });

  it("should update _namespacePrefixes entry when namespace changes", () => {
    const schemaObj = schemaWithImports({
      namespace: "http://example.com/old-ns",
      schemaLocation: "schema.xsd",
      prefix: "ext",
    });

    executeModifyImport({
      type: "modifyImport",
      payload: {
        importId: "/import[0]",
        namespace: "http://example.com/new-ns",
      },
    }, schemaObj);

    expect(schemaObj._namespacePrefixes?.["ext"]).toBe("http://example.com/new-ns");
  });

  it("should rename the prefix in _namespacePrefixes when prefix changes", () => {
    const schemaObj = schemaWithImports({
      namespace: "http://example.com/ns",
      schemaLocation: "schema.xsd",
      prefix: "oldpfx",
    });

    executeModifyImport({
      type: "modifyImport",
      payload: {
        importId: "/import[0]",
        prefix: "newpfx",
      },
    }, schemaObj);

    expect(schemaObj._namespacePrefixes?.["oldpfx"]).toBeUndefined();
    expect(schemaObj._namespacePrefixes?.["newpfx"]).toBe("http://example.com/ns");
  });
});
