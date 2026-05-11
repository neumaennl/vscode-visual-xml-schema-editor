/**
 * Schema-root namespace editing helpers for the property panel.
 */

import { SchemaCommand } from "../../shared/types";
import { DiagramItem } from "../diagram";
import {
  addPropertyWithElementToContainer,
  createEditableField,
} from "./propertyPanelDom";

type CommandDispatcher = (command: SchemaCommand) => void;

const RESERVED_NAMESPACE_PREFIXES = new Set(["xml", "xmlns"]);
type NamespacePrefixes = Record<string, string>;

/**
 * Renders schema-root namespace fields and wires edits to `modifySchemaNamespaces` commands.
 *
 * @param root - General-tab container element
 * @param node - Currently selected schema diagram item
 * @param dispatchCommand - Callback used to emit schema commands
 * @param rerender - Callback used to refresh the property panel after edits
 */
export function renderSchemaNamespaceProperties(
  root: HTMLElement,
  node: DiagramItem,
  dispatchCommand: CommandDispatcher,
  rerender: () => void
): void {
  const { targetNamespace, namespacePrefixes } = getSchemaNamespaceState(node);

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
        node.diagram?.currentSchemaPrefix
      );
      applySchemaNamespaceDraftState(
        node,
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
        node,
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
      node,
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

function createNamespaceRow(
  node: DiagramItem,
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
      node,
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
      node,
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

function applySchemaNamespaceDraftState(
  node: DiagramItem,
  targetNamespace: string,
  namespacePrefixes: NamespacePrefixes,
  previousNamespacePrefixes: NamespacePrefixes,
  dispatchCommand: CommandDispatcher,
  rerender: () => void
): void {
  if (!node.diagram) {
    rerender();
    return;
  }

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

  node.diagram.schemaTargetNamespace = normalizedTargetNamespace;
  node.diagram.schemaNamespacePrefixes = normalizedNamespacePrefixes;
  const nextSchemaPrefix = findTargetNamespacePrefix(
    normalizedNamespacePrefixes,
    normalizedTargetNamespace
  );
  node.diagram.currentSchemaPrefix = nextSchemaPrefix;

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

function getSchemaNamespaceState(node: DiagramItem): {
  targetNamespace: string;
  namespacePrefixes: NamespacePrefixes;
} {
  if (!node.diagram) {
    return { targetNamespace: "", namespacePrefixes: {} };
  }
  return {
    targetNamespace: node.diagram.schemaTargetNamespace,
    namespacePrefixes: { ...node.diagram.schemaNamespacePrefixes },
  };
}

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

function generateUniqueNamespacePrefix(namespacePrefixes: Record<string, string>): string {
  let index = 0;
  while (Object.prototype.hasOwnProperty.call(namespacePrefixes, `ns${index}`)) {
    index++;
  }
  return `ns${index}`;
}

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
