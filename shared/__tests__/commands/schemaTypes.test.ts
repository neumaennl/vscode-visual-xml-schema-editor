/**
 * Unit tests for simple and complex type command types.
 */

import {
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
} from "../../commands/schemaTypes";

describe("Simple Type Commands", () => {
  test("AddSimpleTypeCommand with restrictions", () => {
    const command: AddSimpleTypeCommand = {
      type: "addSimpleType",
      payload: {
        typeName: "CustomString",
        baseType: "string",
        restrictions: {
          minLength: 5,
          maxLength: 50,
          pattern: "[a-zA-Z]+",
        },
      },
    };

    expect(command.type).toBe("addSimpleType");
    expect(command.payload.typeName).toBe("CustomString");
    expect(command.payload.restrictions?.minLength).toBe(5);
    expect(command.payload.restrictions?.pattern).toBe("[a-zA-Z]+");
  });

  test("AddSimpleTypeCommand with enumeration", () => {
    const command: AddSimpleTypeCommand = {
      type: "addSimpleType",
      payload: {
        typeName: "StatusType",
        baseType: "string",
        restrictions: {
          enumeration: ["active", "inactive", "pending"],
        },
      },
    };

    expect(command.payload.restrictions?.enumeration).toEqual([
      "active",
      "inactive",
      "pending",
    ]);
  });

  test("RemoveSimpleTypeCommand should have correct structure", () => {
    const command: RemoveSimpleTypeCommand = {
      type: "removeSimpleType",
      payload: {
        typeId: "type-123",
      },
    };

    expect(command.type).toBe("removeSimpleType");
    expect(command.payload.typeId).toBe("type-123");
  });

  test("ModifySimpleTypeCommand with new restrictions", () => {
    const command: ModifySimpleTypeCommand = {
      type: "modifySimpleType",
      payload: {
        typeId: "type-456",
        restrictions: {
          minInclusive: "0",
          maxInclusive: "100",
        },
      },
    };

    expect(command.payload.restrictions?.minInclusive).toBe("0");
    expect(command.payload.restrictions?.maxInclusive).toBe("100");
  });

  test("Restriction facets with all fields", () => {
    const command: AddSimpleTypeCommand = {
      type: "addSimpleType",
      payload: {
        typeName: "CompleteType",
        baseType: "decimal",
        restrictions: {
          minInclusive: "0",
          maxInclusive: "100",
          minExclusive: "-1",
          maxExclusive: "101",
          length: 10,
          minLength: 5,
          maxLength: 15,
          pattern: "[0-9]+",
          enumeration: ["val1", "val2"],
          whiteSpace: "collapse",
          totalDigits: 10,
          fractionDigits: 2,
        },
      },
    };

    expect(command.payload.restrictions?.minInclusive).toBe("0");
    expect(command.payload.restrictions?.totalDigits).toBe(10);
    expect(command.payload.restrictions?.whiteSpace).toBe("collapse");
  });
});

describe("Complex Type Commands", () => {
  test("AddComplexTypeCommand should have correct structure", () => {
    const command: AddComplexTypeCommand = {
      type: "addComplexType",
      payload: {
        typeName: "PersonType",
        contentModel: "sequence",
        abstract: false,
        mixed: false,
      },
    };

    expect(command.type).toBe("addComplexType");
    expect(command.payload.typeName).toBe("PersonType");
    expect(command.payload.contentModel).toBe("sequence");
  });

  test("AddComplexTypeCommand with base type extension", () => {
    const command: AddComplexTypeCommand = {
      type: "addComplexType",
      payload: {
        typeName: "EmployeeType",
        contentModel: "sequence",
        baseType: "PersonType",
      },
    };

    expect(command.payload.baseType).toBe("PersonType");
  });

  test("AddComplexTypeCommand with all content models", () => {
    const sequenceCommand: AddComplexTypeCommand = {
      type: "addComplexType",
      payload: { typeName: "Type1", contentModel: "sequence" },
    };
    const choiceCommand: AddComplexTypeCommand = {
      type: "addComplexType",
      payload: { typeName: "Type2", contentModel: "choice" },
    };
    const allCommand: AddComplexTypeCommand = {
      type: "addComplexType",
      payload: { typeName: "Type3", contentModel: "all" },
    };

    expect(sequenceCommand.payload.contentModel).toBe("sequence");
    expect(choiceCommand.payload.contentModel).toBe("choice");
    expect(allCommand.payload.contentModel).toBe("all");
  });

  test("RemoveComplexTypeCommand should have correct structure", () => {
    const command: RemoveComplexTypeCommand = {
      type: "removeComplexType",
      payload: {
        typeId: "complexType-123",
      },
    };

    expect(command.type).toBe("removeComplexType");
    expect(command.payload.typeId).toBe("complexType-123");
  });

  test("ModifyComplexTypeCommand with partial updates", () => {
    const command: ModifyComplexTypeCommand = {
      type: "modifyComplexType",
      payload: {
        typeId: "complexType-456",
        abstract: true,
        mixed: true,
      },
    };

    expect(command.payload.abstract).toBe(true);
    expect(command.payload.mixed).toBe(true);
  });
});
