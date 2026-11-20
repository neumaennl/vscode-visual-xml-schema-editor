/**
 * Validators for schema-level commands (Import and Include).
 */

import type {
  schema,
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
  AddIncludeCommand,
  RemoveIncludeCommand,
  ModifyIncludeCommand,
  ModifySchemaNamespacesCommand,
} from "../../shared/types.js";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy.js";
import { prefixesForNamespace, isAbsoluteUri, validatePrefix } from "../../shared/qNames.js";
import type { ValidationResult } from "../../shared/validation.js";
import { isAnyPrefixReferenced } from "../schemaReferences/referenceChecks.js";

// ===== Helpers =====

/**
 * Returns true if `value` looks like a valid relative or absolute file path /
 * URI suitable for use as a `schemaLocation`.
 * Rejects values that contain whitespace or are clearly malformed.
 *
 * @param value - The value to check
 * @returns True if the value is not empty and contains no whitespace
 */
function isValidSchemaLocation(value: string): boolean {
  // Must be non-empty and contain no whitespace
  if (!value || /\s/.test(value)) return false;
  return true;
}

/**
 * Parses the ID of an import or include and validates that it refers to an existing entry.
 *
 * Returns `{ valid: true, position, entry }` with the resolved zero-based index and the entry on
 * success, or `{ valid: false, error }` when the ID is malformed or out of range, so that callers
 * need neither `parseSchemaId` nor the index a second time.
 *
 * @param id - The ID of the import or include
 * @param kind - Whether the ID identifies an import or an include
 * @param entries - The imports or includes of the schema
 * @returns The position and the entry, or the validation failure
 */
function validateModuleId<T extends object>(
  id: string,
  kind: "import" | "include",
  entries: T[] | undefined
): { valid: false; error: string } | { valid: true; position: number; entry: T } {
  let parsed;
  try {
    parsed = parseSchemaId(id);
  } catch {
    return { valid: false, error: `Invalid ${kind} ID: ${id}` };
  }
  const index = parsed.position;
  const expectedNodeType = kind === "import" ? SchemaNodeType.Import : SchemaNodeType.Include;
  if (parsed.nodeType !== expectedNodeType) {
    return {
      valid: false,
      error: `'${id}' does not refer to an ${kind} node (got '${parsed.nodeType}')`,
    };
  }
  const entry = index === undefined ? undefined : entries?.[index];
  if (index === undefined || entry === undefined) {
    const label = kind === "import" ? "Import" : "Include";
    return { valid: false, error: `${label} not found: ${id}` };
  }
  return { valid: true, position: index, entry };
}

/**
 * Returns true if the given namespace URI has at least one prefix registered
 * in `_namespacePrefixes` AND that prefix is referenced anywhere in the schema.
 *
 * Collects all prefixes bound to the namespace and delegates to
 * {@link isAnyPrefixReferenced} for a single full recursive traversal
 * of all QName-valued fields (`element/@type`, `complexType/@base`,
 * `restriction/@base`, `union/@memberTypes`, `group/@ref`, `attributeGroup/@ref`, etc.)
 *
 * @param namespace - The namespace URI
 * @param schemaObj - The schema
 * @returns True if a prefix of the namespace is used in the schema
 */
function isNamespaceReferenced(namespace: string, schemaObj: schema): boolean {
  if (!namespace || !schemaObj._namespacePrefixes) return false;
  return isAnyPrefixReferenced(new Set(prefixesForNamespace(schemaObj._namespacePrefixes, namespace)), schemaObj);
}

/**
 * Validates the namespace of an import: not empty and an absolute URI.
 *
 * @param namespace - The namespace
 * @returns The validation result
 */
function validateImportNamespace(namespace: string): ValidationResult {
  if (!namespace.trim()) {
    return { valid: false, error: "Namespace cannot be empty" };
  }
  if (!isAbsoluteUri(namespace.trim())) {
    return { valid: false, error: "Namespace must be a valid absolute URI" };
  }
  return { valid: true };
}

/**
 * Validates the schema location of an import or include: not empty, and a path or URI without whitespace.
 *
 * @param schemaLocation - The schema location
 * @returns The validation result
 */
function validateSchemaLocation(schemaLocation: string): ValidationResult {
  if (!schemaLocation.trim()) {
    return { valid: false, error: "Schema location cannot be empty" };
  }
  if (!isValidSchemaLocation(schemaLocation)) {
    return { valid: false, error: "Schema location must be a valid path or URI without whitespace" };
  }
  return { valid: true };
}

// ===== Import Command Validation =====

/**
 * Validates an `addImport` command: the namespace and schema location must be valid, the schema must not
 * import the namespace yet, and a given prefix must be valid and not bound to another namespace.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateAddImport(command: AddImportCommand, schemaObj: schema): ValidationResult {
  const { namespace, schemaLocation, prefix } = command.payload;

  const namespaceResult = validateImportNamespace(namespace);
  if (!namespaceResult.valid) return namespaceResult;

  const locationResult = validateSchemaLocation(schemaLocation);
  if (!locationResult.valid) return locationResult;

  // Check if an import for this namespace already exists
  const existingImports = schemaObj.import_ ?? [];
  if (existingImports.some((imp) => imp.namespace === namespace.trim())) {
    return { valid: false, error: `An import for namespace '${namespace.trim()}' already exists` };
  }

  // Validate prefix, if provided
  if (prefix !== undefined) {
    if (!prefix) {
      return { valid: false, error: "Prefix cannot be empty when provided" };
    }
    const prefixResult = validatePrefix(prefix);
    if (!prefixResult.valid) return prefixResult;
    // Check prefix uniqueness: only reject when bound to a different namespace
    const prefixes = schemaObj._namespacePrefixes ?? {};
    const existingNs = Object.hasOwn(prefixes, prefix) ? prefixes[prefix] : undefined;
    if (existingNs !== undefined && existingNs !== namespace.trim()) {
      return { valid: false, error: `Prefix '${prefix}' is already in use by namespace '${existingNs}'` };
    }
  }

  return { valid: true };
}

/**
 * Validates a `removeImport` command: the import must exist, and no QName in the schema may still use a
 * prefix of its namespace.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateRemoveImport(command: RemoveImportCommand, schemaObj: schema): ValidationResult {
  if (!command.payload.importId.trim()) {
    return { valid: false, error: "Import ID cannot be empty" };
  }
  const idResult = validateModuleId(command.payload.importId, "import", schemaObj.import_);
  if (!idResult.valid) return idResult;

  // Check if the import's namespace prefix is still referenced in the schema
  const { namespace } = idResult.entry;
  if (namespace !== undefined && isNamespaceReferenced(namespace, schemaObj)) {
    return {
      valid: false,
      error: `Cannot remove import: namespace '${namespace}' is still referenced in the schema`,
    };
  }

  return { valid: true };
}

/**
 * Validates a `modifyImport` command: the import must exist, a new namespace must be valid and not
 * imported yet, and a new schema location must be valid. `oldPrefix` needs `prefix` and must be bound
 * to the namespace of the import; the new prefix must be valid and not bound to another namespace.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateModifyImport(command: ModifyImportCommand, schemaObj: schema): ValidationResult {
  const { importId, namespace, schemaLocation, oldPrefix, prefix } = command.payload;

  if (!importId.trim()) {
    return { valid: false, error: "Import ID cannot be empty" };
  }
  const idResult = validateModuleId(importId, "import", schemaObj.import_);
  if (!idResult.valid) return idResult;

  const imports = schemaObj.import_ ?? [];
  const position = idResult.position;

  if (namespace !== undefined) {
    const namespaceResult = validateImportNamespace(namespace);
    if (!namespaceResult.valid) return namespaceResult;
    // Check that changing the namespace won't create a duplicate
    const currentNamespace = idResult.entry.namespace;
    if (namespace.trim() !== currentNamespace) {
      if (imports.some((imp, i) => i !== position && imp.namespace === namespace.trim())) {
        return { valid: false, error: `An import for namespace '${namespace.trim()}' already exists` };
      }
    }
  }

  if (schemaLocation !== undefined) {
    const locationResult = validateSchemaLocation(schemaLocation);
    if (!locationResult.valid) return locationResult;
  }

  if (oldPrefix !== undefined) {
    // oldPrefix without prefix is meaningless — nothing would be renamed/deleted
    if (prefix === undefined) {
      return { valid: false, error: "'oldPrefix' requires 'prefix' to be provided" };
    }
    // oldPrefix must currently be registered for this import's namespace
    const currentNamespace = idResult.entry.namespace;
    const registeredNs = schemaObj._namespacePrefixes?.[oldPrefix];
    if (registeredNs === undefined) {
      return { valid: false, error: `Prefix '${oldPrefix}' is not registered in this schema` };
    }
    if (registeredNs !== currentNamespace) {
      return {
        valid: false,
        error: `Prefix '${oldPrefix}' is not registered for namespace '${currentNamespace ?? "(none)"}'`,
      };
    }
  }

  if (prefix !== undefined) {
    if (!prefix) {
      return { valid: false, error: "Prefix cannot be empty when provided" };
    }
    const prefixResult = validatePrefix(prefix);
    if (!prefixResult.valid) return prefixResult;
    // Check prefix uniqueness: the new prefix must not already be registered
    // for a *different* namespace.  It is fine (no-op) if it is already
    // registered for the same namespace that this import is being modified to.
    const targetNamespace = namespace?.trim() ?? idResult.entry.namespace;
    // A prefix binds a namespace, so an import without one cannot get a prefix
    if (!targetNamespace) {
      return { valid: false, error: `Cannot bind prefix '${prefix}' to an import without a namespace` };
    }
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
 * Validates an `addInclude` command: the schema location must be valid and not included yet.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateAddInclude(command: AddIncludeCommand, schemaObj: schema): ValidationResult {
  const { schemaLocation } = command.payload;

  const locationResult = validateSchemaLocation(schemaLocation);
  if (!locationResult.valid) return locationResult;

  // Check if an include with this schemaLocation already exists
  const existingIncludes = schemaObj.include ?? [];
  if (existingIncludes.some((inc) => inc.schemaLocation === schemaLocation.trim())) {
    return { valid: false, error: `An include for schema location '${schemaLocation.trim()}' already exists` };
  }

  return { valid: true };
}

/**
 * Validates a `removeInclude` command: the include must exist.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateRemoveInclude(command: RemoveIncludeCommand, schemaObj: schema): ValidationResult {
  if (!command.payload.includeId.trim()) {
    return { valid: false, error: "Include ID cannot be empty" };
  }
  const idResult = validateModuleId(command.payload.includeId, "include", schemaObj.include);
  if (!idResult.valid) return idResult;

  return { valid: true };
}

/**
 * Validates a `modifyInclude` command: the include must exist, and the new schema location must be valid
 * and not used by another include.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateModifyInclude(command: ModifyIncludeCommand, schemaObj: schema): ValidationResult {
  const { includeId, schemaLocation } = command.payload;

  if (!includeId.trim()) {
    return { valid: false, error: "Include ID cannot be empty" };
  }
  const idResult = validateModuleId(includeId, "include", schemaObj.include);
  if (!idResult.valid) return idResult;

  const locationResult = validateSchemaLocation(schemaLocation);
  if (!locationResult.valid) return locationResult;

  // Check if another include already uses this schemaLocation
  const trimmedLocation = schemaLocation.trim();
  const includes = schemaObj.include ?? [];
  const currentPosition = idResult.position;
  if (includes.some((inc, index) => index !== currentPosition && inc.schemaLocation === trimmedLocation)) {
    return {
      valid: false,
      error: `An include for schema location '${trimmedLocation}' already exists`,
    };
  }

  return { valid: true };
}

/**
 * Validates a `modifySchemaNamespaces` command: the target namespace and every declared namespace must be
 * absolute URIs, every prefix must be valid, and a target namespace must be one of the declared
 * namespaces.
 *
 * @param command - The command
 * @param _schemaObj - Not used: the command replaces all declarations, so nothing depends on the schema
 * @returns The validation result
 */
export function validateModifySchemaNamespaces(
  command: ModifySchemaNamespacesCommand,
  _schemaObj: schema
): ValidationResult {
  const { targetNamespace, namespacePrefixes } = command.payload;

  if (targetNamespace !== undefined) {
    const trimmedTargetNamespace = targetNamespace.trim();
    if (trimmedTargetNamespace && !isAbsoluteUri(trimmedTargetNamespace)) {
      return { valid: false, error: "targetNamespace must be a valid absolute URI" };
    }
  }

  for (const [prefix, namespaceUri] of Object.entries(namespacePrefixes)) {
    const prefixResult = validatePrefix(prefix);
    if (!prefixResult.valid) return prefixResult;
    if (!namespaceUri.trim()) {
      return { valid: false, error: "Namespace URI cannot be empty" };
    }
    if (!isAbsoluteUri(namespaceUri.trim())) {
      return { valid: false, error: `Namespace URI '${namespaceUri}' must be a valid absolute URI` };
    }
  }

  const trimmedTargetNamespace = targetNamespace?.trim();
  if (
    trimmedTargetNamespace &&
    !Object.values(namespacePrefixes).some((namespaceUri) => namespaceUri.trim() === trimmedTargetNamespace)
  ) {
    return {
      valid: false,
      error: "targetNamespace must match one of the declared namespace URIs",
    };
  }

  return { valid: true };
}
