/**
 * Schema-root namespace editing helpers for the properties panel.
 */

import { SchemaCommand } from "../../shared/types";
import { Diagram, DiagramItem } from "../diagram";
import {
  addPropertyWithElementToContainer,
  createEditableField,
} from "./propertiesPanelDom";

type CommandDispatcher = (command: SchemaCommand) => void;

const RESERVED_NAMESPACE_PREFIXES = new Set(["xml", "xmlns"]);
type NamespacePrefixes = Record<string, string>;

/**
 * Renders schema-root namespace fields and wires edits to `modifySchemaNamespaces` commands.
 *
 * @param root - General-tab container element
 * @param node - Currently selected schema diagram item
 * @param dispatchCommand - Callback used to emit schema commands
 * @param rerender - Callback used to refresh the properties panel after edits
 * @throws {Error} If the schema node belongs to no diagram, which holds the namespaces
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
    createEditableField("targetNamespace", targetNamespace, (next) => {
      const nextTargetNamespace = next.trim();
      const previousNamespacePrefixes = { ...namespacePrefixes };
      const nextNamespacePrefixes = { ...namespacePrefixes };
      const previousTargetNamespace = targetNamespace;
      syncTargetNamespaceWithDeclarations(
        previousTargetNamespace,
        nextTargetNamespace,
        nextNamespacePrefixes,
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

  const entries = Object.entries(namespacePrefixes).sort(([prefixA], [prefixB]) =>
    prefixA.localeCompare(prefixB)
  );
  for (const [prefix, namespaceUri] of entries) {
    namespacesContainer.appendChild(
      createNamespaceRow(
        diagram,
        prefix,
        namespaceUri,
        targetNamespace,
        namespacePrefixes,
        dispatchCommand,
        rerender
      )
    );
  }

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "property-docs-action";
  addButton.textContent = "Add namespace";
  addButton.addEventListener("click", () => {
    const previousNamespacePrefixes = { ...namespacePrefixes };
    const nextNamespacePrefixes = { ...namespacePrefixes };
    const nextPrefix = generateUniqueNamespacePrefix(nextNamespacePrefixes);
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
 * namespace changes or removes the target namespace too; a reserved prefix is rejected.
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

  const prefixInput = document.createElement("input");
  prefixInput.type = "text";
  prefixInput.className = "property-input";
  prefixInput.value = prefix;
  prefixInput.placeholder = "prefix";

  const namespaceInput = document.createElement("input");
  namespaceInput.type = "text";
  namespaceInput.className = "property-input";
  namespaceInput.value = namespaceUri;
  namespaceInput.placeholder = "namespace URI";

  const commit = (): void => {
    const nextPrefix = prefixInput.value.trim();
    const nextNamespaceUri = namespaceInput.value.trim();
    if (RESERVED_NAMESPACE_PREFIXES.has(nextPrefix)) {
      rerender();
      return;
    }
    const previousNamespacePrefixes = { ...namespacePrefixes };
    const nextNamespacePrefixes = { ...namespacePrefixes };
    delete nextNamespacePrefixes[prefix];
    if (nextNamespaceUri) {
      nextNamespacePrefixes[nextPrefix] = nextNamespaceUri;
    }
    const nextTargetNamespace =
      targetNamespace && namespacePrefixes[prefix] === targetNamespace
        ? nextNamespaceUri
        : targetNamespace;
    applySchemaNamespaceDraftState(
      diagram,
      nextTargetNamespace,
      nextNamespacePrefixes,
      previousNamespacePrefixes,
      dispatchCommand,
      rerender
    );
  };
  prefixInput.addEventListener("blur", commit);
  namespaceInput.addEventListener("blur", commit);
  prefixInput.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      prefixInput.blur();
    }
  });
  namespaceInput.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      namespaceInput.blur();
    }
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "property-docs-action";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => {
    const previousNamespacePrefixes = { ...namespacePrefixes };
    const nextNamespacePrefixes = { ...namespacePrefixes };
    delete nextNamespacePrefixes[prefix];
    const nextTargetNamespace =
      targetNamespace && namespacePrefixes[prefix] === targetNamespace
        ? ""
        : targetNamespace;
    applySchemaNamespaceDraftState(
      diagram,
      nextTargetNamespace,
      nextNamespacePrefixes,
      previousNamespacePrefixes,
      dispatchCommand,
      rerender
    );
  });

  row.append(prefixInput, namespaceInput, removeButton);
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
  const normalizedNamespacePrefixes = normalizeNamespacePrefixes(namespacePrefixes);
  const normalizedTargetNamespace = targetNamespace.trim();
  if (
    normalizedTargetNamespace &&
    !Object.values(normalizedNamespacePrefixes).some(
      (namespaceUri) => namespaceUri === normalizedTargetNamespace
    )
  ) {
    rerender();
    return;
  }

  diagram.schemaTargetNamespace = normalizedTargetNamespace;
  diagram.schemaNamespacePrefixes = normalizedNamespacePrefixes;
  const nextSchemaPrefix = findTargetNamespacePrefix(
    normalizedNamespacePrefixes,
    normalizedTargetNamespace
  );
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
 * Changes the declaration of the target namespace to a new target namespace, in place. Without a
 * declaration, the new target namespace gets one with the preferred prefix, `tns` or a new prefix.
 * Removing the target namespace removes its declaration.
 *
 * @param previousTargetNamespace - The current target namespace
 * @param nextTargetNamespace - The new target namespace, empty to remove it
 * @param namespacePrefixes - The namespace declarations, which are changed
 * @param preferredPrefix - The prefix of the target namespace in the diagram, if it has one
 */
function syncTargetNamespaceWithDeclarations(
  previousTargetNamespace: string,
  nextTargetNamespace: string,
  namespacePrefixes: Record<string, string>,
  preferredPrefix?: string
): void {
  const previousPrefix = findTargetNamespacePrefix(
    namespacePrefixes,
    previousTargetNamespace,
    preferredPrefix
  );
  if (previousPrefix !== undefined) {
    if (nextTargetNamespace) {
      namespacePrefixes[previousPrefix] = nextTargetNamespace;
    } else {
      delete namespacePrefixes[previousPrefix];
    }
    return;
  }
  if (!nextTargetNamespace) {
    return;
  }
  const candidatePrefix = preferredPrefix?.trim() || "tns";
  const nextPrefix = namespacePrefixes[candidatePrefix]
    ? generateUniqueNamespacePrefix(namespacePrefixes)
    : candidatePrefix;
  namespacePrefixes[nextPrefix] = nextTargetNamespace;
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
  namespacePrefixes: Record<string, string>,
  targetNamespace: string,
  preferredPrefix?: string
): string | undefined {
  if (!targetNamespace) {
    return undefined;
  }
  const normalizedPreferredPrefix = preferredPrefix?.trim();
  if (
    normalizedPreferredPrefix &&
    namespacePrefixes[normalizedPreferredPrefix] === targetNamespace
  ) {
    return normalizedPreferredPrefix;
  }
  return Object.entries(namespacePrefixes).find(
    ([, namespaceUri]) => namespaceUri === targetNamespace
  )?.[0];
}

/**
 * Returns the first prefix `ns0`, `ns1`, … that is not declared yet.
 *
 * @param namespacePrefixes - The namespace declarations
 * @returns The prefix
 */
function generateUniqueNamespacePrefix(namespacePrefixes: Record<string, string>): string {
  let index = 0;
  while (Object.prototype.hasOwnProperty.call(namespacePrefixes, `ns${index}`)) {
    index++;
  }
  return `ns${index}`;
}

/**
 * Trims the prefixes and URIs of namespace declarations and leaves out declarations without a URI and
 * with a reserved prefix.
 *
 * @param namespacePrefixes - The namespace declarations
 * @returns The normalized declarations
 */
function normalizeNamespacePrefixes(
  namespacePrefixes: NamespacePrefixes
): NamespacePrefixes {
  const normalized: NamespacePrefixes = {};
  for (const [prefix, namespaceUri] of Object.entries(namespacePrefixes)) {
    const normalizedPrefix = prefix.trim();
    const normalizedNamespaceUri = namespaceUri.trim();
    if (!normalizedNamespaceUri || RESERVED_NAMESPACE_PREFIXES.has(normalizedPrefix)) {
      continue;
    }
    normalized[normalizedPrefix] = normalizedNamespaceUri;
  }
  return normalized;
}
