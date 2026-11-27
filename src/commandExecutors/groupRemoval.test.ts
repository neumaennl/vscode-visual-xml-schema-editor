/**
 * Unit tests for the removal of a group or an attribute group by the ID of its definition or of a reference.
 */

import type { ParsedSchemaId } from "../../shared/idStrategy.js";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";
import { removeGroupDefinitionOrReference } from "./groupRemoval.js";

/** A group and an attribute group, each with a definition that stays after the other is removed. */
const GROUPS = `<xs:group name="A">
  <xs:sequence/>
</xs:group>
<xs:group name="B">
  <xs:sequence/>
</xs:group>
<xs:attributeGroup name="A"/>
<xs:attributeGroup name="B"/>`;

describe("removeGroupDefinitionOrReference", () => {
  test.each([
    ["group", "/group:A"],
    ["attributeGroup", "/attributeGroup:A"],
  ] as const)("should remove the %s definition that the ID names", (kind, groupId) => {
    const schemaObj = schemaWith(GROUPS);
    const removeReference = vi.fn<(parsed: ParsedSchemaId) => void>();

    removeGroupDefinitionOrReference(schemaObj, groupId, kind, removeReference);

    expect(schemaObj[kind]?.map((definition) => definition.name)).toEqual(["B"]);
    expect(removeReference).not.toHaveBeenCalled();
  });

  test.each([
    ["group", "/complexType:T/sequence[0]/groupRef:A[0]"],
    ["attributeGroup", "/complexType:T/attributeGroupRef:A[0]"],
  ] as const)("should leave a %s reference to the given function", (kind, groupId) => {
    const schemaObj = schemaWith(GROUPS);
    const removeReference = vi.fn<(parsed: ParsedSchemaId) => void>();

    removeGroupDefinitionOrReference(schemaObj, groupId, kind, removeReference);

    expect(removeReference).toHaveBeenCalledWith(expect.objectContaining({ name: "A", position: 0 }));
    expect(schemaObj[kind]).toHaveLength(2);
  });

  test("should fail when the definition is not found", () => {
    const schemaObj = schemaWith(GROUPS);

    expect(() => {
      removeGroupDefinitionOrReference(schemaObj, "/group:C", "group", vi.fn());
    }).toThrow("Group /group:C not found, although the validator accepted the command");
  });
});
