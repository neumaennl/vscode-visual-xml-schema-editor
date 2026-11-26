/**
 * Unit tests for the type fields of the General tab of the properties panel: the type, the base type
 * and the replacement type of inline types.
 */

import { webviewSchemaFromXml } from "../../shared/__tests__/schemaTestHelpers";
import type { Mock } from "vitest";
import { renderTypeProperty } from "./propertiesPanelTypes";
import { addPropertyToContainer } from "./propertiesPanelDom";
import type { SchemaCommand } from "../../shared/types";
import type { DiagramItem } from "../diagram";
import { editInput, getInputByLabel, getLabels, getTextByLabel } from "../__tests__/propertiesPanelTestHelpers";
import { diagramItem, muteDiagramBuilderLog } from "../__tests__/diagramTestHelpers";

/**
 * Named simple and complex types, and elements with a named type and with inline types, in a schema
 * whose target namespace has the prefix `tns`.
 */
const TYPES_XML = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:tns="urn:test" targetNamespace="urn:test">
  <xs:simpleType name="Code"><xs:restriction base="xs:string"/></xs:simpleType>
  <xs:simpleType name="Codes"><xs:list itemType="xs:token"/></xs:simpleType>
  <xs:simpleType name="Mixed"><xs:union memberTypes="xs:int xs:token"/></xs:simpleType>
  <xs:simpleType name="Short"><xs:restriction><xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType></xs:restriction></xs:simpleType>
  <xs:complexType name="Base"/>
  <xs:complexType name="Derived"><xs:complexContent><xs:restriction base="tns:Base"/></xs:complexContent></xs:complexType>
  <xs:group name="Contact"><xs:sequence/></xs:group>
  <xs:element name="code" type="xs:string"/>
  <xs:element name="size"><xs:simpleType><xs:restriction base="xs:int"/></xs:simpleType></xs:element>
  <xs:element name="short"><xs:simpleType><xs:restriction><xs:simpleType><xs:restriction base="xs:string"/></xs:simpleType></xs:restriction></xs:simpleType></xs:element>
  <xs:element name="note"><xs:complexType><xs:sequence/></xs:complexType></xs:element>
  <xs:element name="extended"><xs:complexType><xs:complexContent><xs:extension base="tns:Base"/></xs:complexContent></xs:complexType></xs:element>
  <xs:complexType name="Price"><xs:simpleContent><xs:extension base="xs:decimal"/></xs:simpleContent></xs:complexType>
  <xs:element name="price"><xs:complexType><xs:simpleContent><xs:restriction base="tns:Price"/></xs:simpleContent></xs:complexType></xs:element>
</xs:schema>`;

/** The type names that the fields suggest. */
const SUGGESTIONS = ["xs:string", "tns:Code"];

/** The type fields of a node, the node, and the mock that receives their commands. */
interface TypeFields {
  root: HTMLElement;
  node: DiagramItem;
  dispatch: Mock<(command: SchemaCommand) => void>;
}

/**
 * Renders the type fields of the diagram item with the given ID in the diagram of {@link TYPES_XML}.
 *
 * @param id - The ID of the item
 * @returns The fields, the item and the mock
 */
function renderType(id: string): TypeFields {
  const root = document.createElement("div");
  const node = diagramItem(webviewSchemaFromXml(TYPES_XML), id);
  const dispatch = vi.fn<(command: SchemaCommand) => void>();
  renderTypeProperty(root, node, SUGGESTIONS, dispatch, addPropertyToContainer);
  return { root, node, dispatch };
}

describe("renderTypeProperty", () => {
  muteDiagramBuilderLog();

  test.each(["/schema", "/group:Contact", "/group:Contact/sequence[0]"])("should show no type fields for %s", (id) => {
    expect(renderType(id).root.childElementCount).toBe(0);
  });

  describe("elements with a named type", () => {
    test("should show the type in a field with suggestions", () => {
      const { root } = renderType("/element:code");

      const input = getInputByLabel(root, "Type");
      expect(getLabels(root)).toEqual(["Type"]);
      expect(input.value).toBe("xs:string");
      const options = Array.from(
        root.querySelectorAll(`datalist#${input.getAttribute("list")!} option`),
        (option) => (option as HTMLOptionElement).value
      );
      expect(options).toEqual(SUGGESTIONS);
    });

    test.each([
      { value: "xs:int", expected: "xs:int" },
      { value: "Code", expected: "tns:Code" },
    ])("should change the type to '$value' and add the prefix to a type of the schema", ({ value, expected }) => {
      const { root, dispatch } = renderType("/element:code");

      editInput(root, "Type", value);

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifyElement",
        payload: { elementId: "/element:code", elementType: expected },
      });
    });

    test.each(["xs:string", " "])("should send nothing for the type '%s'", (value) => {
      const { root, dispatch } = renderType("/element:code");

      editInput(root, "Type", value);

      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe("simple types", () => {
    test("should show the kind and the base type of a restriction", () => {
      const { root } = renderType("/simpleType:Code");

      expect(getLabels(root)).toEqual(["Kind", "Base Type"]);
      expect(getInputByLabel(root, "Base Type").value).toBe("xs:string");
    });

    test("should change the base type of a restriction", () => {
      const { root, dispatch } = renderType("/simpleType:Code");

      editInput(root, "Base Type", "xs:token");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifySimpleType",
        payload: { typeId: "/simpleType:Code", baseType: "xs:token" },
      });
    });

    test.each(["xs:string", ""])("should send nothing for the base type '%s'", (value) => {
      const { root, dispatch } = renderType("/simpleType:Code");

      editInput(root, "Base Type", value);

      expect(dispatch).not.toHaveBeenCalled();
    });

    test.each([
      { id: "/simpleType:Codes", labels: ["Kind", "Item Type"] },
      { id: "/simpleType:Mixed", labels: ["Kind", "Member Types"] },
    ])("should show the editor of the kind of $id", ({ id, labels }) => {
      expect(getLabels(renderType(id).root)).toEqual(labels);
    });

    test("should show the inline base type of a restriction read-only", () => {
      const { root } = renderType("/simpleType:Short");

      expect(getLabels(root)).toEqual(["Kind", "Base Type", "Type editing"]);
      expect(getTextByLabel(root, "Base Type")).toBe("Inline simpleType");
      expect(getTextByLabel(root, "Type editing")).toBe(
        "This simpleType does not expose a single base type that can be edited here."
      );
    });
  });

  describe("elements with an inline simple type", () => {
    test("should show the inline type, its base type and a replacement type", () => {
      const { root } = renderType("/element:size");

      expect(getLabels(root)).toEqual(["Kind", "Type", "Base Type", "Replacement Type"]);
      expect(getTextByLabel(root, "Type")).toBe("Inline simpleType (restricts xs:int)");
      expect(getInputByLabel(root, "Replacement Type").value).toBe("xs:int");
    });

    test("should change the base type of the inline type", () => {
      const { root, dispatch } = renderType("/element:size");

      editInput(root, "Base Type", "xs:long");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifySimpleType",
        payload: { typeId: "/element:size/anonymousSimpleType[0]", baseType: "xs:long" },
      });
    });

    test("should only offer a replacement type for an inline type without a base type", () => {
      const { root } = renderType("/element:short");

      expect(getLabels(root)).toEqual(["Kind", "Type", "Replacement Type", "Type editing"]);
      expect(getTextByLabel(root, "Type")).toBe("Inline simpleType");
      expect(getTextByLabel(root, "Type editing")).toBe(
        "Setting a replacement type removes the current inline simpleType from this element."
      );
    });
  });

  describe("complex types", () => {
    test("should reject a base type that the schema does not offer, with a message below the field", () => {
      const { root, dispatch } = renderType("/complexType:Derived");

      editInput(root, "Base Type", "tns:Other");

      expect(dispatch).not.toHaveBeenCalled();
      const input = getInputByLabel(root, "Base Type");
      expect(input.value).toBe("tns:Base");
      expect(input.parentElement?.querySelector(".property-message")?.textContent).toBe(
        "Unknown type 'tns:Other': use a built-in type, a type of this schema, a type of an imported schema with its prefix, or a type of an included schema"
      );
    });

    test("should show a complex type without a base type read-only", () => {
      const { root } = renderType("/complexType:Base");

      expect(getLabels(root)).toEqual(["Type"]);
      expect(getTextByLabel(root, "Type")).toBe("complexType");
    });

    test.each([
      { value: "xs:anyType", baseType: "xs:anyType" },
      { value: "", baseType: "" },
    ])(
      "should change the base type of a derived complex type to '$value' and keep the derivation",
      ({ value, baseType }) => {
        const { root, dispatch } = renderType("/complexType:Derived");

        expect(getInputByLabel(root, "Base Type").value).toBe("tns:Base");
        editInput(root, "Base Type", value);

        expect(dispatch).toHaveBeenCalledExactlyOnceWith({
          type: "modifyComplexType",
          payload: { typeId: "/complexType:Derived", baseType, derivationKind: "restriction" },
        });
      }
    );
  });

  describe("complex types with simple content, whose base type no command can change yet", () => {
    test.each([
      {
        id: "/complexType:Price",
        labels: ["Type", "Base Type"],
        type: "complexType with simpleContent (extends xs:decimal)",
        baseType: "xs:decimal",
      },
      {
        id: "/element:price",
        labels: ["Type", "Base Type", "Replacement Type"],
        type: "Inline complexType (restricts tns:Price)",
        baseType: "tns:Price",
      },
    ])("should show the type and base type of $id read-only", ({ id, labels, type, baseType }) => {
      const { root } = renderType(id);

      expect(getLabels(root)).toEqual(labels);
      expect(getTextByLabel(root, "Type")).toBe(type);
      expect(getTextByLabel(root, "Base Type")).toBe(baseType);
    });

    test("should replace the inline complex type of an element with a named type", () => {
      const { root, dispatch } = renderType("/element:price");

      editInput(root, "Replacement Type", "tns:Price");
      editInput(root, "Replacement Type", "xs:decimal");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifyElement",
        payload: { elementId: "/element:price", elementType: "xs:decimal" },
      });
    });
  });

  describe("elements with an inline complex type", () => {
    test.each([
      { id: "/element:note", type: "Inline complexType", baseType: "" },
      { id: "/element:extended", type: "Inline complexType (extends tns:Base)", baseType: "tns:Base" },
    ])("should show the inline type of $id, its base type and a replacement type", ({ id, type, baseType }) => {
      const { root } = renderType(id);

      expect(getLabels(root)).toEqual(["Type", "Base Type", "Replacement Type"]);
      expect(getTextByLabel(root, "Type")).toBe(type);
      expect(getInputByLabel(root, "Base Type").value).toBe(baseType);
    });

    test("should derive the inline type from a base type", () => {
      const { root, dispatch } = renderType("/element:note");

      editInput(root, "Base Type", "Base");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifyComplexType",
        payload: { typeId: "/element:note/anonymousComplexType[0]", baseType: "tns:Base", derivationKind: "extension" },
      });
    });

    test("should replace the inline type with a named type", () => {
      const { root, dispatch } = renderType("/element:extended");

      editInput(root, "Replacement Type", "tns:Derived");

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "modifyElement",
        payload: { elementId: "/element:extended", elementType: "tns:Derived" },
      });
    });
  });
});
