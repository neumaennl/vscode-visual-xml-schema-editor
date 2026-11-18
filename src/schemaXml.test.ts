/**
 * Unit tests of `schemaXml`: parsing the XML of a schema and serializing a schema object.
 */

import { parseSchema, serializeSchema } from "./schemaXml.js";
import { schemaXmlWith } from "../shared/__tests__/schemaTestHelpers.js";

/** A schema with a target namespace and the elements `root` and `item`. */
const SCHEMA_WITH_TARGET_NAMESPACE = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/test"
           elementFormDefault="qualified">
  <xs:element name="root" type="xs:string"/>
  <xs:element name="item" type="xs:int"/>
</xs:schema>`;

/**
 * Returns the error that a function throws.
 *
 * @param action - The function
 * @returns The error, or undefined if the function does not throw
 */
function thrownBy(action: () => unknown): Error | undefined {
  try {
    action();
  } catch (error) {
    return error as Error;
  }
  return undefined;
}

describe("parseSchema", () => {
  test("should parse the XML of a schema", () => {
    const schemaObj = parseSchema(SCHEMA_WITH_TARGET_NAMESPACE);

    expect(schemaObj.targetNamespace).toBe("http://example.com/test");
    expect(schemaObj.element?.map((element) => element.name)).toEqual(["root", "item"]);
  });

  test("should return a new object on every call", () => {
    expect(parseSchema(SCHEMA_WITH_TARGET_NAMESPACE)).not.toBe(parseSchema(SCHEMA_WITH_TARGET_NAMESPACE));
  });

  test("should report text that is no XML, keeping the parse error as the cause", () => {
    const error = thrownBy(() => parseSchema("not valid xml"));

    expect(error?.message).toContain("Failed to parse the schema");
    expect(error?.cause).toBeInstanceOf(Error);
  });
});

describe("serializeSchema", () => {
  test("should write the XML of a schema that parses to the same content", () => {
    const reparsed = parseSchema(serializeSchema(parseSchema(SCHEMA_WITH_TARGET_NAMESPACE)));

    expect(reparsed.targetNamespace).toBe("http://example.com/test");
    expect(reparsed.element?.map((element) => element.name)).toEqual(["root", "item"]);
  });

  test("should start with the XML declaration and end with one line break", () => {
    const output = serializeSchema(parseSchema(`${schemaXmlWith(`<xs:element name="root" type="xs:string"/>`)}\n`));

    expect(output.startsWith("<?xml ")).toBe(true);
    expect(output.endsWith("</xs:schema>\n")).toBe(true);
  });

  test.each([
    ["the root element", `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"/>`, "<xs:schema "],
    ["a comment", `<!--header-->\n<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"/>`, "<!--header-->"],
  ])("should start with %s and end with one line break without an XML declaration", (_, xml, start) => {
    const output = serializeSchema(parseSchema(xml));

    expect(output.startsWith(start)).toBe(true);
    expect(output.endsWith("\n")).toBe(true);
    expect(output.endsWith("\n\n")).toBe(false);
  });

  test("should report an object that cannot be serialized, keeping the error as the cause", () => {
    // A plain object instead of an instance of the class, without the binding metadata that marshal() needs
    const error = thrownBy(() => serializeSchema({}));

    expect(error?.message).toContain("Failed to serialize the schema");
    expect(error?.cause).toBeInstanceOf(Error);
  });
});
