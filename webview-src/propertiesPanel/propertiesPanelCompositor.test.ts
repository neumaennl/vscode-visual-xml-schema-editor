/**
 * Unit tests of the ID that a compositor gets when its kind changes.
 */

import { compositorIdAfterChange } from "./propertiesPanelCompositor";
import { diagramItem } from "../__tests__/diagramTestHelpers";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";

/** A complex type whose sequence holds a choice and two sequences, and a group definition with a choice. */
const COMPOSITORS = `<xs:complexType name="T"><xs:sequence>
  <xs:choice><xs:element name="a"/></xs:choice>
  <xs:sequence><xs:element name="b"/></xs:sequence>
  <xs:sequence><xs:element name="c"/></xs:sequence>
</xs:sequence></xs:complexType>
<xs:group name="G"><xs:choice><xs:element name="g"/></xs:choice></xs:group>`;

describe("compositorIdAfterChange", () => {
  test.each([
    ["the compositor of a complex type", "/complexType:T/sequence[0]", "choice", "/complexType:T/choice[0]"],
    ["the compositor of a group definition", "/group:G/choice[0]", "all", "/group:G/all[0]"],
    // Moves to the end of the sequences, after the two that are there
    ["a nested choice", "/complexType:T/sequence[0]/choice[0]", "sequence", "/complexType:T/sequence[0]/sequence[2]"],
    ["a nested sequence", "/complexType:T/sequence[0]/sequence[1]", "choice", "/complexType:T/sequence[0]/choice[1]"],
  ] as const)("should give %s the ID of its new kind", (_case, id, next, expected) => {
    expect(compositorIdAfterChange(diagramItem(webviewSchemaWith(COMPOSITORS), id), next)).toBe(expected);
  });
});
