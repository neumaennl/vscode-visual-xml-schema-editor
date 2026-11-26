/**
 * Unit tests for the Docs tab of the properties panel, which edits the annotations and the
 * documentation of a node.
 */

import type { Mock } from "vitest";
import { createDocsTab } from "./propertiesPanelDocs";
import type { SchemaCommand } from "../../shared/types";
import { DiagramItem, DiagramItemType } from "../diagram";
import { diagramItem, muteDiagramBuilderLog, emptyDiagram } from "../__tests__/diagramTestHelpers";
import { editInput, getInputByLabel } from "../__tests__/propertiesPanelTestHelpers";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";

/**
 * Three annotations of the schema, the first with two documentation entries, the second with one and
 * the third with none, and an element with one documentation entry.
 */
const DOCUMENTED = `<xs:annotation><xs:documentation>First doc</xs:documentation><xs:documentation>Second doc</xs:documentation></xs:annotation>
<xs:annotation><xs:documentation>Third doc</xs:documentation></xs:annotation>
<xs:annotation/>
<xs:element name="person"><xs:annotation><xs:documentation>Person doc</xs:documentation></xs:annotation></xs:element>`;

/** Undocumented nodes of every kind that the Docs tab shows. */
const UNDOCUMENTED = `<xs:element name="plain" type="xs:string"/>
<xs:element name="code"><xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType></xs:element>
<xs:element name="person"><xs:complexType><xs:sequence><xs:group ref="Contact"/></xs:sequence></xs:complexType></xs:element>
<xs:simpleType name="Word"><xs:restriction base="xs:string"/></xs:simpleType>
<xs:complexType name="PersonType"><xs:sequence/></xs:complexType>
<xs:group name="Contact"><xs:choice/></xs:group>`;

/** The Docs tab of a node, the node, and the mock that receives its commands. */
interface DocsTab {
  tab: HTMLElement;
  node: DiagramItem;
  dispatch: Mock<(command: SchemaCommand) => void>;
}

/**
 * Renders the Docs tab of the diagram item with the given ID in the diagram of a schema.
 *
 * @param body - The content of the schema
 * @param id - The ID of the item
 * @returns The tab, the item and the mock
 */
function renderDocs(body: string, id: string): DocsTab {
  const node = diagramItem(webviewSchemaWith(body), id);
  const dispatch = vi.fn<(command: SchemaCommand) => void>();
  return { tab: createDocsTab(node, dispatch), node, dispatch };
}

/**
 * Returns the buttons of the tab with the given label, which icon-only buttons only have as their
 * accessible name.
 *
 * @param tab - The Docs tab
 * @param label - The label of the buttons
 * @returns The buttons, in document order
 */
function buttonsLabeled(tab: HTMLElement, label: string): HTMLButtonElement[] {
  return Array.from(tab.querySelectorAll("button")).filter((button) => button.getAttribute("aria-label") === label);
}

/**
 * Returns the texts of the labels of the tab.
 *
 * @param tab - The Docs tab
 * @returns The texts, in document order
 */
function labelTexts(tab: HTMLElement): string[] {
  return Array.from(tab.querySelectorAll("label")).map((label) => label.textContent);
}

describe("createDocsTab", () => {
  muteDiagramBuilderLog();

  describe("showing the documentation", () => {
    test("should show every annotation of the schema with its documentation entries", () => {
      const { tab } = renderDocs(DOCUMENTED, "/schema");

      expect(labelTexts(tab)).toEqual([
        "Annotation 1:",
        "Documentation 1:",
        "Language:",
        "Documentation 2:",
        "Language:",
        "Annotation 2:",
        "Documentation 1:",
        "Language:",
        "Annotation 3:",
      ]);
      expect(Array.from(tab.querySelectorAll("textarea"), (textArea) => textArea.value)).toEqual([
        "First doc",
        "Second doc",
        "Third doc",
      ]);
      expect(tab.textContent).toContain("This annotation has no documentation nodes yet.");
      expect(buttonsLabeled(tab, "Add annotation")).toHaveLength(1);
    });

    test("should show the annotation of another node without a number and offer no further annotation", () => {
      const { tab } = renderDocs(DOCUMENTED, "/element:person");

      expect(labelTexts(tab)).toEqual(["Annotation:", "Documentation 1:", "Language:"]);
      expect(tab.querySelector("textarea")?.value).toBe("Person doc");
      expect(buttonsLabeled(tab, "Add annotation")).toHaveLength(0);
    });

    test.each(["Remove annotation", "Remove documentation"])("should show '%s' as an icon with a tooltip", (label) => {
      const [button] = buttonsLabeled(renderDocs(DOCUMENTED, "/element:person").tab, label);

      expect(button!.classList).toContain("property-docs-action-icon-only");
      expect(button!.classList).toContain("property-docs-action-destructive");
      expect(button!.title).toBe(label);
      expect(button!.textContent).toBe("");
    });

    test("should show 'Add documentation' with its text", () => {
      const [button] = buttonsLabeled(renderDocs(DOCUMENTED, "/element:person").tab, "Add documentation");

      expect(button!.classList).not.toContain("property-docs-action-icon-only");
      expect(button!.textContent).toBe("Add documentation");
    });
  });

  describe("editing the documentation", () => {
    test("should send a changed documentation entry when its field is left", () => {
      const { tab, dispatch } = renderDocs(DOCUMENTED, "/element:person");
      const textArea = tab.querySelector("textarea")!;

      textArea.value = "Line one\nLine two";
      textArea.dispatchEvent(new FocusEvent("blur"));

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifyDocumentation",
        payload: { documentationId: "/element:person/documentation[0]", content: "Line one\nLine two" },
      });
    });

    test.each([
      { id: "/schema", annotation: 1, targetId: "/schema/annotation[1]" },
      { id: "/element:person", annotation: 0, targetId: "/element:person" },
    ])("should add a documentation entry to the annotation $targetId", ({ id, annotation, targetId }) => {
      const { tab, dispatch } = renderDocs(DOCUMENTED, id);

      buttonsLabeled(tab, "Add documentation")[annotation]!.click();

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "addDocumentation",
        payload: { targetId, content: "New documentation" },
      });
    });

    test("should remove a documentation entry", () => {
      const { tab, dispatch } = renderDocs(DOCUMENTED, "/schema");

      buttonsLabeled(tab, "Remove documentation")[0]!.click();

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "removeDocumentation",
        payload: { documentationId: "/schema/annotation[0]/documentation[0]" },
      });
    });
  });

  describe("editing the language", () => {
    /** An element whose documentation is in German. */
    const GERMAN = `<xs:element name="person"><xs:annotation><xs:documentation xml:lang="de">Person</xs:documentation></xs:annotation></xs:element>`;

    test("should show the language of a documentation entry", () => {
      const { tab } = renderDocs(GERMAN, "/element:person");

      expect(getInputByLabel(tab, "Language").value).toBe("de");
    });

    test.each([
      ["change the language", " de-CH ", "de-CH"],
      ["remove the language when the field is emptied", "", ""],
    ])("should %s", (_case, value, lang) => {
      const { tab, dispatch } = renderDocs(GERMAN, "/element:person");

      editInput(tab, "Language", value);

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifyDocumentation",
        payload: { documentationId: "/element:person/documentation[0]", lang },
      });
    });

    test("should send nothing when the language is entered again", () => {
      const { tab, dispatch } = renderDocs(GERMAN, "/element:person");

      editInput(tab, "Language", " de ");

      expect(dispatch).not.toHaveBeenCalled();
    });

    test("should reject a value that is no language code, with a message", () => {
      const { tab, dispatch } = renderDocs(GERMAN, "/element:person");

      editInput(tab, "Language", "de_CH");

      expect(dispatch).not.toHaveBeenCalled();
      expect(getInputByLabel(tab, "Language").value).toBe("de");
      expect(getInputByLabel(tab, "Language").parentElement?.querySelector(".property-message")?.textContent).toBe(
        "Language must be a language code such as en or de-CH"
      );
    });
  });

  describe("editing the annotations", () => {
    test("should remove an annotation of the schema", () => {
      const { tab, dispatch } = renderDocs(DOCUMENTED, "/schema");

      buttonsLabeled(tab, "Remove annotation")[0]!.click();

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "removeAnnotation",
        payload: { annotationId: "/schema/annotation[0]" },
      });
    });

    test("should remove the annotation of another node", () => {
      const { tab, dispatch } = renderDocs(DOCUMENTED, "/element:person");

      buttonsLabeled(tab, "Remove annotation")[0]!.click();

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "removeAnnotation",
        payload: { annotationId: "/element:person" },
      });
    });

    test("should add an empty annotation to the schema", () => {
      const { tab, dispatch } = renderDocs(DOCUMENTED, "/schema");

      buttonsLabeled(tab, "Add annotation")[0]!.click();

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: "addAnnotation", payload: { targetId: "/schema" } });
    });
  });

  describe("adding the first documentation", () => {
    test.each([
      { id: "/schema", targetId: "/schema" },
      { id: "/element:plain", targetId: "/element:plain" },
      // The documentation of an anonymous type goes to the type, where the diagram builder also reads it
      { id: "/element:code", targetId: "/element:code/anonymousSimpleType[0]" },
      { id: "/element:person", targetId: "/element:person/anonymousComplexType[0]" },
      { id: "/simpleType:Word", targetId: "/simpleType:Word" },
      { id: "/complexType:PersonType", targetId: "/complexType:PersonType" },
      { id: "/group:Contact", targetId: "/group:Contact" },
      { id: "/group:Contact/choice[0]", targetId: "/group:Contact/choice[0]" },
      {
        id: "/element:person/anonymousComplexType[0]/sequence[0]/groupRef:Contact[0]",
        targetId: "/element:person/anonymousComplexType[0]/sequence[0]/groupRef:Contact[0]",
      },
    ])("should send documentation for $id to $targetId", ({ id, targetId }) => {
      const { tab, dispatch } = renderDocs(UNDOCUMENTED, id);

      buttonsLabeled(tab, "Add documentation")[0]!.click();

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "addDocumentation",
        payload: { targetId, content: "New documentation" },
      });
    });

    test("should reject a node that documentation cannot be added to, which the diagram does not have", () => {
      // An attribute is no node of the diagram; its ID stands for any node without a documentation target
      const node = new DiagramItem("/complexType:T/attribute:a", "a", DiagramItemType.element, {}, emptyDiagram());

      expect(() => createDocsTab(node, vi.fn())).toThrow("Documentation cannot be added to /complexType:T/attribute:a");
    });

    test("should also offer an empty annotation for the schema", () => {
      const { tab } = renderDocs(UNDOCUMENTED, "/schema");

      expect(buttonsLabeled(tab, "Add documentation")).toHaveLength(1);
      expect(buttonsLabeled(tab, "Add annotation")).toHaveLength(1);
    });
  });
});
