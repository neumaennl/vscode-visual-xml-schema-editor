/**
 * Integration tests: how serializing the schema after a command treats namespaces.
 *
 * A command rewrites the whole document with `marshal` from `xmlbind-ts` (see
 * docs/persistence.md, "What serialization changes"). These tests check that the
 * namespace declarations and element prefixes of the source document survive, so
 * that unprefixed QName values keep their meaning.
 */

import type { AddElementCommand } from "../../shared/types.js";
import { runCommandExpectSuccess } from "./testHelpers.js";

/** A schema whose default namespace is its target namespace, with `xs:` for XML Schema. */
const TARGET_NAMESPACE_AS_DEFAULT = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns="urn:example" targetNamespace="urn:example">
  <xs:simpleType name="myType"><xs:restriction base="xs:string"/></xs:simpleType>
  <xs:element name="root" type="myType"/>
</xs:schema>`;

/** A schema whose default namespace is the XML Schema namespace, with `t:` for its target namespace. */
const XML_SCHEMA_AS_DEFAULT = `<?xml version="1.0" encoding="UTF-8"?>
<schema xmlns="http://www.w3.org/2001/XMLSchema" xmlns:t="urn:example" targetNamespace="urn:example">
  <simpleType name="myType"><restriction base="string"/></simpleType>
  <element name="root" type="t:myType"/>
</schema>`;

/**
 * Creates a command that adds a top-level element of the given type.
 *
 * @param elementType - The type of the new element
 * @returns The command
 */
function addElementOfType(elementType: string): AddElementCommand {
  return { type: "addElement", payload: { parentId: "/schema", elementName: "added", elementType } };
}

describe("Integration: namespaces after serialization", () => {
  it("should keep a target namespace that is the default namespace, and the xs: prefixes", () => {
    const xml = runCommandExpectSuccess(TARGET_NAMESPACE_AS_DEFAULT, addElementOfType("myType"));

    expect(xml).toContain(
      '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns="urn:example" targetNamespace="urn:example">',
    );
    expect(xml).toMatch(/<xs:element [^>]*name="root"/);
    expect(xml).toMatch(/<xs:element [^>]*name="added"/);
    expect(xml).not.toMatch(/<\/?(schema|element|simpleType|restriction)\b/);
  });

  it("should keep unprefixed element names when the XML Schema namespace is the default namespace", () => {
    const xml = runCommandExpectSuccess(XML_SCHEMA_AS_DEFAULT, addElementOfType("t:myType"));

    expect(xml).toContain(
      '<schema xmlns="http://www.w3.org/2001/XMLSchema" xmlns:t="urn:example" targetNamespace="urn:example">',
    );
    expect(xml).toMatch(/<element [^>]*name="added"/);
    expect(xml).not.toContain("xs:");
  });
});
