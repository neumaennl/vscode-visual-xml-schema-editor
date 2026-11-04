/**
 * Unit tests for the Docs tab of the properties panel.
 */

import { PropertiesPanel } from "./propertiesPanel";
import { DiagramItem } from "../diagram/DiagramItem";
import { Diagram } from "../diagram/Diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { SCHEMA_ROOT_ID } from "../../shared/idStrategy";
import { findButton } from "../__tests__/propertiesPanelTestHelpers";

/** Two annotations of the schema, the first with two documentation entries and the second with one. */
const TWO_SCHEMA_ANNOTATIONS = [
  {
    id: `${SCHEMA_ROOT_ID}/annotation[0]`,
    documentationEntries: [
      { id: `${SCHEMA_ROOT_ID}/annotation[0]/documentation[0]`, content: "First doc" },
      { id: `${SCHEMA_ROOT_ID}/annotation[0]/documentation[1]`, content: "Second doc" },
    ],
  },
  {
    id: `${SCHEMA_ROOT_ID}/annotation[1]`,
    documentationEntries: [
      { id: `${SCHEMA_ROOT_ID}/annotation[1]/documentation[0]`, content: "Third doc" },
    ],
  },
];

describe("PropertiesPanel: the Docs tab", () => {
  let container: HTMLDivElement;
  let panel: PropertiesPanel;
  let diagram: Diagram;

  beforeEach(() => {
    container = document.createElement("div");
    panel = new PropertiesPanel(container);
    diagram = new Diagram();
  });

  test("shows structured docs fields in docs tab", () => {
    const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
    item.documentationAnnotations = [
      {
        id: "test-1",
        documentationEntries: [{ id: "test-1/documentation[0]", content: "Doc text" }],
      },
    ];

    panel.display(item);
    const docsTab = findButton(container, "Docs");
    docsTab?.click();

    const textarea = container.querySelector("textarea");
    expect(textarea).toBeTruthy();
    expect((textarea as HTMLTextAreaElement).value).toBe("Doc text");
  });

  test("renders annotation delete as an icon-only button next to the annotation label", () => {
    const item = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    item.documentationAnnotations = [
      {
        id: `${SCHEMA_ROOT_ID}/annotation[0]`,
        documentationEntries: [
          { id: `${SCHEMA_ROOT_ID}/annotation[0]/documentation[0]`, content: "Doc text" },
        ],
      },
    ];

    panel.display(item);
    const docsTab = findButton(container, "Docs");
    docsTab?.click();

    const annotationHeader = container.querySelector(".property-docs-section .property-docs-entry-header");
    expect(annotationHeader?.querySelector("label")?.textContent).toBe("Annotation 1:");
    const deleteButton = annotationHeader?.querySelector("button") as HTMLButtonElement;
    expect(deleteButton.classList.contains("property-docs-action-icon-only")).toBe(true);
    expect(deleteButton.title).toBe("Remove annotation");
    expect(deleteButton.textContent.trim()).toBe("");
  });

  test("preserves multi-line documentation in the docs tab", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    item.documentationAnnotations = [
      {
        id: "/element:person",
        documentationEntries: [
          {
            id: "/element:person/documentation[0]",
            content: "Annotation one\nAnnotation two\nAnnotation three",
          },
        ],
      },
    ];

    panel.display(item);
    const docsTab = findButton(container, "Docs");
    docsTab?.click();

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Annotation one\nAnnotation two\nAnnotation three");

    textarea.dispatchEvent(new Event("blur"));
    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyDocumentation",
      payload: {
        documentationId: "/element:person/documentation[0]",
        content: "Annotation one\nAnnotation two\nAnnotation three",
      },
    });
  });

  test("dispatches documentation command from docs tab", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    item.documentationAnnotations = [
      {
        id: "/element:person",
        documentationEntries: [{ id: "/element:person/documentation[0]", content: "Old" }],
      },
    ];

    panel.display(item);
    const docsTab = findButton(container, "Docs");
    docsTab?.click();

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "Updated docs";
    textarea.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyDocumentation",
      payload: { documentationId: "/element:person/documentation[0]", content: "Updated docs" },
    });
    expect(container.textContent).not.toContain("Save Documentation");
  });

  test.each(["sequence", "choice", "all"] as const)(
    "shows %s compositor documentation in the docs tab",
    (compositor) => {
      const compositorId = `/complexType:PersonType/group:${compositor}[0]`;
      const item = new DiagramItem(compositorId, compositor, DiagramItemType.group, diagram);
      item.documentationAnnotations = [
        {
          id: compositorId,
          documentationEntries: [
            {
              id: `${compositorId}/documentation[0]`,
              content: "Compositor docs",
            },
          ],
        },
      ];

      panel.display(item);
      const docsTab = findButton(container, "Docs");
      docsTab?.click();

      const textarea = container.querySelector<HTMLTextAreaElement>("textarea");
      expect(textarea).not.toBeNull();
      expect(textarea?.value).toBe("Compositor docs");
    }
  );

  test("adds schema-root documentation through the structured docs flow", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);

    panel.display(item);
    const docsTab = findButton(container, "Docs");
    docsTab?.click();

    const addDocumentationButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent.includes("Add documentation")
    );
    addDocumentationButton?.click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "addDocumentation",
      payload: { targetId: SCHEMA_ROOT_ID, content: "New documentation" },
    });

    const textarea = container.querySelector<HTMLTextAreaElement>("textarea");
    expect(textarea?.value).toBe("New documentation");
  });

  test("renders structured annotations and supports adding/removing documentation entries", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    item.documentationAnnotations = TWO_SCHEMA_ANNOTATIONS;
    item.documentation = "First doc\nSecond doc\nThird doc";

    panel.display(item);
    const docsTab = findButton(container, "Docs");
    docsTab?.click();

    const textareas = Array.from(container.querySelectorAll("textarea"));
    expect(textareas).toHaveLength(3);
    expect(container.textContent).toContain("Annotation 1");
    expect(container.textContent).toContain("Annotation 2");

    const addDocumentationButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent.includes("Add documentation")
    );
    addDocumentationButton?.click();

    expect(dispatch).toHaveBeenCalledWith({
        type: "addDocumentation",
        payload: {
          targetId: `${SCHEMA_ROOT_ID}/annotation[0]`,
          content: "New documentation",
        },
      });

    const removeDocumentationButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.title === "Remove documentation"
    );
    removeDocumentationButton?.click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "removeDocumentation",
      payload: { documentationId: `${SCHEMA_ROOT_ID}/annotation[0]/documentation[0]` },
    });
  });

  test("lets the schema add additional annotation sections in the docs tab", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
    const item = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    item.documentationAnnotations = [
      {
        id: `${SCHEMA_ROOT_ID}/annotation[0]`,
        documentationEntries: [
          { id: `${SCHEMA_ROOT_ID}/annotation[0]/documentation[0]`, content: "Root documentation" },
        ],
      },
    ];

    panel.display(item);
    const docsTab = findButton(container, "Docs");
    docsTab?.click();

    const addAnnotationButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent.includes("Add annotation")
    );
    addAnnotationButton?.click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "addAnnotation",
      payload: { targetId: SCHEMA_ROOT_ID },
    });
    expect(container.textContent).toContain("Annotation 2");
  });

  test("limits non-schema docs editing to a single annotation section", () => {
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    item.documentationAnnotations = [
      {
        id: "/element:person",
        documentationEntries: [{ id: "/element:person/documentation[0]", content: "First doc" }],
      },
      {
        id: "/element:person/annotation[1]",
        documentationEntries: [{ id: "/element:person/annotation[1]/documentation[0]", content: "Second doc" }],
      },
    ];

    panel.display(item);
    const docsTab = findButton(container, "Docs");
    docsTab?.click();

    const textareas = Array.from(container.querySelectorAll("textarea"));
    expect(textareas).toHaveLength(1);
    expect(textareas[0].value).toBe("First doc");
    expect(container.textContent).not.toContain("Annotation 2");
    expect(container.textContent).not.toContain("Add annotation");
  });

  test("renders documentation delete as an icon-only button next to the label with a tooltip", () => {
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    item.documentationAnnotations = [
      {
        id: "/element:person",
        documentationEntries: [{ id: "/element:person/documentation[0]", content: "Doc text" }],
      },
    ];

    panel.display(item);
    const docsTab = findButton(container, "Docs");
    docsTab?.click();

    const header = container.querySelector(".property-docs-entry .property-docs-entry-header");
    expect(header).toBeTruthy();
    const deleteButton = header?.querySelector("button") as HTMLButtonElement;
    expect(deleteButton).toBeTruthy();
    expect(deleteButton.classList.contains("property-docs-action-icon-only")).toBe(true);
    expect(deleteButton.title).toBe("Remove documentation");
    expect(deleteButton.textContent.trim()).toBe("");
  });
});
