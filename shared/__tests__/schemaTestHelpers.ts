/**
 * Helpers that build schema XML and schema objects for the tests of all projects.
 * The helpers that return a schema object create a new one on every call, so that one test cannot change the schema of another.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../types.js";

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

/** The content of a derived complex type. */
export type DerivedContent = "complexContent" | "simpleContent";

/** The derivation inside the content of a derived complex type. */
export type Derivation = "extension" | "restriction";

/** Every combination of content and derivation of a derived complex type. */
export const DERIVATIONS: ReadonlyArray<readonly [DerivedContent, Derivation]> = [
  ["complexContent", "extension"],
  ["complexContent", "restriction"],
  ["simpleContent", "extension"],
  ["simpleContent", "restriction"],
];

/**
 * Returns the XML of a complexType `T` derived from `B` with the given content and derivation.
 *
 * @param content - The content of the complexType
 * @param derivation - The derivation inside the content
 * @param body - The XSD content of the extension or restriction
 * @returns The XML of the complexType
 */
export function derivedComplexTypeT(content: DerivedContent, derivation: Derivation, body = ""): string {
  return `<xs:complexType name="T"><xs:${content}><xs:${derivation} base="B">${body}</xs:${derivation}></xs:${content}></xs:complexType>`;
}
