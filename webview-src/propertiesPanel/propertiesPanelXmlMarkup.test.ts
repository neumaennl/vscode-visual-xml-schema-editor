/**
 * Unit tests for the XML markup helpers of the XML tab.
 */

import { escapeXml, optionalAttributes, pad, renderTag, toAttrString } from "./propertiesPanelXmlMarkup";

describe("optionalAttributes", () => {
  test("should keep the attributes with a value, in their order", () => {
    expect(
      optionalAttributes([
        ["name", "a"],
        ["type", undefined],
        ["use", ""],
      ])
    ).toEqual([
      ["name", "a"],
      ["use", ""],
    ]);
  });
});

describe("escapeXml", () => {
  test("should escape the characters that XML reserves", () => {
    expect(escapeXml(`a & b < c > d "e" 'f'`)).toBe("a &amp; b &lt; c &gt; d &quot;e&quot; &apos;f&apos;");
  });
});

describe("pad", () => {
  test("should indent by two spaces per level", () => {
    expect(pad(0)).toBe("");
    expect(pad(2)).toBe("    ");
  });
});

describe("toAttrString", () => {
  test("should write escaped attributes with a leading space each", () => {
    expect(
      toAttrString([
        ["name", "a"],
        ["default", "x<y"],
      ])
    ).toBe(` name="a" default="x&lt;y"`);
  });

  test("should write nothing without attributes", () => {
    expect(toAttrString([])).toBe("");
  });
});

describe("renderTag", () => {
  test("should write an empty tag without children", () => {
    expect(renderTag("xs:element", [["name", "a"]], [], 1)).toBe(`  <xs:element name="a"/>`);
  });

  test("should write the children between the start and end tag", () => {
    expect(renderTag("xs:sequence", [], ["    <xs:element/>"], 1)).toBe(
      "  <xs:sequence>\n    <xs:element/>\n  </xs:sequence>"
    );
  });
});
