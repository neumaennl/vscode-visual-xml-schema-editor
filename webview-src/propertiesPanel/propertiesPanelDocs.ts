/**
 * The Docs tab of the `PropertiesPanel`: the `xs:annotation` and `xs:documentation` nodes of a node, with
 * controls that send the commands to change them. The tab shows a change when the new schema arrives.
 */

import type { SchemaCommand } from "../../shared/types";
import { getDocumentationAnnotations, type DiagramItem } from "../diagram";
import type { DiagramAnnotationEntry, DiagramDocumentationEntry } from "../diagram/DiagramTypes";
import { resolveDocumentationTargetId } from "./propertiesPanelTargets";
import { createEditableTextArea } from "./propertiesPanelDom";
import { SCHEMA_ROOT_ID } from "../../shared/idStrategy";

const NEW_DOCUMENTATION_TEXT = "New documentation";

/**
 * Returns whether the currently edited node is the schema root, which is the
 * only case where the Docs tab should expose multiple `xs:annotation` nodes.
 *
 * @param node - Node currently shown in the `PropertiesPanel`
 * @returns True when the Docs tab should manage multiple annotations
 */
function isSchemaDocsTarget(node: DiagramItem): boolean {
  return node.id === SCHEMA_ROOT_ID;
}

/**
 * Creates a button used for documentation and annotation actions in the Docs tab.
 *
 * @param icon - Codicon name to render inside the button
 * @param label - Button label
 * @param onClick - Click handler to invoke
 * @param isDestructive - Whether the action removes data
 * @param showLabel - Whether the label is shown next to the icon; otherwise it is only the tooltip and the accessible name
 * @returns The configured button element
 */
function createActionButton(
  icon: "add" | "trash",
  label: string,
  onClick: () => void,
  isDestructive = false,
  showLabel = true
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "property-docs-action";
  if (isDestructive) {
    button.classList.add("property-docs-action-destructive");
  }
  if (!showLabel) {
    button.classList.add("property-docs-action-icon-only");
  }
  button.setAttribute("aria-label", label);
  button.title = label;

  const iconSpan = document.createElement("span");
  iconSpan.className = `codicon codicon-${icon}`;
  iconSpan.setAttribute("aria-hidden", "true");
  button.appendChild(iconSpan);

  if (showLabel) {
    const labelSpan = document.createElement("span");
    labelSpan.textContent = label;
    button.appendChild(labelSpan);
  }

  button.addEventListener("click", onClick);
  return button;
}

/**
 * Renders a documentation entry of an annotation section: its label, a button that removes it, and a
 * text area that changes its text.
 *
 * @param entry - The documentation entry
 * @param documentationIndex - Position of the entry within the annotation
 * @param dispatchCommand - Callback used to emit schema-edit commands
 * @returns The rendered entry element
 */
function createDocumentationEntry(
  entry: DiagramDocumentationEntry,
  documentationIndex: number,
  dispatchCommand: (command: SchemaCommand) => void
): HTMLElement {
  const entryWrapper = document.createElement("div");
  entryWrapper.className = "property-docs-entry";

  const header = document.createElement("div");
  header.className = "property-docs-entry-header";

  const label = document.createElement("label");
  label.textContent = `Documentation ${documentationIndex + 1}:`;
  header.appendChild(label);

  header.appendChild(
    createActionButton(
      "trash",
      "Remove documentation",
      () => {
        dispatchCommand({ type: "removeDocumentation", payload: { documentationId: entry.id } });
      },
      true,
      false
    )
  );
  entryWrapper.appendChild(header);

  const textArea = createEditableTextArea(entry.content, (next) => {
    dispatchCommand({ type: "modifyDocumentation", payload: { documentationId: entry.id, content: next } });
  });
  entryWrapper.appendChild(textArea);
  return entryWrapper;
}

/**
 * Renders a single annotation section, including its documentation entries plus add and remove controls
 * for both documentation nodes and the annotation.
 *
 * @param node - Node currently shown in the `PropertiesPanel`
 * @param annotation - Annotation entry to render
 * @param annotationIndex - Position of the annotation within the node
 * @param dispatchCommand - Callback used to emit schema-edit commands
 * @returns The rendered annotation section element
 */
function createAnnotationSection(
  node: DiagramItem,
  annotation: DiagramAnnotationEntry,
  annotationIndex: number,
  dispatchCommand: (command: SchemaCommand) => void
): HTMLElement {
  const section = document.createElement("section");
  section.className = "property-docs-section";

  const annotationHeader = document.createElement("div");
  annotationHeader.className = "property-docs-entry-header";
  const annotationLabel = document.createElement("label");
  annotationLabel.textContent = isSchemaDocsTarget(node) ? `Annotation ${annotationIndex + 1}:` : "Annotation:";
  annotationHeader.appendChild(annotationLabel);
  annotationHeader.appendChild(
    createActionButton(
      "trash",
      "Remove annotation",
      () => {
        dispatchCommand({ type: "removeAnnotation", payload: { annotationId: annotation.id } });
      },
      true,
      false
    )
  );
  section.appendChild(annotationHeader);

  if (annotation.documentationEntries.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.textContent = "This annotation has no documentation nodes yet.";
    section.appendChild(emptyState);
  }

  annotation.documentationEntries.forEach((entry, documentationIndex) => {
    section.appendChild(createDocumentationEntry(entry, documentationIndex, dispatchCommand));
  });

  section.appendChild(
    createActionButton("add", "Add documentation", () => {
      dispatchCommand({
        type: "addDocumentation",
        payload: { targetId: annotation.id, content: NEW_DOCUMENTATION_TEXT },
      });
    })
  );

  return section;
}

/**
 * Creates the Docs-tab contents for a selected diagram node.
 *
 * @param node - Diagram node currently shown in the `PropertiesPanel`
 * @param dispatchCommand - Callback used to emit schema-edit commands
 * @returns The rendered Docs-tab container
 * @throws An {@link Error} if the node has no documentation and no node that documentation can be added to;
 *   every node of the diagram has one
 */
export function createDocsTab(node: DiagramItem, dispatchCommand: (command: SchemaCommand) => void): HTMLElement {
  const root = document.createElement("div");
  root.className = "property-tab-content property-tab-content-docs";

  const annotations = getDocumentationAnnotations(node);
  if (annotations.length === 0) {
    const targetId = resolveDocumentationTargetId(node);
    if (!targetId) {
      throw new Error(`Documentation cannot be added to ${node.id}`);
    }

    root.appendChild(
      createActionButton("add", "Add documentation", () => {
        dispatchCommand({ type: "addDocumentation", payload: { targetId, content: NEW_DOCUMENTATION_TEXT } });
      })
    );

    appendAddSchemaAnnotationButton(root, node, dispatchCommand);
    return root;
  }

  const annotationsToRender = isSchemaDocsTarget(node) ? annotations : annotations.slice(0, 1);
  annotationsToRender.forEach((annotation, annotationIndex) => {
    root.appendChild(createAnnotationSection(node, annotation, annotationIndex, dispatchCommand));
  });

  appendAddSchemaAnnotationButton(root, node, dispatchCommand);
  return root;
}

/**
 * Adds the button that adds an annotation to the schema root, which can have several. Other nodes
 * have at most one annotation and get no such button.
 *
 * @param root - The Docs tab
 * @param node - The diagram node being edited
 * @param dispatchCommand - Callback used to emit schema commands
 */
function appendAddSchemaAnnotationButton(
  root: HTMLElement,
  node: DiagramItem,
  dispatchCommand: (command: SchemaCommand) => void
): void {
  if (!isSchemaDocsTarget(node)) {
    return;
  }
  root.appendChild(
    createActionButton("add", "Add annotation", () => {
      dispatchCommand({ type: "addAnnotation", payload: { targetId: SCHEMA_ROOT_ID } });
    })
  );
}
