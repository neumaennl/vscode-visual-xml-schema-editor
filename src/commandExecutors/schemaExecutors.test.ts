/**
 * Unit tests for schema import executors.
 * Tests add, remove, and modify operations for xs:import declarations.
 *
 * Import ID Convention:
 * - Imports are addressed by zero-based position: /import[0], /import[1], …
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

function schemaWithImports(...imports: Array<{ namespace: string; schemaLocation: string }>): schema {
  const importXml = imports
    .map(
      (i) =>
        `  <xs:import namespace="${i.namespace}" schemaLocation="${i.schemaLocation}"/>`
    )
    .join("\n");
  return unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
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

  it("should produce valid XSD when marshalled back to XML", () => {
    const schemaObj = emptySchema();
    const command: AddImportCommand = {
      type: "addImport",
      payload: {
        namespace: "http://example.com/types",
        schemaLocation: "types.xsd",
      },
    };

    executeAddImport(command, schemaObj);

    const xml = marshal(schemaObj);
    expect(xml).toContain('namespace="http://example.com/types"');
    expect(xml).toContain('schemaLocation="types.xsd"');
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

  it("should throw when position is out of range", () => {
    const schemaObj = schemaWithImports({
      namespace: "http://example.com/ns1",
      schemaLocation: "schema1.xsd",
    });
    const command: RemoveImportCommand = {
      type: "removeImport",
      payload: { importId: "/import[5]" },
    };

    expect(() => executeRemoveImport(command, schemaObj)).toThrow(
      "Import not found: /import[5]"
    );
  });

  it("should throw when schema has no imports", () => {
    const schemaObj = emptySchema();
    const command: RemoveImportCommand = {
      type: "removeImport",
      payload: { importId: "/import[0]" },
    };

    expect(() => executeRemoveImport(command, schemaObj)).toThrow(
      "Import not found: /import[0]"
    );
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

  it("should throw when position is out of range", () => {
    const schemaObj = schemaWithImports({
      namespace: "http://example.com/ns",
      schemaLocation: "schema.xsd",
    });
    const command: ModifyImportCommand = {
      type: "modifyImport",
      payload: {
        importId: "/import[3]",
        namespace: "http://example.com/new-ns",
      },
    };

    expect(() => executeModifyImport(command, schemaObj)).toThrow(
      "Import not found: /import[3]"
    );
  });
});
