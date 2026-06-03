/**
 * Unit tests for PropertyPanel class.
 */

import { PropertyPanel } from "./propertyPanel";
import { DiagramItem } from "../diagram/DiagramItem";
import { Diagram } from "../diagram/Diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { SCHEMA_ROOT_ID, SchemaNodeType, generateSchemaId } from "../../shared/idStrategy";

function getInputByLabel(container: HTMLElement, label: string): HTMLInputElement {
  const labels = Array.from(container.querySelectorAll("label"));
  const match = labels.find((candidate) => candidate.textContent === `${label}:`);
  expect(match).toBeDefined();
  const input = match?.parentElement?.querySelector("input");
  expect(input).toBeInstanceOf(HTMLInputElement);
  return input as HTMLInputElement;
}

function hasLabel(container: HTMLElement, label: string): boolean {
  return Array.from(container.querySelectorAll("label")).some(
    (candidate) => candidate.textContent === `${label}:`
  );
}

describe("PropertyPanel", () => {
  let container: HTMLDivElement;
  let panel: PropertyPanel;
  let diagram: Diagram;

  beforeEach(() => {
    container = document.createElement("div");
    panel = new PropertyPanel(container);
    diagram = new Diagram();
  });

  it("renders tabs and general values for selected node", () => {
    expect.hasAssertions();
    const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
    item.type = "xs:string";

    panel.display(item);

    expect(container.textContent).toContain("General");
    expect(container.textContent).toContain("Docs");
    expect(container.textContent).toContain("XML");
    expect(getInputByLabel(container, "Name").value).toBe("TestItem");
    expect(getInputByLabel(container, "Type").value).toBe("xs:string");
  });

  it("renders a node-type header above the tab bar", () => {
    expect.hasAssertions();
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);

    panel.display(item);

    const header = container.firstElementChild as HTMLElement;
    expect(header.classList.contains("property-panel-header")).toBe(true);
    expect(header.textContent).toContain("Element");
    expect(header.nextElementSibling?.classList.contains("property-tabs")).toBe(true);
  });

  it("dispatches removeElement when the header delete button is clicked", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);

    panel.display(item);
    const deleteButton = container.querySelector("button[title='Delete node']") as HTMLButtonElement;
    expect(deleteButton.classList.contains("property-docs-action-icon-only")).toBe(true);
    deleteButton.click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "removeElement",
      payload: { elementId: "/element:person" },
    });
  });

  it("dispatches removeGroup when deleting a compositor group", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem(
      "/complexType:PersonType/group:sequence[0]",
      "sequence",
      DiagramItemType.group,
      diagram
    );

    panel.display(item);
    const deleteButton = container.querySelector("button[title='Delete node']") as HTMLButtonElement;
    deleteButton.click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "removeGroup",
      payload: { groupId: "/complexType:PersonType/group:sequence[0]" },
    });
  });

  it("does not render a header delete button for schema nodes", () => {
    expect.hasAssertions();
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);

    panel.display(schemaRoot);

    expect(container.querySelector("button[title='Delete node']")).toBeNull();
  });

  it("renders attributes safely without innerHTML interpolation", () => {
    expect.hasAssertions();
    const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
    item.attributes = [
      { name: "<unsafe>", type: "string", use: "required" },
    ];

    panel.display(item);

    expect(container.textContent).toContain("<unsafe>");
    expect(container.innerHTML).not.toContain("<strong><unsafe></strong>");
  });

  it("shows facet fields when facet tab is selected", () => {
    expect.hasAssertions();
    const item = new DiagramItem("test-1", "TokenType", DiagramItemType.type, diagram);
    item.type = "xs:string";
    item.restrictions = {
      enumeration: ["A", "B"],
      pattern: ["[A-Z]"],
      minLength: 1,
      maxLength: 5,
    };

    panel.display(item);
    const facetsTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Facets"
    );
    facetsTab?.click();

    expect(getInputByLabel(container, "Enumeration").value).toBe("A, B");
    expect(getInputByLabel(container, "Pattern").value).toBe("[A-Z]");
    expect(getInputByLabel(container, "Min Length").value).toBe("1");
    expect(getInputByLabel(container, "Max Length").value).toBe("5");
  });

  it("shows structured docs fields in docs tab", () => {
    expect.hasAssertions();
    const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
    item.documentationAnnotations = [
      {
        id: "test-1",
        documentationEntries: [{ id: "test-1/documentation[0]", content: "Doc text" }],
      },
    ];

    panel.display(item);
    const docsTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Docs"
    );
    docsTab?.click();

    const textarea = container.querySelector("textarea");
    expect(textarea).toBeTruthy();
    expect((textarea as HTMLTextAreaElement).value).toBe("Doc text");
  });

  it("renders annotation delete as an icon-only button next to the annotation label", () => {
    expect.hasAssertions();
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
    const docsTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Docs"
    );
    docsTab?.click();

    const annotationHeader = container.querySelector(".property-docs-section .property-docs-entry-header");
    expect(annotationHeader?.querySelector("label")?.textContent).toBe("Annotation 1:");
    const deleteButton = annotationHeader?.querySelector("button") as HTMLButtonElement;
    expect(deleteButton.classList.contains("property-docs-action-icon-only")).toBe(true);
    expect(deleteButton.title).toBe("Remove annotation");
    expect(deleteButton.textContent?.trim()).toBe("");
  });

  it("preserves multi-line documentation in the docs tab", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
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
    const docsTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Docs"
    );
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

  it("dispatches modifyElement when name is changed", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);

    panel.display(item);
    const input = getInputByLabel(container, "Name");
    input.value = "customer";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyElement",
      payload: { elementId: "/element:person", elementName: "customer" },
    });
  });

  it("shows non-editable name for compositor groups", () => {
    expect.hasAssertions();
    const item = new DiagramItem(
      "/complexType:PersonType/group:sequence[0]",
      "sequence",
      DiagramItemType.group,
      diagram
    );

    panel.display(item);

    const nameRow = Array.from(container.querySelectorAll(".property")).find(
      (row) => row.querySelector("label")?.textContent === "Name:"
    );
    const nameInput = nameRow?.querySelector("input");
    expect(nameInput).toBeNull();
    expect(container.textContent).toContain("Name:");
    expect(container.textContent).toContain("sequence");
  });

  it("dispatches modifyElement when minOccurs is changed", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem("/element:root/element:item[0]", "item", DiagramItemType.element, diagram);
    item.minOccurrence = 1;
    item.maxOccurrence = 3;

    panel.display(item);
    const input = getInputByLabel(container, "minOccurs");
    input.value = "0";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyElement",
      payload: { elementId: "/element:root/element:item[0]", minOccurs: 0, maxOccurs: 3 },
    });
  });

  it("does not show occurrence fields for top-level elements", () => {
    expect.hasAssertions();
    const item = new DiagramItem("/element:item", "item", DiagramItemType.element, diagram);
    item.minOccurrence = 0;
    item.maxOccurrence = 7;

    panel.display(item);

    expect(hasLabel(container, "minOccurs")).toBe(false);
    expect(hasLabel(container, "maxOccurs")).toBe(false);
    expect(hasLabel(container, "Cardinality")).toBe(false);
  });

  it("does not show cardinality fields for schema nodes", () => {
    expect.hasAssertions();
    const item = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);

    panel.display(item);

    expect(hasLabel(container, "minOccurs")).toBe(false);
    expect(hasLabel(container, "maxOccurs")).toBe(false);
    expect(hasLabel(container, "Cardinality")).toBe(false);
  });

  it("does not show cardinality fields for the actual schema root item", () => {
    expect.hasAssertions();
    const item = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.element, diagram);

    panel.display(item);

    expect(hasLabel(container, "minOccurs")).toBe(false);
    expect(hasLabel(container, "maxOccurs")).toBe(false);
    expect(hasLabel(container, "Cardinality")).toBe(false);
  });

  it("does not show cardinality fields for complexType nodes", () => {
    expect.hasAssertions();
    const item = new DiagramItem("/complexType:PersonType", "PersonType", DiagramItemType.type, diagram);

    panel.display(item);

    expect(hasLabel(container, "minOccurs")).toBe(false);
    expect(hasLabel(container, "maxOccurs")).toBe(false);
    expect(hasLabel(container, "Cardinality")).toBe(false);
  });

  it("does not show cardinality fields for simpleType nodes", () => {
    expect.hasAssertions();
    const item = new DiagramItem("/simpleType:CodeType", "CodeType", DiagramItemType.type, diagram);

    panel.display(item);

    expect(hasLabel(container, "minOccurs")).toBe(false);
    expect(hasLabel(container, "maxOccurs")).toBe(false);
    expect(hasLabel(container, "Cardinality")).toBe(false);
  });

  it("dispatches modifyGroup when group cardinality is changed", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem(
      "/complexType:PersonType/group:sequence[0]",
      "sequence",
      DiagramItemType.group,
      diagram
    );
    item.minOccurrence = 1;
    item.maxOccurrence = 3;

    panel.display(item);
    const input = getInputByLabel(container, "minOccurs");
    input.value = "0";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyGroup",
      payload: { groupId: "/complexType:PersonType/group:sequence[0]", minOccurs: 0, maxOccurs: 3 },
    });
  });

  it("dispatches modifyComplexType when complexType constraints are changed", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem("/complexType:PersonType", "PersonType", DiagramItemType.type, diagram);
    item.isAbstract = false;
    item.isMixed = false;

    panel.display(item);

    const abstractRow = Array.from(container.querySelectorAll(".property-toggle-row")).find(
      (row) => row.querySelector(".property-toggle-label")?.textContent === "Abstract"
    );
    const abstractInput = abstractRow?.querySelector("input") as HTMLInputElement;
    abstractInput.checked = true;
    abstractInput.dispatchEvent(new Event("change"));

    const mixedRow = Array.from(container.querySelectorAll(".property-toggle-row")).find(
      (row) => row.querySelector(".property-toggle-label")?.textContent === "Mixed content"
    );
    const mixedInput = mixedRow?.querySelector("input") as HTMLInputElement;
    mixedInput.checked = true;
    mixedInput.dispatchEvent(new Event("change"));

    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: "modifyComplexType",
      payload: { typeId: "/complexType:PersonType", abstract: true },
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: "modifyComplexType",
      payload: { typeId: "/complexType:PersonType", mixed: true },
    });
  });

  it("dispatches modifySimpleType when facets are edited", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem(
      "/simpleType:TokenType",
      "TokenType",
      DiagramItemType.type,
      diagram
    );
    item.type = "simpleType (restricts xs:string)";
    item.restrictions = {
      enumeration: ["A", "B"],
      pattern: ["[A-Z]"],
    };

    panel.display(item);
    const facetsTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Facets"
    );
    facetsTab?.click();

    const input = getInputByLabel(container, "Enumeration");
    input.value = "A, B, C";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: {
        typeId: "/simpleType:TokenType",
        baseType: "xs:string",
        restrictions: {
          enumeration: ["A", "B", "C"],
          pattern: "[A-Z]",
          length: undefined,
          minLength: undefined,
          maxLength: undefined,
          minInclusive: undefined,
          maxInclusive: undefined,
          minExclusive: undefined,
          maxExclusive: undefined,
          totalDigits: undefined,
          fractionDigits: undefined,
          whiteSpace: undefined,
        },
      },
    });
  });

  it("dispatches documentation command from docs tab", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    item.documentationAnnotations = [
      {
        id: "/element:person",
        documentationEntries: [{ id: "/element:person/documentation[0]", content: "Old" }],
      },
    ];

    panel.display(item);
    const docsTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Docs"
    );
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

  it("shows compositor-group documentation in the docs tab", () => {
    expect.hasAssertions();
    const item = new DiagramItem(
      "/complexType:PersonType/group:sequence[0]",
      "sequence",
      DiagramItemType.group,
      diagram
    );
    item.documentationAnnotations = [
      {
        id: "/complexType:PersonType/group:sequence[0]",
        documentationEntries: [
          {
            id: "/complexType:PersonType/group:sequence[0]/documentation[0]",
            content: "Compositor docs",
          },
        ],
      },
    ];

    panel.display(item);
    const docsTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Docs"
    );
    docsTab?.click();

    const textarea = container.querySelector<HTMLTextAreaElement>("textarea");
    expect(textarea).not.toBeNull();
    expect(textarea?.value).toBe("Compositor docs");
  });

  it("adds schema-root documentation through the structured docs flow", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);

    panel.display(item);
    const docsTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Docs"
    );
    docsTab?.click();

    const addDocumentationButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Add documentation")
    );
    addDocumentationButton?.click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "addDocumentation",
      payload: { targetId: SCHEMA_ROOT_ID, content: "New documentation" },
    });

    const textarea = container.querySelector<HTMLTextAreaElement>("textarea");
    expect(textarea?.value).toBe("New documentation");
  });

  it("renders structured annotations and supports adding/removing documentation entries", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    item.documentationAnnotations = [
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
    item.documentation = "First doc\nSecond doc\nThird doc";

    panel.display(item);
    const docsTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Docs"
    );
    docsTab?.click();

    const textareas = Array.from(container.querySelectorAll("textarea"));
    expect(textareas).toHaveLength(3);
    expect(container.textContent).toContain("Annotation 1");
    expect(container.textContent).toContain("Annotation 2");

    const addDocumentationButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Add documentation")
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

  it("lets the schema add additional annotation sections in the docs tab", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
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
    const docsTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Docs"
    );
    docsTab?.click();

    const addAnnotationButton = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Add annotation")
    );
    addAnnotationButton?.click();

    expect(dispatch).toHaveBeenCalledWith({
      type: "addAnnotation",
      payload: { targetId: SCHEMA_ROOT_ID },
    });
    expect(container.textContent).toContain("Annotation 2");
  });

  it("shows the Facets tab for simple type nodes and elements with inline simple types", () => {
    expect.hasAssertions();
    const element = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    element.type = "xs:string";

    panel.display(element);
    expect(container.textContent).not.toContain("Facets");

    const simpleType = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    simpleType.type = "simpleType (restricts xs:string)";
    simpleType.restrictions = { minLength: 1 };

    panel.display(simpleType);
    expect(container.textContent).toContain("Facets");

    const inlineSimple = new DiagramItem("/element:code", "code", DiagramItemType.element, diagram);
    inlineSimple.type = "<anonymous simpleType> (restricts xs:string)";
    inlineSimple.isSimpleContent = true;
    inlineSimple.restrictions = { minLength: 1 };

    panel.display(inlineSimple);
    expect(container.textContent).toContain("Facets");
  });

  it("edits simple type base types through a dedicated Base Type field", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    item.type = "simpleType (restricts xs:string)";

    panel.display(item);

    const input = getInputByLabel(container, "Base Type");
    input.value = "xs:token";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: {
        typeId: "/simpleType:TokenType",
        baseType: "xs:token",
      },
    });
  });

  it("keeps computed complex type summaries read-only", () => {
    expect.hasAssertions();
    const item = new DiagramItem("/complexType:PersonType", "PersonType", DiagramItemType.type, diagram);
    item.type = "complexType with simpleContent";

    panel.display(item);

    expect(container.textContent).toContain("complexType with simpleContent");
    expect(container.querySelectorAll('input[type="text"]')).toHaveLength(1);
    expect(hasLabel(container, "Base Type")).toBe(false);
    expect(container.textContent).not.toContain("Replacement Type");
  });

  it("keeps non-resolved simple type labels read-only", () => {
    expect.hasAssertions();
    const item = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    item.type = "simpleType";

    panel.display(item);

    expect(container.textContent).toContain("This simpleType does not expose a single base type");
    expect(container.querySelectorAll("input")).toHaveLength(1);
  });

  it("offers known schema types as suggestions while keeping type inputs free-form", () => {
    expect.hasAssertions();
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    diagram.currentSchemaPrefix = "tns";
    const customerType = new DiagramItem(
      generateSchemaId({ nodeType: SchemaNodeType.ComplexType, name: "CustomerType" }),
      "CustomerType",
      DiagramItemType.type,
      diagram
    );
    customerType.type = "complexType";
    schemaRoot.addChild(customerType);
    diagram.addRootElement(schemaRoot);

    const item = new DiagramItem("/element:customer", "customer", DiagramItemType.element, diagram);
    item.type = "xs:string";

    panel.display(item);

    const input = getInputByLabel(container, "Type");
    const listId = input.getAttribute("list");
    expect(listId).toBeTruthy();
    const options = Array.from(container.querySelectorAll(`datalist#${listId} option`)).map(
      (option) => (option as HTMLOptionElement).value
    );
    expect(options).toContain("xs:string");
    expect(options).toContain("CustomerType");
    expect(options).toContain("tns:CustomerType");
  });

  it("uses targetNamespace prefix for local type references when available", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    diagram.currentSchemaPrefix = "tns";
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    const customerType = new DiagramItem(
      generateSchemaId({ nodeType: SchemaNodeType.ComplexType, name: "CustomerType" }),
      "CustomerType",
      DiagramItemType.type,
      diagram
    );
    customerType.type = "complexType";
    schemaRoot.addChild(customerType);
    diagram.addRootElement(schemaRoot);

    const item = new DiagramItem("/element:customer", "customer", DiagramItemType.element, diagram);
    item.type = "xs:string";

    panel.display(item);

    const input = getInputByLabel(container, "Type");
    input.value = "CustomerType";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyElement",
      payload: {
        elementId: "/element:customer",
        elementType: "tns:CustomerType",
      },
    });
  });

  it("shows editable targetNamespace and namespace declarations for the schema node", () => {
    expect.hasAssertions();
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    diagram.schemaTargetNamespace = "http://example.com/original";
    diagram.schemaNamespacePrefixes = {
      xs: "http://www.w3.org/2001/XMLSchema",
      tns: "http://example.com/original",
    };

    panel.display(schemaRoot);

    expect(getInputByLabel(container, "targetNamespace").value).toBe("http://example.com/original");
    expect(container.querySelectorAll(".property-namespace-row").length).toBe(2);
  });

  it("updates the matching namespace declaration when targetNamespace changes", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    diagram.schemaTargetNamespace = "http://example.com/original";
    diagram.schemaNamespacePrefixes = {
      xs: "http://www.w3.org/2001/XMLSchema",
      tns: "http://example.com/original",
    };
    diagram.currentSchemaPrefix = "tns";

    panel.display(schemaRoot);

    const input = getInputByLabel(container, "targetNamespace");
    input.value = "http://example.com/updated";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySchemaNamespaces",
      payload: {
        targetNamespace: "http://example.com/updated",
        namespacePrefixes: {
          xs: "http://www.w3.org/2001/XMLSchema",
          tns: "http://example.com/updated",
        },
        previousNamespacePrefixes: {
          xs: "http://www.w3.org/2001/XMLSchema",
          tns: "http://example.com/original",
        },
      },
    });
  });

  it("updates targetNamespace when the corresponding namespace declaration URI changes", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const schemaRoot = new DiagramItem(SCHEMA_ROOT_ID, "schema", DiagramItemType.group, diagram);
    diagram.schemaTargetNamespace = "http://example.com/original";
    diagram.schemaNamespacePrefixes = {
      xs: "http://www.w3.org/2001/XMLSchema",
      tns: "http://example.com/original",
    };

    panel.display(schemaRoot);

    const targetNamespaceRow = Array.from(container.querySelectorAll(".property-namespace-row")).find(
      (row) => {
        const prefixInput = row.querySelector("input[placeholder='prefix']");
        return prefixInput instanceof HTMLInputElement && prefixInput.value === "tns";
      }
    );
    expect(targetNamespaceRow).toBeTruthy();
    const namespaceUriInput = targetNamespaceRow?.querySelector(
      "input[placeholder='namespace URI']"
    ) as HTMLInputElement;
    namespaceUriInput.value = "http://example.com/updated";
    namespaceUriInput.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySchemaNamespaces",
      payload: {
        targetNamespace: "http://example.com/updated",
        namespacePrefixes: {
          xs: "http://www.w3.org/2001/XMLSchema",
          tns: "http://example.com/updated",
        },
        previousNamespacePrefixes: {
          xs: "http://www.w3.org/2001/XMLSchema",
          tns: "http://example.com/original",
        },
      },
    });
  });

  it("lets elements with inline complex types replace them with an explicit type", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    item.type = "complexType";
    item.hasAnonymousComplexType = true;

    panel.display(item);

    expect(container.textContent).toContain("Inline complexType");
    expect(hasLabel(container, "Base Type")).toBe(true);

    const replacementInput = getInputByLabel(container, "Replacement Type");
    replacementInput.value = "CustomerType";
    replacementInput.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyElement",
      payload: {
        elementId: "/element:person",
        elementType: "CustomerType",
      },
    });
  });

  it("lets elements with inline simple types replace them with an explicit type", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem("/element:code", "code", DiagramItemType.element, diagram);
    item.type = "<anonymous simpleType> (restricts xs:string)";
    item.isSimpleContent = true;

    panel.display(item);

    expect(container.textContent).toContain("Inline simpleType (restricts xs:string)");
    expect(hasLabel(container, "Base Type")).toBe(true);

    const replacementInput = getInputByLabel(container, "Replacement Type");
    expect(replacementInput.value).toBe("xs:string");
    replacementInput.value = "CustomerCodeType";
    replacementInput.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyElement",
      payload: {
        elementId: "/element:code",
        elementType: "CustomerCodeType",
      },
    });
  });

  it("edits inline simple type base types from the selected element", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem("/element:code", "code", DiagramItemType.element, diagram);
    item.type = "<anonymous simpleType> (restricts xs:string)";
    item.isSimpleContent = true;

    panel.display(item);

    const input = getInputByLabel(container, "Base Type");
    input.value = "xs:token";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: {
        typeId: generateSchemaId({
          nodeType: SchemaNodeType.AnonymousSimpleType,
          parentId: "/element:code",
          position: 0,
        }),
        baseType: "xs:token",
      },
    });
  });

  it("edits inline complex type extension bases from the selected element", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    item.type = "<anonymous complexType> (extends BasePersonType)";
    item.hasAnonymousComplexType = true;

    panel.display(item);

    const input = getInputByLabel(container, "Base Type");
    input.value = "EmployeeType";
    input.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyComplexType",
      payload: {
        typeId: generateSchemaId({
          nodeType: SchemaNodeType.AnonymousComplexType,
          parentId: "/element:person",
          position: 0,
        }),
        baseType: "EmployeeType",
        derivationKind: "extension",
      },
    });
  });

  it("limits non-schema docs editing to a single annotation section", () => {
    expect.hasAssertions();
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
    const docsTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Docs"
    );
    docsTab?.click();

    const textareas = Array.from(container.querySelectorAll("textarea"));
    expect(textareas).toHaveLength(1);
    expect(textareas[0].value).toBe("First doc");
    expect(container.textContent).not.toContain("Annotation 2");
    expect(container.textContent).not.toContain("Add annotation");
  });

  it("renders documentation delete as an icon-only button next to the label with a tooltip", () => {
    expect.hasAssertions();
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    item.documentationAnnotations = [
      {
        id: "/element:person",
        documentationEntries: [{ id: "/element:person/documentation[0]", content: "Doc text" }],
      },
    ];

    panel.display(item);
    const docsTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Docs"
    );
    docsTab?.click();

    const header = container.querySelector(".property-docs-entry .property-docs-entry-header");
    expect(header).toBeTruthy();
    const deleteButton = header?.querySelector("button") as HTMLButtonElement;
    expect(deleteButton).toBeTruthy();
    expect(deleteButton.classList.contains("property-docs-action-icon-only")).toBe(true);
    expect(deleteButton.title).toBe("Remove documentation");
    expect(deleteButton.textContent?.trim()).toBe("");
  });

  it("keeps edited draft values visible when switching tabs", () => {
    expect.hasAssertions();
    const dispatch = jest.fn();
    panel = new PropertyPanel(container, dispatch);
    const item = new DiagramItem("/element:root/element:item[0]", "item", DiagramItemType.element, diagram);
    item.minOccurrence = 1;
    item.maxOccurrence = 3;

    panel.display(item);
    const input = getInputByLabel(container, "maxOccurs");
    input.value = "7";
    input.dispatchEvent(new Event("blur"));

    const xmlTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "XML"
    );
    xmlTab?.click();

    const xmlPreview = container.querySelector("pre");
    expect(xmlPreview?.textContent).toContain('"maxOccurs": 7');

    const generalTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "General"
    );
    generalTab?.click();

    expect(getInputByLabel(container, "maxOccurs").value).toBe("7");
  });

  it("only renders editable controls for existing facets", () => {
    expect.hasAssertions();
    const item = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    item.type = "simpleType (restricts xs:string)";
    item.restrictions = {
      minLength: 1,
      maxLength: 5,
    };

    panel.display(item);
    const facetsTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Facets"
    );
    facetsTab?.click();

    expect(getInputByLabel(container, "Min Length").value).toBe("1");
    expect(getInputByLabel(container, "Max Length").value).toBe("5");
    expect(hasLabel(container, "Pattern")).toBe(false);
    expect(hasLabel(container, "Enumeration")).toBe(false);
  });

  it("shows a palette hint when no facets exist yet", () => {
    expect.hasAssertions();
    const item = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    item.type = "simpleType (restricts xs:string)";
    item.restrictions = {};

    panel.display(item);
    const facetsTab = Array.from(container.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Facets"
    );
    facetsTab?.click();

    expect(container.textContent).toContain("This type has no facets yet");
  });

  it("clear removes all rendered content", () => {
    expect.hasAssertions();
    const item = new DiagramItem("test-1", "TestItem", DiagramItemType.element, diagram);
    panel.display(item);

    panel.clear();

    expect(container.innerHTML).toBe("");
  });
});
