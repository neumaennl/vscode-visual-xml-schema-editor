/**
 * Unit tests for CommandProcessor core functionality.
 * Tests transactional behavior, error handling, and orchestration.
 * SchemaModelManager is mocked to focus on CommandProcessor logic.
 */

import { CommandProcessor } from "./commandProcessor.js";
import type {
  CommandExecutionResult,
  CommandExecutionFailure,
  CommandExecutionValidationFailure,
  CommandExecutionRuntimeFailure,
} from "./commandProcessor.js";
import type { AddElementCommand, AddElementPayload, SchemaCommand } from "../shared/types.js";
import { schema, topLevelElement } from "../shared/types.js";
import type { CommandValidator } from "./commandValidator.js";
import type { CommandExecutor } from "./commandExecutor.js";
import { SchemaModelManager } from "./schemaModelManager.js";
import { emptySchemaXml, schemaXmlWith } from "../shared/__tests__/schemaTestHelpers.js";

// Type-safe mock types for testing
type MockValidator = Pick<CommandValidator, "validate">;
type MockExecutor = Pick<CommandExecutor, "execute">;
type MockModelManager = Pick<
  SchemaModelManager,
  "loadFromXml" | "getSchema" | "setSchema" | "cloneSchema" | "toXml"
>;

// eslint-disable-next-line no-restricted-syntax -- `type` not in SchemaCommand union; cast needed to test unknown-type rejection at runtime
const INVALID_COMMAND = { type: "unknownCommand", payload: {} } as unknown as SchemaCommand;

/** A top-level element `person`. */
const PERSON_ELEMENT = `<xs:element name="person" type="xs:string"/>`;

/**
 * Creates a command that adds the top-level element `test` of type `string`.
 *
 * @param payload - Payload fields that differ from that
 * @returns The command
 */
function addTestElement(payload: Partial<AddElementPayload> = {}): AddElementCommand {
  return {
    type: "addElement",
    payload: { parentId: "/schema", elementName: "test", elementType: "string", ...payload },
  };
}

/**
 * Creates a model manager mock that loads, clones and serializes successfully.
 *
 * @param schemaObj - The schema that the mock returns as loaded and as clone
 * @param overrides - Mock functions that differ from that
 * @returns The mock
 */
function mockModelManager(schemaObj: schema, overrides: Partial<MockModelManager> = {}): MockModelManager {
  return {
    loadFromXml: vi.fn(),
    getSchema: vi.fn().mockReturnValue(schemaObj),
    setSchema: vi.fn(),
    cloneSchema: vi.fn().mockReturnValue(schemaObj),
    toXml: vi.fn().mockReturnValue(emptySchemaXml()),
    ...overrides,
  };
}

/**
 * Creates an executor mock that changes the schema in place, like a successful executor.
 *
 * @returns The mock
 */
function versionSettingExecutor(): MockExecutor {
  return {
    execute: vi.fn<CommandExecutor["execute"]>((_command, schemaObj) => {
      schemaObj.version = "1.0";
    }),
  };
}

/**
 * Creates an executor mock that throws.
 *
 * @param message - The message of the error
 * @returns The mock
 */
function throwingExecutor(message: string): MockExecutor {
  return {
    execute: vi.fn(() => {
      throw new Error(message);
    }),
  };
}

/**
 * Creates a processor with the given mocks and the real implementations otherwise.
 *
 * @param mocks - The mocks to use
 * @returns The processor
 */
function processorWith(mocks: {
  validator?: MockValidator;
  executor?: MockExecutor;
  modelManager?: MockModelManager | SchemaModelManager;
}): CommandProcessor {
  return new CommandProcessor(
    mocks.validator as CommandValidator | undefined,
    mocks.executor as CommandExecutor | undefined,
    mocks.modelManager as SchemaModelManager | undefined
  );
}

/**
 * Returns the names of the top-level elements of the schema that the model manager holds.
 *
 * @param modelManager - The model manager
 * @returns The element names, in document order
 */
function topLevelElementNames(modelManager: SchemaModelManager): string[] {
  return (modelManager.getSchema()?.element ?? []).map((element) => element.name);
}

/**
 * Asserts that a CommandExecutionResult represents a failure without a schema or XML, and narrows its
 * type to CommandExecutionFailure, enabling access to `.error` and `.errorKind`.
 */
function expectFailure(
  result: CommandExecutionResult
): asserts result is CommandExecutionFailure {
  expect(result.success).toBe(false);
  expect(result.schema).toBeNull();
  expect(result.xmlContent).toBeNull();
  if (result.success)
    throw new Error("Expected command execution to fail");
}

/**
 * Asserts that a CommandExecutionResult represents a runtime failure with a stack and narrows its type
 * to CommandExecutionRuntimeFailure.
 */
function expectRuntimeFailure(
  result: CommandExecutionResult
): asserts result is CommandExecutionRuntimeFailure {
  expectFailure(result);
  expect(result.errorKind).toBe("runtime");
  if (result.errorKind !== "runtime")
    throw new Error("Expected runtime failure");
  expect(typeof result.stack).toBe("string");
}

/**
 * Asserts that a CommandExecutionResult represents a validation failure and narrows
 * its type to CommandExecutionValidationFailure.
 */
function expectValidationFailure(
  result: CommandExecutionResult
): asserts result is CommandExecutionValidationFailure {
  expectFailure(result);
  expect(result.errorKind).toBe("validation");
  if (result.errorKind !== "validation")
    throw new Error("Expected validation failure");
}

describe("CommandProcessor", () => {
  let processor: CommandProcessor;
  let mockSchema: schema;

  beforeEach(() => {
    processor = new CommandProcessor();
    mockSchema = new schema();
  });

  describe("Core Functionality", () => {
    test("should load, clone, execute and serialize in order and return the result", () => {
      const modelManager = mockModelManager(mockSchema);
      const executor = versionSettingExecutor();

      const result = processorWith({ executor, modelManager }).execute(addTestElement(), emptySchemaXml());

      expect(modelManager.loadFromXml).toHaveBeenCalledWith(emptySchemaXml());
      expect(modelManager.getSchema).toHaveBeenCalled();
      expect(modelManager.cloneSchema).toHaveBeenCalled();
      expect(executor.execute).toHaveBeenCalled();
      expect(modelManager.setSchema).toHaveBeenCalled();
      expect(modelManager.toXml).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.schema).not.toBeNull();
      expect(result.xmlContent).not.toBeNull();
      expect(result).not.toHaveProperty("errorKind");
    });

    test("should return failure when parent node is not found", () => {
      const result = processor.execute(addTestElement({ parentId: "/element:nonexistent" }), emptySchemaXml());

      expectFailure(result);
    });
  });

  describe("Transactional Behavior", () => {
    test("should preserve original schema on validation failure", () => {
      const modelManager = new SchemaModelManager();
      const command = addTestElement({ parentId: "", elementName: "", elementType: "" });

      const result = processorWith({ modelManager }).execute(command, schemaXmlWith(PERSON_ELEMENT));

      expectValidationFailure(result);
      expect(topLevelElementNames(modelManager)).toEqual(["person"]);
    });

    test("should clone schema before executing commands", () => {
      const clonedSchema = new schema();
      clonedSchema.version = "cloned";
      const modelManager = mockModelManager(mockSchema, { cloneSchema: vi.fn().mockReturnValue(clonedSchema) });
      const executor: MockExecutor = {
        execute: vi.fn<CommandExecutor["execute"]>((_command, schemaObj) => {
          expect(schemaObj.version).toBe("cloned");
          schemaObj.version = "modified";
        }),
      };
      const command = addTestElement();

      const result = processorWith({ executor, modelManager }).execute(command, emptySchemaXml());

      expect(result.success).toBe(true);
      expect(executor.execute).toHaveBeenCalledWith(command, clonedSchema);
    });

    test("should preserve original schema on execution failure", () => {
      const modelManager = new SchemaModelManager();
      const command = addTestElement({ parentId: "/element:nonexistent" });

      const result = processorWith({ modelManager }).execute(command, schemaXmlWith(PERSON_ELEMENT));

      expectFailure(result);
      expect(topLevelElementNames(modelManager)).toEqual(["person"]);
    });

    test("should preserve original schema when command fails", () => {
      const modelManager = new SchemaModelManager();
      // Executor that changes the working copy and then throws an error
      const executor: MockExecutor = {
        execute: vi.fn<CommandExecutor["execute"]>((_command, workingSchema) => {
          const added = new topLevelElement();
          added.name = "added";
          workingSchema.element = [...(workingSchema.element ?? []), added];
          throw new Error("Execution failed");
        }),
      };

      const result = processorWith({ executor, modelManager }).execute(addTestElement(), schemaXmlWith(PERSON_ELEMENT));

      expectFailure(result);
      expect(result.error).toContain("Execution failed");
      expect(topLevelElementNames(modelManager)).toEqual(["person"]);
    });
  });

  describe("Error Handling", () => {
    test("should handle malformed XML gracefully", () => {
      const result = processor.execute(addTestElement(), "not valid xml at all");

      expectRuntimeFailure(result);
      expect(result.error).toContain("Failed to load schema from XML");
    });

    test("should report a failing schema load as a runtime failure", () => {
      const modelManager = mockModelManager(mockSchema, {
        loadFromXml: vi.fn(() => {
          throw new Error("XML parse error");
        }),
      });

      const result = processorWith({ modelManager }).execute(addTestElement(), emptySchemaXml());

      expectRuntimeFailure(result);
      expect(result.error).toContain("XML parse error");
      expect(modelManager.loadFromXml).toHaveBeenCalled();
    });

    test.each([
      ["a whitespace-only parent ID", { parentId: " " }, "Parent ID cannot be empty"],
      ["an invalid element name", { elementName: "123invalid" }, "Element name must be a valid XML name"],
    ])("should report the first validation error for %s", (_case, payload, error) => {
      const result = processor.execute(addTestElement(payload), emptySchemaXml());

      expectValidationFailure(result);
      expect(result.error).toBe(error);
    });

    test("should report a throwing executor as a runtime failure with its stack", () => {
      const result = processorWith({ executor: throwingExecutor("Executor crashed unexpectedly") }).execute(
        addTestElement(),
        emptySchemaXml()
      );

      expectRuntimeFailure(result);
      expect(result.error).toContain("Executor crashed unexpectedly");
    });

    test("should handle validator exceptions gracefully", () => {
      const validator: MockValidator = {
        validate: vi.fn(() => {
          throw new Error("Validator crashed");
        }),
      };

      const result = processorWith({ validator }).execute(addTestElement(), emptySchemaXml());

      expectFailure(result);
      expect(result.error).toContain("Validator crashed");
    });

    test("should handle SchemaModelManager toXml failure", () => {
      const modelManager = mockModelManager(mockSchema, {
        toXml: vi.fn(() => {
          throw new Error("Failed to serialize schema");
        }),
      });

      const result = processorWith({ executor: versionSettingExecutor(), modelManager }).execute(
        addTestElement(),
        emptySchemaXml()
      );

      expectFailure(result);
      expect(result.error).toContain("Failed to serialize schema");
    });
  });

  describe("Round-trip Validation", () => {
    test("should validate serialized XML can be parsed back", () => {
      const modelManager = mockModelManager(mockSchema);

      const result = processorWith({ executor: versionSettingExecutor(), modelManager }).execute(
        addTestElement(),
        emptySchemaXml()
      );

      expect(result.success).toBe(true);
      // Initial load and round-trip validation
      expect(modelManager.loadFromXml).toHaveBeenCalledTimes(2);
    });

    test("should fail if round-trip validation fails", () => {
      const loadFromXml = vi.fn<SchemaModelManager["loadFromXml"]>();
      loadFromXml.mockImplementationOnce(() => undefined).mockImplementationOnce(() => {
        throw new Error("Round-trip validation failed");
      });
      const modelManager = mockModelManager(mockSchema, { loadFromXml });

      const result = processorWith({ executor: versionSettingExecutor(), modelManager }).execute(
        addTestElement(),
        emptySchemaXml()
      );

      expectFailure(result);
      expect(result.error).toContain("Round-trip validation failed");
    });
  });

  describe("Invalid Commands", () => {
    test("should reject command with unknown type as a validation failure", () => {
      const result = processor.execute(INVALID_COMMAND, emptySchemaXml());

      expectValidationFailure(result);
      expect(result.error).toContain("Unknown command type");
    });
  });

  describe("Dependency Injection", () => {
    test("should accept custom validator, executor, and model manager", () => {
      const validator: MockValidator = { validate: vi.fn().mockReturnValue({ valid: true }) };
      const executor: MockExecutor = { execute: vi.fn() };
      const modelManager = mockModelManager(mockSchema);

      const result = processorWith({ validator, executor, modelManager }).execute(addTestElement(), emptySchemaXml());

      expect(validator.validate).toHaveBeenCalled();
      expect(executor.execute).toHaveBeenCalled();
      expect(modelManager.toXml).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    test("should use default dependencies when none provided", () => {
      const result = new CommandProcessor().execute(addTestElement(), emptySchemaXml());

      expect(result.success).toBe(true);
      expect(result.xmlContent).toContain('name="test"');
    });
  });

  describe("Concurrency Control", () => {
    test("should reject a command while another is executing, as a validation failure", () => {
      const executor: MockExecutor = { execute: vi.fn() };
      const processorWithMock = processorWith({ executor, modelManager: mockModelManager(mockSchema) });
      // Simulate an execution in progress
      Object.assign(processorWithMock, { isExecuting: true });

      const result = processorWithMock.execute(addTestElement(), emptySchemaXml());

      expectValidationFailure(result);
      expect(result.error).toContain("Another command is currently being executed");
      expect(executor.execute).not.toHaveBeenCalled();
    });

    test("should allow execution after previous command completes", () => {
      const executor = versionSettingExecutor();
      const processorWithMock = processorWith({ executor, modelManager: mockModelManager(mockSchema) });

      const result1 = processorWithMock.execute(addTestElement(), emptySchemaXml());
      const result2 = processorWithMock.execute(addTestElement(), emptySchemaXml());

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(executor.execute).toHaveBeenCalledTimes(2);
    });

    test("should release lock even when execution fails", () => {
      const processorWithMock = processorWith({
        executor: throwingExecutor("Execution failed"),
        modelManager: mockModelManager(mockSchema),
      });

      const result1 = processorWithMock.execute(addTestElement(), emptySchemaXml());
      const result2 = processorWithMock.execute(addTestElement(), emptySchemaXml());

      expect(result1.success).toBe(false);
      expectFailure(result2);
      expect(result2.error).toContain("Execution failed");
      expect(result2.error).not.toContain("Another command is currently being executed");
    });
  });
});
