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
   * Finds a top-level element by name.
   * 
   * @param name - The name of the element to find
   * @returns Query result containing the element if found
   */
  public findElement(name: string): QueryResult<topLevelElement> {
    if (!this.schemaState?.element) {
      return { found: false };
    }

    const elements = Array.isArray(this.schemaState.element)
      ? this.schemaState.element
      : [this.schemaState.element];

    const item = elements.find((el) => el.name === name);
    return item ? { found: true, item } : { found: false };
  }

  /**
   * Finds a top-level simple type by name.
   * 
   * @param name - The name of the simple type to find
   * @returns Query result containing the simple type if found
   */
  public findSimpleType(name: string): QueryResult<topLevelSimpleType> {
    if (!this.schemaState?.simpleType) {
      return { found: false };
    }

    const simpleTypes = Array.isArray(this.schemaState.simpleType)
      ? this.schemaState.simpleType
      : [this.schemaState.simpleType];

    const item = simpleTypes.find((st) => st.name === name);
    return item ? { found: true, item } : { found: false };
  }

  /**
   * Finds a top-level complex type by name.
   * 
   * @param name - The name of the complex type to find
   * @returns Query result containing the complex type if found
   */
  public findComplexType(name: string): QueryResult<topLevelComplexType> {
    if (!this.schemaState?.complexType) {
      return { found: false };
    }

    const complexTypes = Array.isArray(this.schemaState.complexType)
      ? this.schemaState.complexType
      : [this.schemaState.complexType];

    const item = complexTypes.find((ct) => ct.name === name);
    return item ? { found: true, item } : { found: false };
  }

  /**
   * Finds a named group by name.
   * 
   * @param name - The name of the group to find
   * @returns Query result containing the group if found
   */
  public findGroup(name: string): QueryResult<namedGroup> {
    if (!this.schemaState?.group) {
      return { found: false };
    }

    const groups = Array.isArray(this.schemaState.group)
      ? this.schemaState.group
      : [this.schemaState.group];

    const item = groups.find((g) => g.name === name);
    return item ? { found: true, item } : { found: false };
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
    if (!this.schemaState?.attributeGroup) {
      return { found: false };
    }

    const attributeGroups = Array.isArray(this.schemaState.attributeGroup)
      ? this.schemaState.attributeGroup
      : [this.schemaState.attributeGroup];

    const item = attributeGroups.find((ag) => ag.name === name);
    return item ? { found: true, item } : { found: false };
  }

  /**
   * Gets all top-level elements in the schema.
   * 
   * @returns Array of top-level elements, or empty array if none exist
   */
  public getAllElements(): topLevelElement[] {
    if (!this.schemaState?.element) {
      return [];
    }
    return Array.isArray(this.schemaState.element)
      ? this.schemaState.element
      : [this.schemaState.element];
  }

  /**
   * Gets all simple types in the schema.
   * 
   * @returns Array of simple types, or empty array if none exist
   */
  public getAllSimpleTypes(): topLevelSimpleType[] {
    if (!this.schemaState?.simpleType) {
      return [];
    }
    return Array.isArray(this.schemaState.simpleType)
      ? this.schemaState.simpleType
      : [this.schemaState.simpleType];
  }

  /**
   * Gets all complex types in the schema.
   * 
   * @returns Array of complex types, or empty array if none exist
   */
  public getAllComplexTypes(): topLevelComplexType[] {
    if (!this.schemaState?.complexType) {
      return [];
    }
    return Array.isArray(this.schemaState.complexType)
      ? this.schemaState.complexType
      : [this.schemaState.complexType];
  }

  /**
   * Gets all groups in the schema.
   * 
   * @returns Array of groups, or empty array if none exist
   */
  public getAllGroups(): namedGroup[] {
    if (!this.schemaState?.group) {
      return [];
    }
    return Array.isArray(this.schemaState.group)
      ? this.schemaState.group
      : [this.schemaState.group];
  }

  /**
   * Gets all attribute groups in the schema.
   * 
   * @returns Array of attribute groups, or empty array if none exist
   */
  public getAllAttributeGroups(): namedAttributeGroup[] {
    if (!this.schemaState?.attributeGroup) {
      return [];
    }
    return Array.isArray(this.schemaState.attributeGroup)
      ? this.schemaState.attributeGroup
      : [this.schemaState.attributeGroup];
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
    if (!this.schemaState?.import_) {
      return [];
    }

    return Array.isArray(this.schemaState.import_)
      ? this.schemaState.import_
      : [this.schemaState.import_];
  }

  /**
   * Gets all includes in the schema.
   * 
   * @returns Array of include declarations
   */
  public getIncludes(): includeType[] {
    if (!this.schemaState?.include) {
      return [];
    }

    return Array.isArray(this.schemaState.include)
      ? this.schemaState.include
      : [this.schemaState.include];
  }
}
