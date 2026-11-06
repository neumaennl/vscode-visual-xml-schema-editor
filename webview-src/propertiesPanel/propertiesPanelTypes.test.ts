/**
 * Unit tests for the type fields of the properties panel.
 */

import { PropertiesPanel } from "./propertiesPanel";
import { DiagramItem } from "../diagram/DiagramItem";
import { Diagram } from "../diagram/Diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { SCHEMA_ROOT_ID, SchemaNodeType, generateSchemaId } from "../../shared/idStrategy";
import { getInputByLabel, hasLabel } from "../__tests__/propertiesPanelTestHelpers";

describe("PropertiesPanel: the type fields", () => {
  let container: HTMLDivElement;
  let panel: PropertiesPanel;
  let diagram: Diagram;

  beforeEach(() => {
    container = document.createElement("div");
    panel = new PropertiesPanel(container);
    diagram = new Diagram();
  });

  test("edits simple type base types through a dedicated Base Type field", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
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

  test("does not dispatch a second command when Base Type blur is unchanged after stale simpleType rename replay", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);

    const initial = new DiagramItem(
      "/simpleType:lengthRestricitionType",
      "lengthRestricitionType",
      DiagramItemType.type,
      diagram
    );
    initial.type = "simpleType (restricts xs:string)";
    panel.display(initial);

    const nameInput = getInputByLabel(container, "Name");
    nameInput.value = "lengthRestrictionType";
    nameInput.dispatchEvent(new Event("blur"));

    // Simulate stale re-display that still references the old node id/name
    // while keeping the same Base Type value.
    const stale = new DiagramItem(
      "/simpleType:lengthRestricitionType",
      "lengthRestricitionType",
      DiagramItemType.type,
      diagram
    );
    stale.type = "simpleType (restricts xs:string)";
    panel.display(stale);

    const baseTypeInput = getInputByLabel(container, "Base Type");
    baseTypeInput.value = "xs:string";
    baseTypeInput.dispatchEvent(new Event("blur"));

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: {
        typeId: "/simpleType:lengthRestricitionType",
        typeName: "lengthRestrictionType",
      },
    });
  });

  test("keeps computed complex type summaries read-only", () => {
    const item = new DiagramItem("/complexType:PersonType", "PersonType", DiagramItemType.type, diagram);
    item.type = "complexType with simpleContent";

    panel.display(item);

    expect(container.textContent).toContain("complexType with simpleContent");
    expect(container.querySelectorAll('input[type="text"]')).toHaveLength(1);
    expect(hasLabel(container, "Base Type")).toBe(false);
    expect(container.textContent).not.toContain("Replacement Type");
  });

  test("keeps non-resolved simple type labels read-only", () => {
    const item = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    item.type = "simpleType";

    panel.display(item);

    expect(container.textContent).toContain("This simpleType does not expose a single base type");
    expect(container.querySelectorAll("input")).toHaveLength(1);
  });

  test("offers known schema types as suggestions while keeping type inputs free-form", () => {
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

  test("uses targetNamespace prefix for local type references when available", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
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

  test("lets elements with inline complex types replace them with an explicit type", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
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

  test("lets elements with inline simple types replace them with an explicit type", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
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

  test("edits inline simple type base types from the selected element", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
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

  test("edits inline complex type extension bases from the selected element", () => {
    const dispatch = vi.fn();
    panel = new PropertiesPanel(container, dispatch);
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
});
