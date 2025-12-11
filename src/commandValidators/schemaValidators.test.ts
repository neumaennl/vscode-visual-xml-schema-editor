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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      const command = {
        type: "addImport",
        payload: {
          namespace: "",
          schemaLocation: "schema.xsd",
        },
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = validateAddImport(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Namespace cannot be empty");
    });

    test("should reject addImport with missing schemaLocation", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      const command = {
        type: "addImport",
        payload: {
          namespace: "http://example.com/schema",
          schemaLocation: "",
        },
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = validateAddImport(command, schemaObj);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Schema location cannot be empty");
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
  });
});
