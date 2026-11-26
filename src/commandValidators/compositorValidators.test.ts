/**
 * Unit tests for the compositor validators.
 */

import type { AddCompositorCommand, RemoveCompositorCommand, ModifyCompositorCommand } from "../../shared/types.js";
import { validateAddCompositor, validateRemoveCompositor, validateModifyCompositor } from "./compositorValidators.js";
import { expectInvalid } from "../../shared/__tests__/validationTestHelpers.js";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";

/** A complexType with a sequence, a group definition with a choice and a complexType with an all. */
const COMPOSITORS = `<xs:complexType name="PersonType"><xs:sequence><xs:element name="name" type="xs:string"/></xs:sequence></xs:complexType>
<xs:group name="PersonGroup"><xs:choice><xs:element name="id" type="xs:string"/></xs:choice></xs:group>
<xs:complexType name="AddressType"><xs:all><xs:element name="city" type="xs:string"/></xs:all></xs:complexType>`;

/** The ID of the sequence of `PersonType`. */
const SEQUENCE_ID = "/complexType:PersonType/sequence[0]";

/**
 * Builds an `addCompositor` command.
 *
 * @param payload - The payload
 * @returns The command
 */
function addCompositor(payload: AddCompositorCommand["payload"]): AddCompositorCommand {
  return { type: "addCompositor", payload };
}

/**
 * Builds a `removeCompositor` command.
 *
 * @param compositorId - The ID of the compositor
 * @returns The command
 */
function removeCompositor(compositorId: string): RemoveCompositorCommand {
  return { type: "removeCompositor", payload: { compositorId } };
}

/**
 * Builds a `modifyCompositor` command.
 *
 * @param payload - The payload
 * @returns The command
 */
function modifyCompositor(payload: ModifyCompositorCommand["payload"]): ModifyCompositorCommand {
  return { type: "modifyCompositor", payload };
}

describe("validateAddCompositor", () => {
  test.each([
    { parentId: SEQUENCE_ID, compositor: "choice" as const },
    { parentId: "/group:PersonGroup/choice[0]", compositor: "sequence" as const },
  ])("should accept a $compositor in $parentId", ({ parentId, compositor }) => {
    const result = validateAddCompositor(
      addCompositor({ parentId, compositor, minOccurs: 0, maxOccurs: "unbounded" }),
      schemaWith(COMPOSITORS)
    );
    expect(result.valid).toBe(true);
  });

  test.each([
    {
      case: "an all in a sequence",
      payload: { parentId: SEQUENCE_ID, compositor: "all" as const },
      error: "An all can only be the compositor of a complex type or a group definition",
    },
    {
      case: "a sequence in an all",
      payload: { parentId: "/complexType:AddressType/all[0]", compositor: "sequence" as const },
      error: "An all cannot hold compositors",
    },
    {
      case: "a complex type as parent",
      payload: { parentId: "/complexType:PersonType", compositor: "sequence" as const },
      error: "Not a compositor: /complexType:PersonType",
    },
    {
      case: "an empty parent ID",
      payload: { parentId: "", compositor: "sequence" as const },
      error: "Parent ID cannot be empty",
    },
    {
      case: "a parent that does not exist",
      payload: { parentId: "/complexType:PersonType/choice[0]", compositor: "sequence" as const },
      error: "Compositor not found: /complexType:PersonType/choice[0]",
    },
    {
      case: "minOccurs greater than maxOccurs",
      payload: { parentId: SEQUENCE_ID, compositor: "choice" as const, minOccurs: 2, maxOccurs: 1 },
      error: "minOccurs must be <= maxOccurs",
    },
  ])("should reject $case", ({ payload, error }) => {
    const result = validateAddCompositor(addCompositor(payload), schemaWith(COMPOSITORS));
    expectInvalid(result);
    expect(result.error).toBe(error);
  });

  test("should reject a compositor other than sequence, choice or all", () => {
    // eslint-disable-next-line no-restricted-syntax -- an invalid compositor, as the webview could send it, which TypeScript does not allow
    const command = addCompositor({
      parentId: SEQUENCE_ID,
      compositor: "simpleContent",
    } as unknown as AddCompositorCommand["payload"]);
    const result = validateAddCompositor(command, schemaWith(COMPOSITORS));
    expectInvalid(result);
    expect(result.error).toContain("Compositor must be one of");
  });
});

describe("validateRemoveCompositor", () => {
  test("should accept an existing compositor", () => {
    expect(validateRemoveCompositor(removeCompositor(SEQUENCE_ID), schemaWith(COMPOSITORS)).valid).toBe(true);
  });

  // A group definition needs exactly one compositor
  test("should reject the compositor of a group definition", () => {
    const result = validateRemoveCompositor(removeCompositor("/group:PersonGroup/choice[0]"), schemaWith(COMPOSITORS));
    expectInvalid(result);
    expect(result.error).toBe(
      "The compositor of a group definition cannot be removed, because a group definition needs one"
    );
  });

  test.each([
    { compositorId: "", error: "Compositor ID cannot be empty" },
    { compositorId: "/group:PersonGroup", error: "Not a compositor: /group:PersonGroup" },
    { compositorId: "/complexType:PersonType", error: "Not a compositor: /complexType:PersonType" },
    {
      compositorId: "/complexType:PersonType/choice[0]",
      error: "Compositor not found: /complexType:PersonType/choice[0]",
    },
  ])("should reject '$compositorId'", ({ compositorId, error }) => {
    const result = validateRemoveCompositor(removeCompositor(compositorId), schemaWith(COMPOSITORS));
    expectInvalid(result);
    expect(result.error).toBe(error);
  });
});

describe("validateModifyCompositor", () => {
  test("should accept occurrences of a compositor", () => {
    const result = validateModifyCompositor(
      modifyCompositor({ compositorId: SEQUENCE_ID, minOccurs: 0, maxOccurs: "unbounded" }),
      schemaWith(COMPOSITORS)
    );
    expect(result.valid).toBe(true);
  });

  test("should reject a compositor that does not exist", () => {
    const result = validateModifyCompositor(
      modifyCompositor({ compositorId: "/complexType:PersonType/all[0]", minOccurs: 0 }),
      schemaWith(COMPOSITORS)
    );
    expectInvalid(result);
    expect(result.error).toBe("Compositor not found: /complexType:PersonType/all[0]");
  });

  // XML Schema allows no occurrences on the compositor of a group definition
  test("should reject occurrences on the compositor of a group definition", () => {
    const result = validateModifyCompositor(
      modifyCompositor({ compositorId: "/group:PersonGroup/choice[0]", minOccurs: 0 }),
      schemaWith(COMPOSITORS)
    );
    expectInvalid(result);
    expect(result.error).toBe("The compositor of a group definition cannot have minOccurs or maxOccurs");
  });

  test("should reject minOccurs greater than maxOccurs", () => {
    const result = validateModifyCompositor(
      modifyCompositor({ compositorId: SEQUENCE_ID, minOccurs: 2, maxOccurs: 1 }),
      schemaWith(COMPOSITORS)
    );
    expectInvalid(result);
    expect(result.error).toBe("minOccurs must be <= maxOccurs");
  });
});

/** Compositors whose kind changes: with nested compositors, with elements that an all allows and with elements it does not. */
const KIND_CHANGES = `<xs:complexType name="Nested"><xs:sequence><xs:choice><xs:element name="a" type="xs:string"/></xs:choice></xs:sequence></xs:complexType>
<xs:complexType name="Optional"><xs:sequence minOccurs="0"><xs:element name="a" type="xs:string" minOccurs="0"/></xs:sequence></xs:complexType>
<xs:complexType name="Repeated"><xs:sequence><xs:element name="a" type="xs:string" maxOccurs="unbounded"/></xs:sequence></xs:complexType>
<xs:complexType name="RepeatedSequence"><xs:sequence maxOccurs="2"><xs:element name="a" type="xs:string"/></xs:sequence></xs:complexType>
<xs:complexType name="Unordered"><xs:all><xs:element name="a" type="xs:string"/></xs:all></xs:complexType>
<xs:group name="G"><xs:sequence><xs:element name="a" type="xs:string"/></xs:sequence></xs:group>`;

describe("validateModifyCompositor (kind)", () => {
  test.each([
    {
      case: "a nested choice to a sequence",
      compositorId: "/complexType:Nested/sequence[0]/choice[0]",
      compositor: "sequence" as const,
    },
    {
      case: "a sequence with nested compositors to a choice",
      compositorId: "/complexType:Nested/sequence[0]",
      compositor: "choice" as const,
    },
    {
      case: "a sequence of optional elements to an all",
      compositorId: "/complexType:Optional/sequence[0]",
      compositor: "all" as const,
    },
    {
      case: "an all to a sequence",
      compositorId: "/complexType:Unordered/all[0]",
      compositor: "sequence" as const,
    },
    {
      case: "the compositor of a group definition to an all",
      compositorId: "/group:G/sequence[0]",
      compositor: "all" as const,
    },
  ])("should accept changing $case", ({ compositorId, compositor }) => {
    expect(
      validateModifyCompositor(modifyCompositor({ compositorId, compositor }), schemaWith(KIND_CHANGES)).valid
    ).toBe(true);
  });

  test.each([
    {
      case: "a nested choice to an all",
      payload: { compositorId: "/complexType:Nested/sequence[0]/choice[0]", compositor: "all" as const },
      error: "An all can only be the compositor of a complex type or a group definition",
    },
    {
      case: "a sequence with a nested choice to an all",
      payload: { compositorId: "/complexType:Nested/sequence[0]", compositor: "all" as const },
      error: "A sequence with particles other than elements cannot become an all",
    },
    {
      case: "a sequence with a repeated element to an all",
      payload: { compositorId: "/complexType:Repeated/sequence[0]", compositor: "all" as const },
      error: "Element 'a': maxOccurs of an element in an all must be 0 or 1",
    },
    {
      case: "a repeated sequence to an all",
      payload: { compositorId: "/complexType:RepeatedSequence/sequence[0]", compositor: "all" as const },
      error: "maxOccurs of an all must be 1",
    },
  ])("should reject changing $case", ({ payload, error }) => {
    const result = validateModifyCompositor(modifyCompositor(payload), schemaWith(KIND_CHANGES));
    expectInvalid(result);
    expect(result.error).toBe(error);
  });

  test("should accept changing a repeated sequence to an all with new occurrences", () => {
    const result = validateModifyCompositor(
      modifyCompositor({
        compositorId: "/complexType:RepeatedSequence/sequence[0]",
        compositor: "all",
        maxOccurs: 1,
      }),
      schemaWith(KIND_CHANGES)
    );
    expect(result.valid).toBe(true);
  });

  test.each([
    { minOccurs: 2, error: "minOccurs of an all must be 0 or 1" },
    { maxOccurs: "unbounded" as const, error: "maxOccurs of an all must be 1" },
  ])("should reject the occurrences $minOccurs..$maxOccurs of an all", ({ error, ...occurrences }) => {
    const result = validateModifyCompositor(
      modifyCompositor({ compositorId: "/complexType:Unordered/all[0]", ...occurrences }),
      schemaWith(KIND_CHANGES)
    );
    expectInvalid(result);
    expect(result.error).toBe(error);
  });
});
