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
import { parseSchemaId } from "../../shared/idStrategy";
import { isValidXmlName } from "./validationUtils";
import { ValidationResult } from "./validationUtils";

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
  const imports = toArray(schemaObj.import_);
  if (index === undefined || index < 0 || index >= imports.length) {
    return { valid: false, error: `Import not found: ${importId}` };
  }
  return { valid: true, position: index };
}

/**
 * Returns true if the given namespace prefix (e.g. "ext") is used as a type
 * prefix in any element or attribute type reference in the schema.
 *
 * Checks top-level elements and attributes as well as elements and attributes
 * inside top-level complex types (direct sequence/choice/all particles only).
 *
 * **Known limitation:** Deeply nested elements (e.g. elements inside nested
 * sequences/choices, elements in complexContent extensions, or elements inside
 * named groups) are not traversed. This is a conservative check — it may
 * allow removal when references actually exist deeper in the tree.
 */
function isPrefixReferencedInSchema(prefix: string, schemaObj: schema): boolean {
  const prefixColon = `${prefix}:`;

  function typeUsesPrefix(type_: string | undefined): boolean {
    return type_ !== undefined && type_.startsWith(prefixColon);
  }

  for (const el of toArray(schemaObj.element)) {
    if (typeUsesPrefix(el.type_)) return true;
  }
  for (const attr of toArray(schemaObj.attribute)) {
    if (typeUsesPrefix(attr.type_)) return true;
  }
  for (const ct of toArray(schemaObj.complexType)) {
    for (const el of toArray(ct.sequence?.element)) {
      if (typeUsesPrefix(el.type_)) return true;
    }
    for (const el of toArray(ct.choice?.element)) {
      if (typeUsesPrefix(el.type_)) return true;
    }
    for (const el of toArray(ct.all?.element)) {
      if (typeUsesPrefix(el.type_)) return true;
    }
    for (const attr of toArray(ct.attribute)) {
      if (typeUsesPrefix(attr.type_)) return true;
    }
  }
  return false;
}

/**
 * Returns true if the given namespace URI has at least one prefix registered
 * in _namespacePrefixes AND that prefix is referenced in the schema.
 */
function isNamespaceReferenced(namespace: string | undefined, schemaObj: schema): boolean {
  if (!namespace || !schemaObj._namespacePrefixes) return false;
  for (const [pfx, ns] of Object.entries(schemaObj._namespacePrefixes)) {
    if (ns === namespace && isPrefixReferencedInSchema(pfx, schemaObj)) {
      return true;
    }
  }
  return false;
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
    if (!prefix.trim()) {
      return { valid: false, error: "Prefix cannot be empty when provided" };
    }
    if (!isValidXmlName(prefix.trim())) {
      return { valid: false, error: `Prefix '${prefix.trim()}' is not a valid XML name` };
    }
    // Check prefix uniqueness
    if (schemaObj._namespacePrefixes && Object.prototype.hasOwnProperty.call(schemaObj._namespacePrefixes, prefix.trim())) {
      return { valid: false, error: `Prefix '${prefix.trim()}' is already in use` };
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
  const { importId, namespace, schemaLocation, prefix } = command.payload;

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

  if (prefix !== undefined) {
    if (!prefix.trim()) {
      return { valid: false, error: "Prefix cannot be empty when provided" };
    }
    if (!isValidXmlName(prefix.trim())) {
      return { valid: false, error: `Prefix '${prefix.trim()}' is not a valid XML name` };
    }
    // Check prefix uniqueness (excluding the current import's own prefix)
    const currentNamespace = imports[position].namespace;
    if (schemaObj._namespacePrefixes) {
      const currentPrefix = Object.entries(schemaObj._namespacePrefixes).find(
        ([, ns]) => ns === currentNamespace
      )?.[0];
      if (
        prefix.trim() !== currentPrefix &&
        Object.prototype.hasOwnProperty.call(schemaObj._namespacePrefixes, prefix.trim())
      ) {
        return { valid: false, error: `Prefix '${prefix.trim()}' is already in use` };
      }
    }
  }

  return { valid: true };
}

// ===== Include Command Validation =====

export function validateAddInclude(
  command: AddIncludeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.schemaLocation.trim()) {
    return { valid: false, error: "Schema location cannot be empty" };
  }
  // TODO Phase 2: Validate schemaLocation is a valid path/URI
  // TODO Phase 2: Check if include already exists
  return { valid: true };
}

export function validateRemoveInclude(
  command: RemoveIncludeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.includeId.trim()) {
    return { valid: false, error: "Include ID cannot be empty" };
  }
  // TODO Phase 2: Validate that includeId exists in schema
  return { valid: true };
}

export function validateModifyInclude(
  command: ModifyIncludeCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.includeId.trim()) {
    return { valid: false, error: "Include ID cannot be empty" };
  }
  // TODO Phase 2: Validate that includeId exists in schema
  return { valid: true };
}
