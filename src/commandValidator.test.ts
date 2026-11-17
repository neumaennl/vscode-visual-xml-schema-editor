/**
 * Unit tests for `CommandValidator` class.
 * Tests the `validate()` method delegation logic with mocked validators.
 * No knowledge of validator implementation - proper unit testing with DI.
 */

import type { ValidatorFunctions } from "./commandValidator.js";
import { CommandValidator } from "./commandValidator.js";
import type { CommandHandler } from "./commandHandlers.js";
import type { SchemaCommand } from "../shared/types.js";
import { schema } from "../shared/types.js";
import type { ValidationResult } from "./commandValidators/validationUtils.js";
import { expectInvalid } from "./__tests__/validationTestHelpers.js";
import type { Mock } from "vitest";

/** A validator mock. */
type MockValidator = Mock<(command: SchemaCommand, schemaObj: schema) => ValidationResult>;

/**
 * Creates a mock that returns success for the validator function of each of the
 * {@link DELEGATED_COMMANDS}.
 *
 * @returns The validators to inject, and the mocks by the names of the validator functions
 */
function createMockValidators(): { validators: ValidatorFunctions; mocks: Map<string, MockValidator> } {
  const validators: Record<string, CommandHandler<ValidationResult>> = {};
  const mocks = new Map<string, MockValidator>();
  for (const command of DELEGATED_COMMANDS) {
    const mock = vi.fn<(command: SchemaCommand, schemaObj: schema) => ValidationResult>(() => ({ valid: true }));
    validators[validatorNameOf(command)] = mock;
    mocks.set(validatorNameOf(command), mock);
  }
  // Only the validators that the tests reach; the commands of other types are never sent
  return { validators: validators as ValidatorFunctions, mocks };
}

/**
 * Returns the name of the validator function of a command, such as `validateAddElement`.
 *
 * @param command - The command
 * @returns The name
 */
function validatorNameOf(command: SchemaCommand): string {
  return `validate${command.type.charAt(0).toUpperCase()}${command.type.slice(1)}`;
}

/** A command of several kinds, each of which must reach its own validator. */
const DELEGATED_COMMANDS: SchemaCommand[] = [
  { type: "addElement", payload: { parentId: "/schema", elementName: "testElement", elementType: "string" } },
  { type: "addSimpleType", payload: { typeName: "testType", baseType: "string" } },
  { type: "addGroup", payload: { groupName: "testGroup", contentModel: "sequence" } },
  { type: "addAnnotation", payload: { targetId: "element1", documentation: "Test annotation" } },
  { type: "addImport", payload: { namespace: "http://example.com/imported", schemaLocation: "imported.xsd" } },
  { type: "modifyComplexType", payload: { typeId: "type1", contentModel: "sequence" } },
  { type: "removeAttributeGroup", payload: { groupId: "attrGroup1" } },
  {
    type: "modifySchemaNamespaces",
    payload: {
      targetNamespace: "http://example.com/new-target",
      namespacePrefixes: { xs: "http://www.w3.org/2001/XMLSchema", tns: "http://example.com/new-target" },
    },
  },
];

describe("CommandValidator", () => {
  let mockSchema: schema;
  let mockValidators: Map<string, MockValidator>;
  let validator: CommandValidator;

  beforeEach(() => {
    mockSchema = new schema();
    const { validators, mocks } = createMockValidators();
    mockValidators = mocks;
    validator = new CommandValidator(validators);
  });

  describe("validate() method", () => {
    test("should handle unknown command types", () => {
      const result = validator.validate(
        // eslint-disable-next-line no-restricted-syntax -- `type` not in SchemaCommand union; cast needed to test unknown-type rejection at runtime
        { type: "unknownCommandType", payload: {} } as unknown as SchemaCommand,
        mockSchema
      );

      expectInvalid(result);
      expect(result.error).toContain("Unknown command type");
      expect(result.error).toContain("unknownCommandType");
      mockValidators.forEach((mockValidator) => {
        expect(mockValidator).not.toHaveBeenCalled();
      });
    });

    test.each(DELEGATED_COMMANDS.map((command) => [command.type, validatorNameOf(command), command] as const))(
      "should delegate %s to %s",
      (_type, name, command) => {
        const result = validator.validate(command, mockSchema);

        expect(result.valid).toBe(true);
        expect(mockValidators.get(name)).toHaveBeenCalledWith(command, mockSchema);
        expect(mockValidators.get(name)).toHaveBeenCalledTimes(1);
      }
    );

    test("should return validator error when validator returns invalid", () => {
      const command = DELEGATED_COMMANDS[0]!;
      mockValidators.get("validateAddElement")?.mockReturnValueOnce({ valid: false, error: "Element name cannot be empty" });

      const result = validator.validate(command, mockSchema);

      expectInvalid(result);
      expect(result.error).toBe("Element name cannot be empty");
      expect(mockValidators.get("validateAddElement")).toHaveBeenCalledWith(command, mockSchema);
    });
  });

  describe("default constructor behavior", () => {
    test("should use actual validators when no mocks are provided", () => {
      const result = new CommandValidator().validate(DELEGATED_COMMANDS[0]!, mockSchema);

      expect(result.valid).toBe(true);
    });
  });
});
