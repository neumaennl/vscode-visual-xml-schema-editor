/**
 * Helpers that build schema XML and schema objects for the tests.
 * The helpers that return a schema object create a new one on every call, so that one test cannot change the schema of another.
 */

import { readFileSync } from "node:fs";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types.js";

/** The folder with the XML files of the tests. */
const TEST_RESOURCES = new URL("./test-resources/", import.meta.url);

/**
 * Returns the XML of a schema with the given content.
 *
 * @param body - The XSD content of the schema
 * @param namespaces - Further namespace declarations of the schema, by prefix
 * @returns The XML, with the XML declaration and the `xs` namespace
 */
export function schemaXmlWith(body: string, namespaces: Record<string, string> = {}): string {
  const declarations = Object.entries(namespaces)
    .map(([prefix, uri]) => ` xmlns:${prefix}="${uri}"`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"${declarations}>
${body}
</xs:schema>`;
}

/**
 * Returns the XML of a schema without content.
 *
 * @returns The XML, with the XML declaration and the `xs` namespace
 */
export function emptySchemaXml(): string {
  return schemaXmlWith("");
}

/**
 * Reads an XML file from `src/__tests__/test-resources`.
 *
 * @param name - The file name, for example `person-type-with-name-element.xsd`
 * @returns The content of the file
 */
export function readTestXml(name: string): string {
  return readFileSync(new URL(name, TEST_RESOURCES), "utf8");
}

/**
 * Reads an XML file from `src/__tests__/test-resources` and unmarshals it.
 *
 * @param name - The file name, for example `person-type-with-name-element.xsd`
 * @returns The schema object
 */
export function readTestSchema(name: string): schema {
  return unmarshal(schema, readTestXml(name));
}

/**
 * Unmarshals a schema with the given content.
 *
 * @param body - The XSD content of the schema
 * @param namespaces - Further namespace declarations of the schema, by prefix
 * @returns The schema object
 */
export function schemaWith(body: string, namespaces: Record<string, string> = {}): schema {
  return unmarshal(schema, schemaXmlWith(body, namespaces));
}

/**
 * Unmarshals a schema without content.
 *
 * @returns The schema object
 */
export function emptySchema(): schema {
  return unmarshal(schema, emptySchemaXml());
}

/**
 * Unmarshals a schema with the attribute groups `CommonAttrs` and `OtherAttrs` and the given content.
 *
 * @param body - The XSD content after the two attribute group definitions
 * @returns The schema object
 */
export function schemaWithAttrGroups(body: string): schema {
  return schemaWith(`<xs:attributeGroup name="CommonAttrs"/>
<xs:attributeGroup name="OtherAttrs"/>
${body}`);
}

/**
 * Unmarshals a schema with one include per schema location.
 *
 * @param schemaLocations - The schema locations of the includes, in this order
 * @returns The schema object
 */
export function schemaWithIncludes(...schemaLocations: string[]): schema {
  return schemaWith(
    schemaLocations.map((loc) => `<xs:include schemaLocation="${loc}"/>`).join("\n")
  );
}
