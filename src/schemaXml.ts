/**
 * Converts between the XML of a schema and its schema object: `parseSchema()` unmarshals the text of
 * a document, `serializeSchema()` marshals a schema object. Both are stateless; every command parses
 * the document again (see `docs/persistence.md`).
 */

import { marshal, unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../shared/types.js";

/**
 * Corrects the line breaks at the start and end of the output of `marshal()`.
 *
 * Since xmlbind-ts 2.4.0, the output starts with a line break unless it starts
 * with the XML declaration, and no longer ends with one (see the xmlbind-ts
 * known issue "The output of `marshal()` starts with a line break"). This
 * removes the leading line break and ends the document with exactly one, as
 * 2.3.0 did. Remove it with the move to xmlbind-ts 3 (#444).
 *
 * @param xml - The output of `marshal()`
 * @returns The XML without a leading line break, ending with one line break
 */
function fixOutputLineBreaks(xml: string): string {
  return xml.replace(/^\n/, "").replace(/\n*$/, "\n");
}

/**
 * Parses the XML of a schema into a schema object.
 *
 * @param xml - The XML text
 * @returns The schema object
 * @throws An {@link Error} if the text cannot be parsed
 */
export function parseSchema(xml: string): schema {
  try {
    return unmarshal(schema, xml);
  } catch (error) {
    throw new Error(`Failed to parse the schema: ${(error as Error).message}`, { cause: error });
  }
}

/**
 * Serializes a schema object to XML.
 *
 * @param schemaObj - The schema object
 * @returns The XML, ending with a line break
 * @throws An {@link Error} if the schema object cannot be serialized
 */
export function serializeSchema(schemaObj: schema): string {
  try {
    return fixOutputLineBreaks(marshal(schemaObj));
  } catch (error) {
    throw new Error(`Failed to serialize the schema: ${(error as Error).message}`, { cause: error });
  }
}
