/**
 * Integration tests: the constraints of XML Schema that span the schema, which the pipeline checks after
 * a command. A command is rejected if its result violates a constraint that the schema did not violate
 * before; the validators of the commands leave these constraints to the pipeline.
 */

import type { SchemaCommand } from "../../shared/types.js";
import { schemaXmlWith } from "../../shared/__tests__/schemaTestHelpers.js";
import { runCommandExpectSuccessSchema, runCommandExpectValidationFailure } from "./pipelineTestHelpers.js";

/** A complex type `T` with the elements `a` (`xs:string`) and `b` (`xs:int`), used by nothing else. */
const T_WITH_A_AND_B = `<xs:complexType name="T"><xs:sequence>
  <xs:element name="a" type="xs:string"/>
  <xs:element name="b" type="xs:int"/>
</xs:sequence></xs:complexType>`;

/** The ID of the sequence of `T`. */
const T_SEQUENCE = "/complexType:T/sequence[0]";

/** The error for elements `a` of the types `xs:string` and `xs:int` in `T`. */
const A_TYPES_ERROR = "Elements named 'a' in complex type 'T' must have the same type, but have xs:string and xs:int";

describe("Integration: constraints that span the schema", () => {
  test.each<[string, string, SchemaCommand]>([
    [
      "an element with the name of another one and another type",
      T_WITH_A_AND_B,
      { type: "addElement", payload: { parentId: T_SEQUENCE, elementName: "a", elementType: "xs:int" } },
    ],
    [
      "a rename to the name of an element with another type",
      T_WITH_A_AND_B,
      { type: "modifyElement", payload: { elementId: `${T_SEQUENCE}/element:b[1]`, elementName: "a" } },
    ],
    [
      "an element in a group definition that a complex type with another type of it references",
      `<xs:group name="G"><xs:sequence/></xs:group>
<xs:complexType name="T"><xs:sequence><xs:element name="a" type="xs:string"/><xs:group ref="G"/></xs:sequence></xs:complexType>`,
      {
        type: "addElement",
        payload: { parentId: "/group:G/sequence[0]", elementName: "a", elementType: "xs:int" },
      },
    ],
  ])("should reject %s", (_case, body, command) => {
    runCommandExpectValidationFailure(schemaXmlWith(body), command, A_TYPES_ERROR);
  });

  test("should add an element with the name and the type of another one", () => {
    const schemaObj = runCommandExpectSuccessSchema(schemaXmlWith(T_WITH_A_AND_B), {
      type: "addElement",
      payload: { parentId: T_SEQUENCE, elementName: "a", elementType: "xs:string" },
    });

    expect(schemaObj.complexType?.[0]?.sequence?.element?.map((element) => element.name)).toEqual(["a", "b", "a"]);
  });

  test("should reject an attribute that an attribute group of the complex type declares", () => {
    const body = `<xs:attributeGroup name="AG"><xs:attribute name="x"/></xs:attributeGroup>
<xs:complexType name="T"><xs:attributeGroup ref="AG"/></xs:complexType>`;

    runCommandExpectValidationFailure(
      schemaXmlWith(body),
      { type: "addAttribute", payload: { parentId: "/complexType:T", attributeName: "x", attributeType: "xs:string" } },
      "Complex type 'T' has more than one attribute named 'x'"
    );
  });

  test("should add a second reference to the same attribute group", () => {
    const body = `<xs:attributeGroup name="AG"><xs:attribute name="x"/></xs:attributeGroup>
<xs:complexType name="T"><xs:attributeGroup ref="AG"/></xs:complexType>`;

    const schemaObj = runCommandExpectSuccessSchema(schemaXmlWith(body), {
      type: "addAttributeGroup",
      payload: { ref: "AG", parentId: "/complexType:T" },
    });

    expect(schemaObj.complexType?.[0]?.attributeGroup).toHaveLength(2);
  });

  describe("references to a group definition with an all", () => {
    /** A group definition with an all, one with a sequence that `S` references in its sequence, and an empty `E`. */
    const ALL_GROUP = `<xs:group name="AllGroup"><xs:all><xs:element name="g" type="xs:string"/></xs:all></xs:group>
<xs:group name="SeqGroup"><xs:sequence><xs:element name="h" type="xs:string"/></xs:sequence></xs:group>
<xs:complexType name="S"><xs:sequence><xs:group ref="SeqGroup"/></xs:sequence></xs:complexType>
<xs:complexType name="E"/>`;

    /** The error for a reference to `AllGroup` in a sequence or a choice. */
    const IN_COMPOSITOR_ERROR =
      "Group 'AllGroup' has an all, so it can only be referenced as the whole content of a complex type, not in a sequence or a choice";

    test.each<[string, SchemaCommand, string]>([
      [
        "a reference in a sequence",
        { type: "addGroup", payload: { parentId: "/complexType:S/sequence[0]", ref: "AllGroup" } },
        IN_COMPOSITOR_ERROR,
      ],
      [
        "a reference in a sequence that changes to the group",
        {
          type: "modifyGroup",
          payload: { groupId: "/complexType:S/sequence[0]/groupRef:SeqGroup[0]", ref: "AllGroup" },
        },
        IN_COMPOSITOR_ERROR,
      ],
      [
        "an all for a group definition that a sequence references",
        { type: "modifyGroup", payload: { groupId: "/group:SeqGroup", compositor: "all" } },
        "Group 'SeqGroup' has an all, so it can only be referenced as the whole content of a complex type, not in a sequence or a choice",
      ],
      [
        "a repeated reference as the whole content",
        { type: "addGroup", payload: { parentId: "/complexType:E", ref: "AllGroup", maxOccurs: 2 } },
        "Group 'AllGroup' has an all, so its reference in complex type 'E' must have minOccurs 0 or 1 and maxOccurs 1",
      ],
    ])("should reject %s", (_case, command, error) => {
      runCommandExpectValidationFailure(schemaXmlWith(ALL_GROUP), command, error);
    });

    test("should add a reference as the whole content", () => {
      const schemaObj = runCommandExpectSuccessSchema(schemaXmlWith(ALL_GROUP), {
        type: "addGroup",
        payload: { parentId: "/complexType:E", ref: "AllGroup", minOccurs: 0 },
      });

      expect(schemaObj.complexType?.[1]?.group).toMatchObject({ ref: "AllGroup", minOccurs: 0 });
    });
  });

  describe("a schema that already violates a constraint", () => {
    /** {@link T_WITH_A_AND_B} with a second `a` of `xs:int`, and an empty complex type `U`. */
    const INVALID = `<xs:complexType name="T"><xs:sequence>
  <xs:element name="a" type="xs:string"/>
  <xs:element name="a" type="xs:int"/>
</xs:sequence></xs:complexType>
<xs:complexType name="U"><xs:sequence/></xs:complexType>`;

    test.each<[string, SchemaCommand]>([
      [
        "a change elsewhere",
        { type: "addElement", payload: { parentId: "/complexType:U/sequence[0]", elementName: "c" } },
      ],
      [
        "a rename of the complex type that violates it",
        { type: "modifyComplexType", payload: { typeId: "/complexType:T", typeName: "V" } },
      ],
    ])("should accept %s", (_case, command) => {
      expect(runCommandExpectSuccessSchema(schemaXmlWith(INVALID), command)).toBeDefined();
    });
  });

  test("should accept replacing a compositor with a reference to a group with an all that it already had", () => {
    const body = `<xs:group name="AllGroup"><xs:all><xs:element name="g" type="xs:string"/></xs:all></xs:group>
<xs:complexType name="S"><xs:sequence><xs:group ref="AllGroup"/></xs:sequence></xs:complexType>`;

    const schemaObj = runCommandExpectSuccessSchema(schemaXmlWith(body), {
      type: "modifyCompositor",
      payload: { compositorId: "/complexType:S/sequence[0]", compositor: "choice" },
    });

    expect(schemaObj.complexType?.[0]?.choice?.group?.[0]?.ref).toBe("AllGroup");
  });
});
