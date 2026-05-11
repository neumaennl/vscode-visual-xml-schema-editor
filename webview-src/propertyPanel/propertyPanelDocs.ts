/**
 * Docs-tab helpers for the PropertyPanel.
 * This module renders structured xs:annotation / xs:documentation data and keeps
 * the draft diagram node in sync while dispatching granular metadata commands.
 */

import { SchemaCommand } from "../../shared/types";
import { DiagramItem } from "../diagram";
import { DiagramAnnotationEntry } from "../diagram/DiagramTypes";
import { resolveDocumentationTargetId } from "./propertyPanelCommands";
import { createEditableTextArea } from "./propertyPanelDom";
import { buildAnnotationId, buildDocumentationId } from "../diagram/DiagramBuilderHelpers";
import { SCHEMA_ROOT_ID } from "../../shared/idStrategy";
const NEW_DOCUMENTATION_TEXT = "New documentation";

/**
 * Flattens structured annotation/documentation entries into the legacy single-string
 * form still used by the diagram renderer for backwards-compatible text display.
 *
 * @param annotations - Structured annotation entries to flatten
 * @returns Newline-joined documentation text
 */
function flattenDocumentation(annotations: DiagramAnnotationEntry[]): string {
  return annotations
    .flatMap((annotation) => annotation.documentationEntries)
    .map((entry) => entry.content)
    .join("\n");
}

/**
 * Rebuilds annotation and documentation IDs from the current entry order so local
 * draft state stays aligned with the schema's positional metadata after add/remove edits.
 *
 * @param ownerId - Schema owner ID, or the schema-root ID for schema annotations
 * @param annotations - Annotation entries to normalize
 * @returns Normalized annotation entries with regenerated IDs
 */
function normalizeAnnotationEntries(
  ownerId: string,
  annotations: DiagramAnnotationEntry[]
): DiagramAnnotationEntry[] {
  return annotations.map((annotation, annotationIndex) => {
    const annotationId = buildAnnotationId(ownerId, annotationIndex);
    return {
      id: annotationId,
      documentationEntries: annotation.documentationEntries.map((entry, documentationIndex) => ({
        ...entry,
        id: buildDocumentationId(annotationId, documentationIndex),
      })),
    };
  });
}

/**
 * Resolves the owner ID that should drive ID normalization for a given annotation.
 * Schema-root annotations are indexed under the schema-root ID while other annotations keep
 * using their own annotation ID as the non-schema owner.
 *
 * @param node - Draft node currently being edited
 * @param annotation - Annotation entry being normalized
 * @returns The owner ID to pass to normalization
 */
function getNormalizationOwnerId(node: DiagramItem, annotation: DiagramAnnotationEntry): string {
  return node.id === SCHEMA_ROOT_ID ? SCHEMA_ROOT_ID : annotation.id;
}

/**
 * Keeps the legacy flattened `node.documentation` field synchronized with the
 * structured annotation entries so existing diagram text rendering keeps working.
 *
 * @param node - Draft node whose flattened documentation should be refreshed
 */
function syncDocumentationText(node: DiagramItem): void {
  node.documentation = flattenDocumentation(node.documentationAnnotations);
}

/**
 * Returns whether the currently edited node is the schema root, which is the
 * only case where the Docs tab should expose multiple xs:annotation nodes.
 *
 * @param node - Draft node currently shown in the PropertyPanel
 * @returns True when the Docs tab should manage multiple annotations
 */
function isSchemaDocsTarget(node: DiagramItem): boolean {
  return node.id === SCHEMA_ROOT_ID;
}

/**
 * Replaces a single annotation entry while keeping the surrounding annotation
 * array intact, which helps the Docs-tab handlers update nested documentation
 * lists without mutating the original draft structure in place.
 *
 * @param annotations - Current annotation entries for the draft node
 * @param targetIndex - Zero-based annotation index to replace
 * @param updateAnnotation - Callback that returns the next annotation value
 * @returns A new annotation array with the updated entry
 */
function updateAnnotationAtIndex(
  annotations: DiagramAnnotationEntry[],
  targetIndex: number,
  updateAnnotation: (annotation: DiagramAnnotationEntry) => DiagramAnnotationEntry
): DiagramAnnotationEntry[] {
  return annotations.map((annotation, index) =>
    index === targetIndex ? updateAnnotation(annotation) : annotation
  );
}

/**
 * Replaces the documentation-entry list of a single annotation while keeping
 * the surrounding annotation structure immutable.
 *
 * @param annotations - Current annotation entries for the draft node
 * @param targetIndex - Zero-based annotation index to update
 * @param updateEntries - Callback that returns the next documentation entries
 * @returns A new annotation array with the updated documentation list
 */
function updateDocumentationEntriesAtIndex(
  annotations: DiagramAnnotationEntry[],
  targetIndex: number,
  updateEntries: (entries: DiagramAnnotationEntry["documentationEntries"]) => DiagramAnnotationEntry["documentationEntries"]
): DiagramAnnotationEntry[] {
  return updateAnnotationAtIndex(annotations, targetIndex, (annotation) => ({
    ...annotation,
    documentationEntries: updateEntries(annotation.documentationEntries),
  }));
}

/**
 * Creates a button used for documentation and annotation actions in the Docs tab.
 *
 * @param icon - Codicon name to render inside the button
 * @param label - Button label
 * @param onClick - Click handler to invoke
 * @param isDestructive - Whether the action removes data
 * @returns The configured button element
 */
function createActionButton(
  icon: "add" | "trash",
  label: string,
  onClick: () => void,
  isDestructive: boolean = false,
  showLabel: boolean = true
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
 * Renders a single structured annotation section, including its documentation
 * entries plus add/remove controls for both documentation nodes and the annotation.
 *
 * @param node - Draft node currently being edited
 * @param annotation - Annotation entry to render
 * @param annotationIndex - Position of the annotation within the draft node
 * @param dispatchCommand - Callback used to emit schema-edit commands
 * @param rerender - Callback that re-renders the PropertyPanel after structural edits
 * @returns The rendered annotation section element
 */
function createAnnotationSection(
  node: DiagramItem,
  annotation: DiagramAnnotationEntry,
  annotationIndex: number,
  dispatchCommand: (command: SchemaCommand) => void,
  rerender: () => void
): HTMLElement {
  const section = document.createElement("section");
  section.className = "property-docs-section";

  const annotationHeader = document.createElement("div");
  annotationHeader.className = "property-docs-entry-header";
  const annotationLabel = document.createElement("label");
  annotationLabel.textContent = isSchemaDocsTarget(node)
    ? `Annotation ${annotationIndex + 1}:`
    : "Annotation:";
  annotationHeader.appendChild(annotationLabel);
  annotationHeader.appendChild(
    createActionButton(
      "trash",
      "Remove annotation",
      () => {
        dispatchCommand({
          type: "removeAnnotation",
          payload: { annotationId: annotation.id },
        });
        node.documentationAnnotations = normalizeAnnotationEntries(
          getNormalizationOwnerId(node, annotation),
          node.documentationAnnotations.filter((_, index) => index !== annotationIndex)
        );
        syncDocumentationText(node);
        rerender();
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
          dispatchCommand({
            type: "removeDocumentation",
            payload: { documentationId: entry.id },
          });
          const nextAnnotations = updateDocumentationEntriesAtIndex(
            node.documentationAnnotations,
            annotationIndex,
            (entries) => entries.filter((_, entryIndex) => entryIndex !== documentationIndex)
          );
          node.documentationAnnotations = normalizeAnnotationEntries(
            getNormalizationOwnerId(node, annotation),
            nextAnnotations
          );
          syncDocumentationText(node);
          rerender();
        },
        true,
        false
      )
    );
    entryWrapper.appendChild(header);

    const textArea = createEditableTextArea(entry.content, (next) => {
      entry.content = next;
      syncDocumentationText(node);
      dispatchCommand({
        type: "modifyDocumentation",
        payload: { documentationId: entry.id, content: next },
      });
    });
    entryWrapper.appendChild(textArea);

    section.appendChild(entryWrapper);
  });

  section.appendChild(
    createActionButton("add", "Add documentation", () => {
      dispatchCommand({
        type: "addDocumentation",
        payload: {
          targetId: annotation.id,
          content: NEW_DOCUMENTATION_TEXT,
        },
      });
      const nextAnnotations = updateDocumentationEntriesAtIndex(
        node.documentationAnnotations,
        annotationIndex,
        (entries) => [
          ...entries,
          {
            id: buildDocumentationId(annotation.id, entries.length),
            content: NEW_DOCUMENTATION_TEXT,
          },
        ]
      );
      node.documentationAnnotations = normalizeAnnotationEntries(
        getNormalizationOwnerId(node, annotation),
        nextAnnotations
      );
      syncDocumentationText(node);
      rerender();
    })
  );

  return section;
}

/**
 * Creates the structured Docs-tab contents for a selected diagram node.
 *
 * @param node - Draft diagram node currently shown in the PropertyPanel
 * @param dispatchCommand - Callback used to emit schema-edit commands
 * @param rerender - Callback that re-renders the PropertyPanel after structural edits
 * @returns The rendered Docs-tab container
 */
export function createDocsTab(
  node: DiagramItem,
  dispatchCommand: (command: SchemaCommand) => void,
  rerender: () => void
): HTMLElement {
  const root = document.createElement("div");
  root.className = "property-tab-content";

  if (node.documentationAnnotations.length === 0) {
    const targetId = resolveDocumentationTargetId(node);
    if (!targetId) {
      const message = document.createElement("p");
      message.textContent = "Documentation cannot be edited for this node.";
      root.appendChild(message);
      return root;
    }

    root.appendChild(
      createActionButton("add", "Add documentation", () => {
        dispatchCommand({
          type: "addDocumentation",
          payload: { targetId, content: NEW_DOCUMENTATION_TEXT },
        });
        const annotationId = buildAnnotationId(targetId, 0);
        node.documentationAnnotations = normalizeAnnotationEntries(targetId, [
          {
            id: annotationId,
            documentationEntries: [
              {
                id: buildDocumentationId(annotationId, 0),
                content: NEW_DOCUMENTATION_TEXT,
              },
            ],
          },
        ]);
        syncDocumentationText(node);
        rerender();
      })
    );

    if (isSchemaDocsTarget(node)) {
      root.appendChild(
        createActionButton("add", "Add annotation", () => {
          const nextAnnotationIndex = node.documentationAnnotations.length;
           dispatchCommand({
             type: "addAnnotation",
             payload: { targetId: SCHEMA_ROOT_ID },
           });
           node.documentationAnnotations = normalizeAnnotationEntries(SCHEMA_ROOT_ID, [
             ...node.documentationAnnotations,
             { id: `${SCHEMA_ROOT_ID}/annotation[${nextAnnotationIndex}]`, documentationEntries: [] },
           ]);
          rerender();
        })
      );
    }

    return root;
  }

  const annotationsToRender = isSchemaDocsTarget(node)
    ? node.documentationAnnotations
    : node.documentationAnnotations.slice(0, 1);

  annotationsToRender.forEach((annotation, annotationIndex) => {
    root.appendChild(
      createAnnotationSection(node, annotation, annotationIndex, dispatchCommand, rerender)
    );
  });

  if (isSchemaDocsTarget(node)) {
    root.appendChild(
      createActionButton("add", "Add annotation", () => {
        const nextAnnotationIndex = node.documentationAnnotations.length;
        dispatchCommand({
          type: "addAnnotation",
          payload: { targetId: SCHEMA_ROOT_ID },
        });
        node.documentationAnnotations = normalizeAnnotationEntries(SCHEMA_ROOT_ID, [
          ...node.documentationAnnotations,
          { id: `${SCHEMA_ROOT_ID}/annotation[${nextAnnotationIndex}]`, documentationEntries: [] },
        ]);
        rerender();
      })
    );
  }

  return root;
}
