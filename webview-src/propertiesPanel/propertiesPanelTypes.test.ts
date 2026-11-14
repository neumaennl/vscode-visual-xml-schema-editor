/**
 * Unit tests for the type fields of the properties panel.
 */

import { DiagramItem } from "../diagram/DiagramItem";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { SCHEMA_ROOT_ID, SchemaNodeType, generateSchemaId } from "../../shared/idStrategy";
import { getInputByLabel, hasLabel, createPanel, displayItem, editInput } from "../__tests__/propertiesPanelTestHelpers";

describe("PropertiesPanel: the type fields", () => {
  let { container, panel, diagram } = createPanel();

  beforeEach(() => {
    ({ container, panel, diagram } = createPanel());
  });

  /**
   * Adds a complex type `CustomerType` to the diagram, whose schema has the prefix `tns`, and returns an element
   * `customer` of type `xs:string`.
   *
   * @returns The element
   */
  function customerWithCustomerType(): DiagramItem {
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
    return item;
  }

  test("edits simple type base types through a dedicated Base Type field", () => {
    const item = new DiagramItem("/simpleType:TokenType", "TokenType", DiagramItemType.type, diagram);
    item.type = "simpleType (restricts xs:string)";

    const { dispatch } = displayItem(container, item);

    editInput(container, "Base Type", "xs:token");

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifySimpleType",
      payload: {
        typeId: "/simpleType:TokenType",
        baseType: "xs:token",
      },
    });
  });

  test("does not dispatch a second command when Base Type blur is unchanged after stale simpleType rename replay", () => {

    const initial = new DiagramItem(
      "/simpleType:lengthRestricitionType",
      "lengthRestricitionType",
      DiagramItemType.type,
      diagram
    );
    initial.type = "simpleType (restricts xs:string)";
    const { panel: shownPanel, dispatch } = displayItem(container, initial);

    editInput(container, "Name", "lengthRestrictionType");

    // Simulate stale re-display that still references the old node id/name
    // while keeping the same Base Type value.
    const stale = new DiagramItem(
      "/simpleType:lengthRestricitionType",
      "lengthRestricitionType",
      DiagramItemType.type,
      diagram
    );
    stale.type = "simpleType (restricts xs:string)";
    shownPanel.display(stale);

    editInput(container, "Base Type", "xs:string");

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
    const item = customerWithCustomerType();

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
    const item = customerWithCustomerType();

    const { dispatch } = displayItem(container, item);

    editInput(container, "Type", "CustomerType");

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyElement",
      payload: {
        elementId: "/element:customer",
        elementType: "tns:CustomerType",
      },
    });
  });

  test("lets elements with inline complex types replace them with an explicit type", () => {
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    item.type = "complexType";
    item.hasAnonymousComplexType = true;

    const { dispatch } = displayItem(container, item);

    expect(container.textContent).toContain("Inline complexType");
    expect(hasLabel(container, "Base Type")).toBe(true);

    editInput(container, "Replacement Type", "CustomerType");

    expect(dispatch).toHaveBeenCalledWith({
      type: "modifyElement",
      payload: {
        elementId: "/element:person",
        elementType: "CustomerType",
      },
    });
  });

  test("lets elements with inline simple types replace them with an explicit type", () => {
    const item = new DiagramItem("/element:code", "code", DiagramItemType.element, diagram);
    item.type = "<anonymous simpleType> (restricts xs:string)";
    item.isSimpleContent = true;

    const { dispatch } = displayItem(container, item);

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
    const item = new DiagramItem("/element:code", "code", DiagramItemType.element, diagram);
    item.type = "<anonymous simpleType> (restricts xs:string)";
    item.isSimpleContent = true;

    const { dispatch } = displayItem(container, item);

    editInput(container, "Base Type", "xs:token");

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
    const item = new DiagramItem("/element:person", "person", DiagramItemType.element, diagram);
    item.type = "<anonymous complexType> (extends BasePersonType)";
    item.hasAnonymousComplexType = true;

    const { dispatch } = displayItem(container, item);

    editInput(container, "Base Type", "EmployeeType");

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
