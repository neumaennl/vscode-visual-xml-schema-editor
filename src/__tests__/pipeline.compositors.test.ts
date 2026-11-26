/**
 * Integration tests: compositor add / remove / modify pipeline.
 *
 * Covers compositors in other compositors, in complex content and in group definitions.
 * Success-path assertions are made against the unmarshalled schema object or the written XML.
 */

import {
  SCHEMA_WITH_GROUP,
  runCommandExpectSuccess,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./pipelineTestHelpers.js";
import { expectLinesInOrder } from "./textTestHelpers.js";
import { schemaXmlWith } from "../../shared/__tests__/schemaTestHelpers.js";

/** A complexType whose sequence holds two choices, and a complexType that restricts complex content with a sequence. */
const COMPOSITORS = schemaXmlWith(`<xs:complexType name="Choices">
  <xs:sequence><xs:choice/><xs:choice/></xs:sequence>
</xs:complexType>
<xs:complexType name="Restricted">
  <xs:complexContent><xs:restriction base="xs:anyType"><xs:sequence/></xs:restriction></xs:complexContent>
</xs:complexType>`);

describe("Integration: Compositor pipeline", () => {
  describe("addCompositor", () => {
    test("should write a choice nested in a sequence", () => {
      const xml = runCommandExpectSuccess(COMPOSITORS, {
        type: "addCompositor",
        payload: {
          parentId: "/complexType:Restricted/sequence[0]",
          compositor: "choice",
          maxOccurs: "unbounded",
        },
      });

      expectLinesInOrder(xml, [
        "<xs:restriction",
        "<xs:sequence>",
        '<xs:choice maxOccurs="unbounded"',
        "</xs:sequence>",
      ]);
    });

    test("should reject an all nested in a sequence", () => {
      runCommandExpectValidationFailure(
        COMPOSITORS,
        {
          type: "addCompositor",
          payload: { parentId: "/complexType:Restricted/sequence[0]", compositor: "all" },
        },
        "An all can only be the compositor of a complex type or a group definition"
      );
    });
  });

  describe("removeCompositor", () => {
    test("should remove a compositor nested in another compositor", () => {
      const result = runCommandExpectSuccessSchema(
        schemaXmlWith(`<xs:complexType name="T">
  <xs:sequence><xs:choice><xs:element name="a" type="xs:string"/></xs:choice></xs:sequence>
</xs:complexType>`),
        { type: "removeCompositor", payload: { compositorId: "/complexType:T/sequence[0]/choice[0]" } }
      );
      const sequence = (result.complexType ?? [])[0]!.sequence;

      expect(sequence).toBeDefined();
      expect(sequence?.choice ?? []).toHaveLength(0);
    });

    test("should remove one of two compositors nested in a sequence", () => {
      const result = runCommandExpectSuccessSchema(COMPOSITORS, {
        type: "removeCompositor",
        payload: { compositorId: "/complexType:Choices/sequence[0]/choice[1]" },
      });

      expect(result.complexType?.[0]?.sequence?.choice).toHaveLength(1);
    });

    test("should remove the compositor of a complexContent restriction", () => {
      const result = runCommandExpectSuccessSchema(COMPOSITORS, {
        type: "removeCompositor",
        payload: { compositorId: "/complexType:Restricted/sequence[0]" },
      });

      expect(result.complexType?.[1]?.complexContent?.restriction?.sequence).toBeUndefined();
    });
  });

  describe("modifyCompositor", () => {
    test("should modify the occurrences of a compositor", () => {
      const result = runCommandExpectSuccessSchema(COMPOSITORS, {
        type: "modifyCompositor",
        payload: { compositorId: "/complexType:Choices/sequence[0]", minOccurs: 0, maxOccurs: "unbounded" },
      });
      const sequence = result.complexType?.[0]?.sequence;

      expect(sequence?.minOccurs).toBe(0);
      expect(sequence?.maxOccurs).toBe("unbounded");
    });

    test("should reject occurrences on the compositor of a group definition", () => {
      runCommandExpectValidationFailure(
        SCHEMA_WITH_GROUP,
        { type: "modifyCompositor", payload: { compositorId: "/group:ContactGroup/sequence[0]", minOccurs: 0 } },
        "The compositor of a group definition cannot have minOccurs or maxOccurs"
      );
    });
  });

  describe("kind", () => {
    /** A complex type with a sequence of an optional element, and one with a choice of an element. */
    const KINDS = schemaXmlWith(`<xs:complexType name="T">
  <xs:sequence><xs:element name="a" type="xs:string" minOccurs="0"/></xs:sequence>
</xs:complexType>
<xs:complexType name="C">
  <xs:choice><xs:element name="b" type="xs:string"/></xs:choice>
</xs:complexType>`);

    test("should write the elements of a sequence into the all that replaces it", () => {
      const xml = runCommandExpectSuccess(KINDS, {
        type: "modifyCompositor",
        payload: { compositorId: "/complexType:T/sequence[0]", compositor: "all" },
      });

      expectLinesInOrder(xml, [
        '<xs:complexType name="T">',
        "<xs:all>",
        '<xs:element name="a" type="xs:string" minOccurs="0"/>',
        "</xs:all>",
      ]);
    });

    test("should keep the elements when a complex type gets another compositor", () => {
      const xml = runCommandExpectSuccess(KINDS, {
        type: "modifyComplexType",
        payload: { typeId: "/complexType:C", compositor: "sequence" },
      });

      expectLinesInOrder(xml, [
        '<xs:complexType name="C">',
        "<xs:sequence>",
        '<xs:element name="b" type="xs:string"/>',
        "</xs:sequence>",
      ]);
    });
  });

  test("should reject the removal of the compositor of a group definition", () => {
    runCommandExpectValidationFailure(
      SCHEMA_WITH_GROUP,
      { type: "removeCompositor", payload: { compositorId: "/group:ContactGroup/sequence[0]" } },
      "The compositor of a group definition cannot be removed, because a group definition needs one"
    );
  });
});
