/**
 * `SchemaModelManager`: Manages schema state and orchestrates updates.
 *
 * This class maintains the authoritative schema state and provides:
 * - Schema loading and state management
 * - Marshalling (schema object to XML)
 * - Unmarshalling (XML to schema object)
 * - Cloning, so that commands are executed on a copy
 *
 * Following ADR 001: Editor Transition Architecture
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
 * Manages the authoritative schema state.
 * Provides marshalling, unmarshalling and cloning.
 */
export class SchemaModelManager {
  private schemaState: schema | null = null;

  /**
   * Creates a new `SchemaModelManager`.
   *
   * @param initialSchema - Optional initial schema to load
   */
  constructor(initialSchema?: schema) {
    if (initialSchema) {
      this.schemaState = initialSchema;
    }
  }

  /**
   * Loads schema from XML string.
   *
   * @param xmlContent - The XML content to parse
   * @throws An {@link Error} if parsing fails
   */
  public loadFromXml(xmlContent: string): void {
    try {
      this.schemaState = unmarshal(schema, xmlContent);
    } catch (error) {
      throw new Error(`Failed to load schema from XML: ${(error as Error).message}`, { cause: error });
    }
  }

  /**
   * Gets the current schema state.
   *
   * @returns The current schema object, or null if not loaded
   */
  public getSchema(): schema | null {
    return this.schemaState;
  }

  /**
   * Sets the schema state.
   *
   * @param schemaObj - The schema object to set
   */
  public setSchema(schemaObj: schema): void {
    this.schemaState = schemaObj;
  }

  /**
   * Marshals the current schema to XML.
   *
   * @returns The XML string representation of the schema, ending with a line break
   * @throws An {@link Error} if schema is not loaded or marshalling fails
   */
  public toXml(): string {
    if (!this.schemaState) {
      throw new Error("Cannot marshal: schema not loaded");
    }

    try {
      return fixOutputLineBreaks(marshal(this.schemaState));
    } catch (error) {
      throw new Error(`Failed to marshal schema to XML: ${(error as Error).message}`, { cause: error });
    }
  }

  /**
   * Creates a deep copy of the current schema.
   * Uses marshal/unmarshal to preserve xmlbind metadata.
   *
   * @returns A deep copy of the schema
   * @throws An {@link Error} if schema is not loaded or cloning fails
   */
  public cloneSchema(): schema {
    if (!this.schemaState) {
      throw new Error("Cannot clone: schema not loaded");
    }

    try {
      const xml = marshal(this.schemaState);
      return unmarshal(schema, xml);
    } catch (error) {
      throw new Error(`Failed to clone schema: ${(error as Error).message}`, { cause: error });
    }
  }
}
