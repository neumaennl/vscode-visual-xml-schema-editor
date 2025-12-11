/**
 * SchemaModelManager: Manages schema state and orchestrates updates.
 * 
 * This class maintains the authoritative schema state and provides:
 * - Schema loading and state management
 * - Marshalling (schema object to XML)
 * - Unmarshalling (XML to schema object)
 * - Query interface for schema introspection
 * - Schema reference and import management
 * 
 * Following ADR 001: Editor Transition Architecture
 */

import { marshal, unmarshal } from "@neumaennl/xmlbind-ts";
import {
  schema,
  topLevelElement,
  topLevelSimpleType,
  topLevelComplexType,
  namedGroup,
  namedAttributeGroup,
  importType,
  includeType,
} from "../shared/types";
import { toArray } from "../shared/schemaUtils";

/**
 * Result of a schema query operation.
 */
export interface QueryResult<T> {
  /** Whether the query was successful */
  found: boolean;
  /** The found item (undefined if not found) */
  item?: T;
}

/**
 * Manages the authoritative schema state.
 * Provides marshalling/unmarshalling and query capabilities.
 */
export class SchemaModelManager {
  private schemaState: schema | null = null;

  /**
   * Creates a new SchemaModelManager.
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
   * @throws Error if parsing fails
   */
  public loadFromXml(xmlContent: string): void {
    try {
      this.schemaState = unmarshal(schema, xmlContent);
    } catch (error) {
      throw new Error(
        `Failed to load schema from XML: ${(error as Error).message}`
      );
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
   * @returns The XML string representation of the schema
   * @throws Error if schema is not loaded or marshalling fails
   */
  public toXml(): string {
    if (!this.schemaState) {
      throw new Error("Cannot marshal: schema not loaded");
    }

    try {
      return marshal(this.schemaState);
    } catch (error) {
      throw new Error(
        `Failed to marshal schema to XML: ${(error as Error).message}`
      );
    }
  }

  /**
   * Creates a deep copy of the current schema.
   * Uses marshal/unmarshal to preserve xmlbind metadata.
   * 
   * @returns A deep copy of the schema
   * @throws Error if schema is not loaded or cloning fails
   */
  public cloneSchema(): schema {
    if (!this.schemaState) {
      throw new Error("Cannot clone: schema not loaded");
    }

    try {
      const xml = marshal(this.schemaState);
      return unmarshal(schema, xml);
    } catch (error) {
      throw new Error(
        `Failed to clone schema: ${(error as Error).message}`
      );
    }
  }

  /**
   * Checks if a schema is currently loaded.
   * 
   * @returns true if schema is loaded, false otherwise
   */
  public isLoaded(): boolean {
    return this.schemaState !== null;
  }

  /**
   * Clears the current schema state.
   */
  public clear(): void {
    this.schemaState = null;
  }

  // ===== Query Methods =====

  /**
   * Helper method to find an item by name in a collection.
   * 
   * @param items - The collection to search (may be undefined, single item, or array)
   * @param name - The name to search for
   * @returns Query result containing the item if found
   */
  private findByName<T extends { name: string }>(
    items: T | T[] | undefined,
    name: string
  ): QueryResult<T> {
    const itemsArray = toArray(items);
    const item = itemsArray.find((el) => el.name === name);
    return item ? { found: true, item } : { found: false };
  }

  /**
   * Finds a top-level element by name.
   * 
   * @param name - The name of the element to find
   * @returns Query result containing the element if found
   */
  public findElement(name: string): QueryResult<topLevelElement> {
    return this.findByName(this.schemaState?.element, name);
  }

  /**
   * Finds a top-level simple type by name.
   * 
   * @param name - The name of the simple type to find
   * @returns Query result containing the simple type if found
   */
  public findSimpleType(name: string): QueryResult<topLevelSimpleType> {
    return this.findByName(this.schemaState?.simpleType, name);
  }

  /**
   * Finds a top-level complex type by name.
   * 
   * @param name - The name of the complex type to find
   * @returns Query result containing the complex type if found
   */
  public findComplexType(name: string): QueryResult<topLevelComplexType> {
    return this.findByName(this.schemaState?.complexType, name);
  }

  /**
   * Finds a named group by name.
   * 
   * @param name - The name of the group to find
   * @returns Query result containing the group if found
   */
  public findGroup(name: string): QueryResult<namedGroup> {
    return this.findByName(this.schemaState?.group, name);
  }

  /**
   * Finds a named attribute group by name.
   * 
   * @param name - The name of the attribute group to find
   * @returns Query result containing the attribute group if found
   */
  public findAttributeGroup(
    name: string
  ): QueryResult<namedAttributeGroup> {
    return this.findByName(this.schemaState?.attributeGroup, name);
  }

  /**
   * Gets all top-level elements in the schema.
   * 
   * @returns Array of top-level elements, or empty array if none exist
   */
  public getAllElements(): topLevelElement[] {
    return toArray(this.schemaState?.element);
  }

  /**
   * Gets all simple types in the schema.
   * 
   * @returns Array of simple types, or empty array if none exist
   */
  public getAllSimpleTypes(): topLevelSimpleType[] {
    return toArray(this.schemaState?.simpleType);
  }

  /**
   * Gets all complex types in the schema.
   * 
   * @returns Array of complex types, or empty array if none exist
   */
  public getAllComplexTypes(): topLevelComplexType[] {
    return toArray(this.schemaState?.complexType);
  }

  /**
   * Gets all groups in the schema.
   * 
   * @returns Array of groups, or empty array if none exist
   */
  public getAllGroups(): namedGroup[] {
    return toArray(this.schemaState?.group);
  }

  /**
   * Gets all attribute groups in the schema.
   * 
   * @returns Array of attribute groups, or empty array if none exist
   */
  public getAllAttributeGroups(): namedAttributeGroup[] {
    return toArray(this.schemaState?.attributeGroup);
  }

  /**
   * Gets the target namespace of the schema.
   * 
   * @returns The target namespace, or undefined if not set
   */
  public getTargetNamespace(): string | undefined {
    return this.schemaState?.targetNamespace;
  }

  /**
   * Gets all imports in the schema.
   * 
   * @returns Array of import declarations
   */
  public getImports(): importType[] {
    return toArray(this.schemaState?.import_);
  }

  /**
   * Gets all includes in the schema.
   * 
   * @returns Array of include declarations
   */
  public getIncludes(): includeType[] {
    return toArray(this.schemaState?.include);
  }
}
