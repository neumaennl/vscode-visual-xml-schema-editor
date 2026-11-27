/**
 * Unit tests for the assumptions that the executors make about validated commands.
 */

import { schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";
import { locateChildValidated } from "./assumeValidated.js";

describe("locateChildValidated", () => {
  test("should locate a top-level child in the schema", () => {
    const schemaObj = schemaWith(`<xs:element name="a" type="xs:string"/>`);

    const { parsed, location, child } = locateChildValidated(schemaObj, "/element:a", "Element");

    expect(parsed.name).toBe("a");
    expect(location.parent).toBe(schemaObj);
    expect(child.what).toBe("Element a");
    expect(child.matches({ name: "a" }, 0)).toBe(true);
    expect(child.matches({ name: "b" }, 0)).toBe(false);
  });

  test("should locate the parent of a local child and identify the child by its position", () => {
    const schemaObj = schemaWith(`<xs:complexType name="T">
  <xs:attribute ref="r"/>
</xs:complexType>`);

    const { location, child } = locateChildValidated(schemaObj, "/complexType:T/attribute[0]", "Attribute");

    expect(location.parent).toBe(schemaObj.complexType?.[0]);
    expect(child.what).toBe("Attribute at position 0");
    expect(child.matches({}, 0)).toBe(true);
  });

  test("should fail when the parent is not found", () => {
    const schemaObj = schemaWith("");

    expect(() => locateChildValidated(schemaObj, "/complexType:T/attribute:a", "Attribute")).toThrow(
      "Node /complexType:T not found, although the validator accepted the command"
    );
  });
});
