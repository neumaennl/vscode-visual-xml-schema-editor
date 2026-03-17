/**
 * Validators for schema-level commands (Import and Include).
 */

import {
  schema,
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
  AddIncludeCommand,
  RemoveIncludeCommand,
  ModifyIncludeCommand,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { isValidXmlName, ValidationResult } from "./validationUtils";
import { isAnyPrefixReferencedInSchema } from "../commandExecutors/schemaQNameRewriter";

// ===== Helpers =====

/**
 * Returns true if `value` looks like a valid absolute URI.
 * Accepts common schemes (http, https, urn, ftp, file) as well as any other
 * scheme following the pattern "<letters>:..." to stay flexible.
 */
function isAbsoluteUri(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+\-.]*:[^\s]+$/.test(value);
}

/**
 * Returns true if `value` looks like a valid relative or absolute file path /
 * URI suitable for use as a schemaLocation.
 * Rejects values that contain whitespace or are clearly malformed.
 */
function isValidSchemaLocation(value: string): boolean {
  // Must be non-empty and contain no whitespace
  if (!value || /\s/.test(value)) return false;
  return true;
}

/**
 * Parses an importId and validates it refers to an existing import entry.
 *
 * Returns `{ valid: true, position }` with the resolved zero-based index on
 * success, or `{ valid: false, error }` when the ID is malformed or out of
 * range.  Callers that need the position (e.g. to look up the import entry)
 * can use it directly without calling `parseSchemaId` a second time.
 */
function validateImportId(
  importId: string,
  schemaObj: schema
): { valid: false; error: string } | { valid: true; position: number } {
  let parsed;
  try {
    parsed = parseSchemaId(importId);
  } catch {
    return { valid: false, error: `Invalid import ID: ${importId}` };
  }
  const index = parsed.position;
  if (parsed.nodeType !== SchemaNodeType.Import) {
    return {
      valid: false,
      error: `'${importId}' does not refer to an import node (got '${parsed.nodeType}')`,
    };
  }
  const imports = toArray(schemaObj.import_);
  if (index === undefined || index < 0 || index >= imports.length) {
    return { valid: false, error: `Import not found: ${importId}` };
  }
  return { valid: true, position: index };
}

/**
 * Returns true if the given namespace URI has at least one prefix registered
 * in _namespacePrefixes AND that prefix is referenced anywhere in the schema.
 *
 * Collects all prefixes bound to the namespace and delegates to
 * {@link isAnyPrefixReferencedInSchema} for a single full recursive traversal
 * of all QName-valued fields (element/@type, complexType @base, simpleType
 * restriction/@base, union/@memberTypes, group/@ref, attributeGroup/@ref, etc.)
 */
function isNamespaceReferenced(namespace: string | undefined, schemaObj: schema): boolean {
  if (!namespace || !schemaObj._namespacePrefixes) return false;
  const prefixesForNs = new Set(
    Object.entries(schemaObj._namespacePrefixes)
      .filter(([, ns]) => ns === namespace)
      .map(([pfx]) => pfx)
  );
  return isAnyPrefixReferencedInSchema(prefixesForNs, schemaObj);
}

// ===== Import Command Validation =====

export function validateAddImport(
  command: AddImportCommand,
  schemaObj: schema
): ValidationResult {
  const { namespace, schemaLocation, prefix } = command.payload;

  if (!namespace.trim()) {
    return { valid: false, error: "Namespace cannot be empty" };
  }

  // Validate namespace URI format: must be a valid absolute URI
  if (!isAbsoluteUri(namespace.trim())) {
    return { valid: false, error: "Namespace must be a valid absolute URI" };
  }

  if (!schemaLocation.trim()) {
    return { valid: false, error: "Schema location cannot be empty" };
  }

  // Validate schemaLocation format: must be a valid path or URI without whitespace
  if (!isValidSchemaLocation(schemaLocation)) {
    return { valid: false, error: "Schema location must be a valid path or URI without whitespace" };
  }

  // Check if an import for this namespace already exists
  const existingImports = toArray(schemaObj.import_);
  if (existingImports.some((imp) => imp.namespace === namespace.trim())) {
    return { valid: false, error: `An import for namespace '${namespace.trim()}' already exists` };
  }

  // Validate prefix, if provided
  if (prefix !== undefined) {
    if (!prefix) {
      return { valid: false, error: "Prefix cannot be empty when provided" };
    }
    if (prefix !== prefix.trim()) {
      return { valid: false, error: `Prefix '${prefix}' must not contain leading or trailing whitespace` };
    }
    if (prefix === "xml" || prefix === "xmlns") {
      return { valid: false, error: `Prefix '${prefix}' is reserved and cannot be used` };
    }
    if (!isValidXmlName(prefix)) {
      return { valid: false, error: `Prefix '${prefix}' is not a valid XML name` };
    }
    // Check prefix uniqueness: only reject when bound to a different namespace
    if (schemaObj._namespacePrefixes && Object.prototype.hasOwnProperty.call(schemaObj._namespacePrefixes, prefix)) {
      const existingNs = schemaObj._namespacePrefixes[prefix];
      if (existingNs !== namespace.trim()) {
        return { valid: false, error: `Prefix '${prefix}' is already in use by namespace '${existingNs}'` };
      }
    }
  }

  return { valid: true };
}

export function validateRemoveImport(
  command: RemoveImportCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.importId.trim()) {
    return { valid: false, error: "Import ID cannot be empty" };
  }
  const idResult = validateImportId(command.payload.importId, schemaObj);
  if (!idResult.valid) return idResult;

  // Check if the import's namespace prefix is still referenced in the schema
  const imports = toArray(schemaObj.import_);
  const targetImport = imports[idResult.position];
  if (isNamespaceReferenced(targetImport.namespace, schemaObj)) {
    return {
      valid: false,
      error: `Cannot remove import: namespace '${targetImport.namespace}' is still referenced in the schema`,
    };
  }

  return { valid: true };
}

export function validateModifyImport(
  command: ModifyImportCommand,
  schemaObj: schema
): ValidationResult {
  const { importId, namespace, schemaLocation, oldPrefix, prefix } = command.payload;

  if (!importId.trim()) {
    return { valid: false, error: "Import ID cannot be empty" };
  }
  const idResult = validateImportId(importId, schemaObj);
  if (!idResult.valid) return idResult;

  const imports = toArray(schemaObj.import_);
  const position = idResult.position;

  if (namespace !== undefined) {
    if (!namespace.trim()) {
      return { valid: false, error: "Namespace cannot be empty" };
    }
    if (!isAbsoluteUri(namespace.trim())) {
      return { valid: false, error: "Namespace must be a valid absolute URI" };
    }
    // Check that changing the namespace won't create a duplicate
    const currentNamespace = imports[position].namespace;
    if (namespace.trim() !== currentNamespace) {
      if (imports.some((imp, i) => i !== position && imp.namespace === namespace.trim())) {
        return { valid: false, error: `An import for namespace '${namespace.trim()}' already exists` };
      }
    }
  }

  if (schemaLocation !== undefined) {
    if (!schemaLocation.trim()) {
      return { valid: false, error: "Schema location cannot be empty" };
    }
    if (!isValidSchemaLocation(schemaLocation)) {
      return { valid: false, error: "Schema location must be a valid path or URI without whitespace" };
    }
  }

  if (oldPrefix !== undefined) {
    // oldPrefix without prefix is meaningless — nothing would be renamed/deleted
    if (prefix === undefined) {
      return { valid: false, error: "'oldPrefix' requires 'prefix' to be provided" };
    }
    // oldPrefix must currently be registered for this import's namespace
    const currentNamespace = imports[position].namespace;
    const registeredNs = schemaObj._namespacePrefixes?.[oldPrefix];
    if (registeredNs === undefined) {
      return { valid: false, error: `Prefix '${oldPrefix}' is not registered in this schema` };
    }
    if (registeredNs !== currentNamespace) {
      return {
        valid: false,
        error: `Prefix '${oldPrefix}' is not registered for namespace '${currentNamespace}'`,
      };
    }
  }

  if (prefix !== undefined) {
    if (!prefix) {
      return { valid: false, error: "Prefix cannot be empty when provided" };
    }
    if (prefix !== prefix.trim()) {
      return { valid: false, error: `Prefix '${prefix}' must not contain leading or trailing whitespace` };
    }
    if (prefix === "xml" || prefix === "xmlns") {
      return { valid: false, error: `Prefix '${prefix}' is reserved and cannot be used` };
    }
    if (!isValidXmlName(prefix)) {
      return { valid: false, error: `Prefix '${prefix}' is not a valid XML name` };
    }
    // Check prefix uniqueness: the new prefix must not already be registered
    // for a *different* namespace.  It is fine (no-op) if it is already
    // registered for the same namespace that this import is being modified to.
    const targetNamespace = (namespace?.trim()) ?? imports[position].namespace;
    if (schemaObj._namespacePrefixes) {
      const existingNs = schemaObj._namespacePrefixes[prefix];
      if (existingNs !== undefined && existingNs !== targetNamespace) {
        return { valid: false, error: `Prefix '${prefix}' is already in use` };
      }
    }
  }

  return { valid: true };
}

// ===== Include Command Validation =====

/**
 * Parses an includeId and validates it refers to an existing include entry.
 *
 * Returns `{ valid: true, position }` with the resolved zero-based index on
 * success, or `{ valid: false, error }` when the ID is malformed or out of
 * range.  Callers that need the position can use it directly without calling
 * `parseSchemaId` a second time.
 */
function validateIncludeId(
  includeId: string,
  schemaObj: schema
): { valid: false; error: string } | { valid: true; position: number } {
  let parsed;
  try {
    parsed = parseSchemaId(includeId);
  } catch {
    return { valid: false, error: `Invalid include ID: ${includeId}` };
  }
  const index = parsed.position;
  if (parsed.nodeType !== SchemaNodeType.Include) {
    return {
      valid: false,
      error: `'${includeId}' does not refer to an include node (got '${parsed.nodeType}')`,
    };
  }
  const includes = toArray(schemaObj.include);
  if (index === undefined || index < 0 || index >= includes.length) {
    return { valid: false, error: `Include not found: ${includeId}` };
  }
  return { valid: true, position: index };
}

export function validateAddInclude(
  command: AddIncludeCommand,
  schemaObj: schema
): ValidationResult {
  const { schemaLocation } = command.payload;

  if (!schemaLocation.trim()) {
    return { valid: false, error: "Schema location cannot be empty" };
  }

  if (!isValidSchemaLocation(schemaLocation)) {
    return { valid: false, error: "Schema location must be a valid path or URI without whitespace" };
  }

  // Check if an include with this schemaLocation already exists
  const existingIncludes = toArray(schemaObj.include);
  if (existingIncludes.some((inc) => inc.schemaLocation === schemaLocation.trim())) {
    return { valid: false, error: `An include for schema location '${schemaLocation.trim()}' already exists` };
  }

  return { valid: true };
}

export function validateRemoveInclude(
  command: RemoveIncludeCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.includeId.trim()) {
    return { valid: false, error: "Include ID cannot be empty" };
  }
  const idResult = validateIncludeId(command.payload.includeId, schemaObj);
  if (!idResult.valid) return idResult;

  return { valid: true };
}

export function validateModifyInclude(
  command: ModifyIncludeCommand,
  schemaObj: schema
): ValidationResult {
  const { includeId, schemaLocation } = command.payload;

  if (!includeId.trim()) {
    return { valid: false, error: "Include ID cannot be empty" };
  }
  const idResult = validateIncludeId(includeId, schemaObj);
  if (!idResult.valid) return idResult;

  if (schemaLocation !== undefined) {
    if (!schemaLocation.trim()) {
      return { valid: false, error: "Schema location cannot be empty" };
    }
    if (!isValidSchemaLocation(schemaLocation)) {
      return { valid: false, error: "Schema location must be a valid path or URI without whitespace" };
    }
  }

  return { valid: true };
}
