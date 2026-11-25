/**
 * Unit tests of `CommandProcessor`: the order of the steps, the results and the error handling. The
 * validator, the executor and the conversion of the XML are real unless a test replaces them.
 */

import { CommandProcessor } from "./commandProcessor.js";
import type {
  CommandExecutionResult,
  CommandExecutionFailure,
  CommandExecutionValidationFailure,
  CommandExecutionRuntimeFailure,
} from "./commandProcessor.js";
import type { AddElementCommand, AddElementPayload, SchemaCommand } from "../shared/types.js";
import type { CommandValidator } from "./commandValidator.js";
import type { CommandExecutor } from "./commandExecutor.js";
import { parseSchema, serializeSchema } from "./schemaXml.js";
import type * as SchemaXml from "./schemaXml.js";
import { emptySchemaXml, schemaXmlWith } from "../shared/__tests__/schemaTestHelpers.js";

// The real conversion, which single tests make fail
vi.mock("./schemaXml.js", { spy: true });

// Type-safe mock types for testing
type MockValidator = Pick<CommandValidator, "validate">;
type MockExecutor = Pick<CommandExecutor, "execute">;

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
    payload: { parentId: "/schema", elementName: "test", elementType: "xs:string", ...payload },
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
function processorWith(mocks: { validator?: MockValidator; executor?: MockExecutor }): CommandProcessor {
  return new CommandProcessor(
    mocks.validator as CommandValidator | undefined,
    mocks.executor as CommandExecutor | undefined
  );
}

/**
 * Makes the next call of a function of `schemaXml` throw.
 *
 * @param fn - `parseSchema` or `serializeSchema`
 * @param message - The message of the error
 */
function failNextCall(fn: typeof parseSchema | typeof serializeSchema, message: string): void {
  vi.mocked(fn).mockImplementationOnce(() => {
    throw new Error(message);
  });
}

/**
 * Asserts that a `CommandExecutionResult` represents a failure without XML, and narrows its type to
 * `CommandExecutionFailure`, enabling access to `.error` and `.errorKind`.
 *
 * @param result - The result of the command
 * @throws An {@link Error} if the command succeeded
 */
function expectFailure(result: CommandExecutionResult): asserts result is CommandExecutionFailure {
  expect(result.success).toBe(false);
  expect(result.xmlContent).toBeNull();
  if (result.success) throw new Error("Expected command execution to fail");
}

/**
 * Asserts that a `CommandExecutionResult` represents a runtime failure with a stack and narrows its type
 * to `CommandExecutionRuntimeFailure`.
 *
 * @param result - The result of the command
 * @throws An {@link Error} if the command succeeded or failed validation
 */
function expectRuntimeFailure(result: CommandExecutionResult): asserts result is CommandExecutionRuntimeFailure {
  expectFailure(result);
  expect(result.errorKind).toBe("runtime");
  if (result.errorKind !== "runtime") throw new Error("Expected runtime failure");
  expect(typeof result.stack).toBe("string");
}

/**
 * Asserts that a `CommandExecutionResult` represents a validation failure and narrows
 * its type to `CommandExecutionValidationFailure`.
 *
 * @param result - The result of the command
 * @throws An {@link Error} if the command succeeded or failed at runtime
 */
function expectValidationFailure(result: CommandExecutionResult): asserts result is CommandExecutionValidationFailure {
  expectFailure(result);
  expect(result.errorKind).toBe("validation");
  if (result.errorKind !== "validation") throw new Error("Expected validation failure");
}

describe("CommandProcessor", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Core functionality", () => {
    test("should parse, validate and execute on the same object, serialize, parse again and return the new XML", () => {
      const validator: MockValidator = { validate: vi.fn().mockReturnValue({ valid: true }) };
      const executor = versionSettingExecutor();

      const result = processorWith({ validator, executor }).execute(addTestElement(), emptySchemaXml());

      const parsed = vi.mocked(validator.validate).mock.calls[0]?.[1];
      expect(parseSchema).toHaveBeenNthCalledWith(1, emptySchemaXml());
      expect(parseSchema).toHaveNthReturnedWith(1, parsed);
      // The executor changes the object that the validator checked; there is no copy
      expect(vi.mocked(executor.execute).mock.calls[0]?.[1]).toBe(parsed);
      expect(serializeSchema).toHaveBeenCalledWith(parsed);
      expect(result.success).toBe(true);
      expect(result.xmlContent).toContain('version="1.0"');
      expect(parseSchema).toHaveBeenNthCalledWith(2, result.xmlContent);
      expect(result).not.toHaveProperty("errorKind");
    });

    test("should use the real validator and executor by default", () => {
      const result = new CommandProcessor().execute(addTestElement(), emptySchemaXml());

      expect(result.success).toBe(true);
      expect(result.xmlContent).toContain('name="test"');
    });

    test("should parse the document again for every command", () => {
      const processor = new CommandProcessor();

      processor.execute(addTestElement(), emptySchemaXml());
      const second = processor.execute(addTestElement(), schemaXmlWith(PERSON_ELEMENT));

      expect(second.success).toBe(true);
      expect(second.xmlContent).toContain('name="person"');
      expect(second.xmlContent).toContain('name="test"');
    });
  });

  describe("Validation failures", () => {
    test.each([
      ["a whitespace-only parent ID", { parentId: " " }, "Parent ID cannot be empty"],
      ["an invalid element name", { elementName: "123invalid" }, "Element name must be a valid XML name"],
    ])("should report the first validation error for %s without executing", (_case, payload, error) => {
      const executor = versionSettingExecutor();

      const result = processorWith({ executor }).execute(addTestElement(payload), emptySchemaXml());

      expectValidationFailure(result);
      expect(result.error).toBe(error);
      expect(executor.execute).not.toHaveBeenCalled();
    });

    test("should reject a command with an unknown type", () => {
      const result = new CommandProcessor().execute(INVALID_COMMAND, emptySchemaXml());

      expectValidationFailure(result);
      expect(result.error).toContain("Unknown command type");
    });
  });

  describe("Runtime failures", () => {
    test("should report text that is no schema", () => {
      const result = new CommandProcessor().execute(addTestElement(), "not valid xml at all");

      expectRuntimeFailure(result);
      expect(result.error).toContain("Failed to parse the schema");
    });

    test("should report a throwing validator", () => {
      const validator: MockValidator = {
        validate: vi.fn(() => {
          throw new Error("Validator crashed");
        }),
      };

      const result = processorWith({ validator }).execute(addTestElement(), emptySchemaXml());

      expectRuntimeFailure(result);
      expect(result.error).toContain("Validator crashed");
    });

    test("should report a throwing executor with its stack", () => {
      const result = processorWith({ executor: throwingExecutor("Executor crashed unexpectedly") }).execute(
        addTestElement(),
        emptySchemaXml()
      );

      expectRuntimeFailure(result);
      expect(result.error).toContain("Executor crashed unexpectedly");
    });

    test("should report a schema that cannot be serialized", () => {
      failNextCall(serializeSchema, "Failed to serialize the schema");

      const result = processorWith({ executor: versionSettingExecutor() }).execute(addTestElement(), emptySchemaXml());

      expectRuntimeFailure(result);
      expect(result.error).toContain("Failed to serialize the schema");
    });

    test("should reject a result that cannot be parsed again", async () => {
      const actual = await vi.importActual<typeof SchemaXml>("./schemaXml.js");
      vi.mocked(parseSchema).mockImplementationOnce(actual.parseSchema);
      failNextCall(parseSchema, "Round-trip validation failed");

      const result = processorWith({ executor: versionSettingExecutor() }).execute(addTestElement(), emptySchemaXml());

      expectRuntimeFailure(result);
      expect(result.error).toContain("Round-trip validation failed");
    });
  });
});
