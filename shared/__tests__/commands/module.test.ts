/**
 * Unit tests for import and include command types.
 */

import {
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
  AddIncludeCommand,
  RemoveIncludeCommand,
  ModifyIncludeCommand,
} from "../../commands/module";

describe("Import Commands", () => {
  test("AddImportCommand should have correct structure", () => {
    const command: AddImportCommand = {
      type: "addImport",
      payload: {
        namespace: "http://example.com/schema",
        schemaLocation: "http://example.com/schema.xsd",
      },
    };

    expect(command.type).toBe("addImport");
    expect(command.payload.namespace).toBe("http://example.com/schema");
    expect(command.payload.schemaLocation).toBe(
      "http://example.com/schema.xsd"
    );
  });

  test("RemoveImportCommand should have correct structure", () => {
    const command: RemoveImportCommand = {
      type: "removeImport",
      payload: {
        importId: "import-123",
      },
    };

    expect(command.type).toBe("removeImport");
    expect(command.payload.importId).toBe("import-123");
  });

  test("ModifyImportCommand should have correct structure", () => {
    const command: ModifyImportCommand = {
      type: "modifyImport",
      payload: {
        importId: "import-456",
        schemaLocation: "http://example.com/updated.xsd",
      },
    };

    expect(command.payload.schemaLocation).toBe(
      "http://example.com/updated.xsd"
    );
  });
});

describe("Include Commands", () => {
  test("AddIncludeCommand should have correct structure", () => {
    const command: AddIncludeCommand = {
      type: "addInclude",
      payload: {
        schemaLocation: "common-types.xsd",
      },
    };

    expect(command.type).toBe("addInclude");
    expect(command.payload.schemaLocation).toBe("common-types.xsd");
  });

  test("RemoveIncludeCommand should have correct structure", () => {
    const command: RemoveIncludeCommand = {
      type: "removeInclude",
      payload: {
        includeId: "include-123",
      },
    };

    expect(command.type).toBe("removeInclude");
    expect(command.payload.includeId).toBe("include-123");
  });

  test("ModifyIncludeCommand should have correct structure", () => {
    const command: ModifyIncludeCommand = {
      type: "modifyInclude",
      payload: {
        includeId: "include-456",
        schemaLocation: "updated-types.xsd",
      },
    };

    expect(command.payload.schemaLocation).toBe("updated-types.xsd");
  });
});
