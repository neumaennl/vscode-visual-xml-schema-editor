/**
 * Schema-root namespace editing helpers for the properties panel.
 */

import type { NamespacePrefixes, SchemaCommand } from "../../shared/types";
import type { Diagram, DiagramItem } from "../diagram";
import {
  firstFreePrefix,
  isAbsoluteUri,
  isReservedPrefix,
  normalizeNamespacePrefixes,
  prefixesForNamespace,
  validatePrefix,
} from "../../shared/qNames";
import { addPropertyWithElementToContainer } from "./propertiesPanelDom";
import { createEditableField, createTextInput } from "./propertiesPanelFields";

type CommandDispatcher = (command: SchemaCommand) => void;

/**
 * Renders schema-root namespace fields and wires edits to `modifySchemaNamespaces` commands.
 *
 * @param root - General-tab container element
 * @param node - Currently selected schema diagram item
 * @param dispatchCommand - Callback used to emit schema commands
 * @param rerender - Callback used to refresh the properties panel after edits
 * @throws An {@link Error} if the schema node belongs to no diagram, which holds the namespaces
 */
export function renderSchemaNamespaceProperties(
  root: HTMLElement,
  node: DiagramItem,
  dispatchCommand: CommandDispatcher,
  rerender: () => void
): void {
  const { diagram } = node;
  if (!diagram) {
    throw new Error("The schema node belongs to no diagram");
  }
  const targetNamespace = diagram.schemaTargetNamespace;
  const namespacePrefixes = { ...diagram.schemaNamespacePrefixes };

  root.appendChild(
    createEditableField("targetNamespace", targetNamespace, (next, reject) => {
      const nextTargetNamespace = next.trim();
      // An empty target namespace removes it
      if (nextTargetNamespace && !isAbsoluteUri(nextTargetNamespace)) {
        reject("targetNamespace must be a valid absolute URI");
        return;
      }
      const previousNamespacePrefixes = { ...namespacePrefixes };
      const nextNamespacePrefixes = syncTargetNamespaceWithDeclarations(
        targetNamespace,
        nextTargetNamespace,
        namespacePrefixes,
        diagram.currentSchemaPrefix
      );
      applySchemaNamespaceDraftState(
        diagram,
        nextTargetNamespace,
        nextNamespacePrefixes,
        previousNamespacePrefixes,
        dispatchCommand,
        rerender
      );
    })
  );

  const namespacesContainer = document.createElement("div");
  namespacesContainer.className = "property-schema-namespaces";

  const entries = Object.entries(namespacePrefixes).sort(([prefixA], [prefixB]) => prefixA.localeCompare(prefixB));
  for (const [prefix, namespaceUri] of entries) {
    namespacesContainer.appendChild(
      createNamespaceRow(diagram, prefix, namespaceUri, targetNamespace, namespacePrefixes, dispatchCommand, rerender)
    );
  }

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "property-docs-action";
  addButton.textContent = "Add namespace";
  addButton.addEventListener("click", () => {
    const previousNamespacePrefixes = { ...namespacePrefixes };
    const nextNamespacePrefixes = { ...namespacePrefixes };
    const nextPrefix = firstFreePrefix(nextNamespacePrefixes);
    nextNamespacePrefixes[nextPrefix] = "urn:example:namespace";
    applySchemaNamespaceDraftState(
      diagram,
      targetNamespace,
      nextNamespacePrefixes,
      previousNamespacePrefixes,
      dispatchCommand,
      rerender
    );
  });
  namespacesContainer.appendChild(addButton);

  addPropertyWithElementToContainer(root, "Namespaces", namespacesContainer);
}

/**
 * Creates the row of a namespace declaration: a prefix and a URI field, which commit when they are
 * left, and a button that removes the declaration. Changing or removing the declaration of the target
 * namespace changes or removes the target namespace too. An invalid, reserved or already declared prefix
 * and a URI that is not absolute are rejected with a message below the field.
 *
 * @param diagram - The diagram of the schema
 * @param prefix - The prefix of the declaration
 * @param namespaceUri - The URI of the declaration
 * @param targetNamespace - The current target namespace
 * @param namespacePrefixes - All current namespace declarations
 * @param dispatchCommand - Callback used to emit schema commands
 * @param rerender - Callback used to refresh the properties panel after edits
 * @returns The row
 */
function createNamespaceRow(
  diagram: Diagram,
  prefix: string,
  namespaceUri: string,
  targetNamespace: string,
  namespacePrefixes: NamespacePrefixes,
  dispatchCommand: CommandDispatcher,
  rerender: () => void
): HTMLElement {
  const row = document.createElement("div");
  row.className = "property-namespace-row";

  let currentPrefix = prefix;
  let currentNamespaceUri = namespaceUri;
  const commit = (): void => {
    const previousNamespacePrefixes = { ...namespacePrefixes };
    const { [prefix]: _removed, ...nextNamespacePrefixes } = namespacePrefixes;
    if (currentNamespaceUri) {
      nextNamespacePrefixes[currentPrefix] = currentNamespaceUri;
    }
    const nextTargetNamespace =
      targetNamespace && namespacePrefixes[prefix] === targetNamespace ? currentNamespaceUri : targetNamespace;
    applySchemaNamespaceDraftState(
      diagram,
      nextTargetNamespace,
      nextNamespacePrefixes,
      previousNamespacePrefixes,
      dispatchCommand,
      rerender
    );
  };

  const prefixField = createTextInput(
    prefix,
    (next, reject) => {
      const nextPrefix = next.trim();
      if (nextPrefix === currentPrefix) {
        return;
      }
      const result = validatePrefix(nextPrefix);
      if (!result.valid) {
        reject(result.error);
        return;
      }
      if (Object.hasOwn(namespacePrefixes, nextPrefix)) {
        reject(`Prefix '${nextPrefix}' is already declared`);
        return;
      }
      currentPrefix = nextPrefix;
      commit();
    },
    { placeholder: "prefix" }
  );
  const namespaceField = createTextInput(
    namespaceUri,
    (next, reject) => {
      const nextNamespaceUri = next.trim();
      if (nextNamespaceUri === currentNamespaceUri) {
        return;
      }
      // An empty URI removes the declaration
      if (nextNamespaceUri && !isAbsoluteUri(nextNamespaceUri)) {
        reject("Namespace URI must be a valid absolute URI");
        return;
      }
      currentNamespaceUri = nextNamespaceUri;
      commit();
    },
    { placeholder: "namespace URI" }
  );

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "property-docs-action";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => {
    const previousNamespacePrefixes = { ...namespacePrefixes };
    const { [prefix]: _removed, ...nextNamespacePrefixes } = namespacePrefixes;
    const nextTargetNamespace = targetNamespace && namespacePrefixes[prefix] === targetNamespace ? "" : targetNamespace;
    applySchemaNamespaceDraftState(
      diagram,
      nextTargetNamespace,
      nextNamespacePrefixes,
      previousNamespacePrefixes,
      dispatchCommand,
      rerender
    );
  });

  row.append(prefixField, namespaceField, removeButton);
  return row;
}

/**
 * Applies new namespaces to the diagram and sends them. Declarations without a URI and with a reserved
 * prefix are left out. A target namespace without a declaration is rejected and the fields are shown
 * again unchanged.
 *
 * @param diagram - The diagram of the schema
 * @param targetNamespace - The new target namespace
 * @param namespacePrefixes - The new namespace declarations
 * @param previousNamespacePrefixes - The namespace declarations before the change
 * @param dispatchCommand - Callback used to emit schema commands
 * @param rerender - Callback used to refresh the properties panel after edits
 */
function applySchemaNamespaceDraftState(
  diagram: Diagram,
  targetNamespace: string,
  namespacePrefixes: NamespacePrefixes,
  previousNamespacePrefixes: NamespacePrefixes,
  dispatchCommand: CommandDispatcher,
  rerender: () => void
): void {
  const normalizedNamespacePrefixes = normalizeEditedNamespacePrefixes(namespacePrefixes);
  const normalizedTargetNamespace = targetNamespace.trim();
  if (
    normalizedTargetNamespace &&
    !Object.values(normalizedNamespacePrefixes).some((namespaceUri) => namespaceUri === normalizedTargetNamespace)
  ) {
    rerender();
    return;
  }

  diagram.schemaTargetNamespace = normalizedTargetNamespace;
  diagram.schemaNamespacePrefixes = normalizedNamespacePrefixes;
  const nextSchemaPrefix = findTargetNamespacePrefix(normalizedNamespacePrefixes, normalizedTargetNamespace);
  diagram.currentSchemaPrefix = nextSchemaPrefix;

  dispatchCommand({
    type: "modifySchemaNamespaces",
    payload: {
      targetNamespace: normalizedTargetNamespace,
      namespacePrefixes: normalizedNamespacePrefixes,
      previousNamespacePrefixes,
    },
  });
  rerender();
}

/**
 * Changes the declaration of the target namespace to a new target namespace. Without a
 * declaration, the new target namespace gets one with the preferred prefix, `tns` or a new prefix.
 * Removing the target namespace removes its declaration.
 *
 * @param previousTargetNamespace - The current target namespace
 * @param nextTargetNamespace - The new target namespace, empty to remove it
 * @param namespacePrefixes - The namespace declarations, which stay unchanged
 * @param preferredPrefix - The prefix of the target namespace in the diagram, if it has one
 * @returns The changed namespace declarations
 */
function syncTargetNamespaceWithDeclarations(
  previousTargetNamespace: string,
  nextTargetNamespace: string,
  namespacePrefixes: NamespacePrefixes,
  preferredPrefix?: string
): NamespacePrefixes {
  const previousPrefix = findTargetNamespacePrefix(namespacePrefixes, previousTargetNamespace, preferredPrefix);
  if (previousPrefix !== undefined) {
    if (nextTargetNamespace) {
      return { ...namespacePrefixes, [previousPrefix]: nextTargetNamespace };
    }
    const { [previousPrefix]: _removed, ...otherPrefixes } = namespacePrefixes;
    return otherPrefixes;
  }
  if (!nextTargetNamespace) {
    return { ...namespacePrefixes };
  }
  // An empty prefix gets the default as well
  const candidatePrefix = (preferredPrefix?.trim() ?? "") || "tns";
  const nextPrefix = namespacePrefixes[candidatePrefix] ? firstFreePrefix(namespacePrefixes) : candidatePrefix;
  return { ...namespacePrefixes, [nextPrefix]: nextTargetNamespace };
}

/**
 * Finds the prefix of the target namespace, preferring the given prefix if it declares it.
 *
 * @param namespacePrefixes - The namespace declarations
 * @param targetNamespace - The target namespace
 * @param preferredPrefix - The prefix to prefer
 * @returns The prefix, or undefined when there is no target namespace or no declaration of it
 */
function findTargetNamespacePrefix(
  namespacePrefixes: NamespacePrefixes,
  targetNamespace: string,
  preferredPrefix?: string
): string | undefined {
  if (!targetNamespace) {
    return undefined;
  }
  const normalizedPreferredPrefix = preferredPrefix?.trim();
  if (normalizedPreferredPrefix && namespacePrefixes[normalizedPreferredPrefix] === targetNamespace) {
    return normalizedPreferredPrefix;
  }
  return prefixesForNamespace(namespacePrefixes, targetNamespace)[0];
}

/**
 * Trims the prefixes and URIs of namespace declarations and leaves out declarations without a URI and
 * with a reserved prefix.
 *
 * @param namespacePrefixes - The namespace declarations
 * @returns The normalized declarations
 */
function normalizeEditedNamespacePrefixes(namespacePrefixes: Readonly<NamespacePrefixes>): NamespacePrefixes {
  return Object.fromEntries(
    Object.entries(normalizeNamespacePrefixes(namespacePrefixes)).filter(([prefix]) => !isReservedPrefix(prefix))
  );
}
