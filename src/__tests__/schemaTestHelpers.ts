/**
 * Helpers that build schema objects for the tests of validators and executors.
 * Each call unmarshals new XML, so that one test cannot change the schema of another.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types.js";

/**
 * Unmarshals a schema with the given content.
 *
 * @param body - The XSD content of the schema
 * @returns The schema object
 */
export function schemaWith(body = ""): schema {
  return unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
${body}
</xs:schema>`
  );
}

/**
 * Unmarshals a schema without content.
 *
 * @returns The schema object
 */
export function emptySchema(): schema {
  return schemaWith();
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
