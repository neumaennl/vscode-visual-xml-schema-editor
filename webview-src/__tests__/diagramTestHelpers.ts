/**
 * Test helpers that build the diagram of a real schema, so that tests use the diagram items that the
 * user can select.
 */

import type { schema } from "../../shared/types";
import { Diagram } from "../diagram/Diagram";
import { DiagramBuilder } from "../diagram/DiagramBuilder";
import { DiagramItem } from "../diagram/DiagramItem";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { anonymousTypeId } from "../../shared/idStrategy";
import type { DiagramSchemaObject } from "../diagram/schemaAccessors";
import { webviewSchemaWith } from "../../shared/__tests__/schemaTestHelpers";
import type { ElementObject } from "../../shared/schemaObjects";

/**
 * The schema object of items whose test never reads it, such as tests of the tree or the layout. Reading
 * any of its fields fails the test, so a test that does read the schema needs a real schema object.
 */
export const NOT_READ_SCHEMA_OBJECT: DiagramSchemaObject = new Proxy(
  {},
  {
    get(_target, key): never {
      throw new Error(`The test reads the field ${String(key)} of a schema object that it says it does not read`);
    },
  }
);

/**
 * Creates the diagram of an empty schema, for items whose test needs no particular schema. Like every parsed
 * schema, it declares the namespace of XML Schema, as `xs`.
 *
 * @returns The diagram
 */
export function emptyDiagram(): Diagram {
  return new Diagram(webviewSchemaWith(""));
}

/**
 * Builds the diagram of a schema and returns all its items, depth first. The diagram builder logs
 * every schema it builds, so tests that use it usually mock `console.log`.
 *
 * @param schemaObj - The schema
 * @returns The diagram items
 */
export function diagramItems(schemaObj: schema): DiagramItem[] {
  const items: DiagramItem[] = [];
  const collect = (item: DiagramItem): void => {
    items.push(item);
    item.childElements.forEach(collect);
  };
  new DiagramBuilder().buildFromSchema(schemaObj).rootElements.forEach(collect);
  return items;
}

/**
 * Builds the diagram of a schema and returns the item with the given ID.
 *
 * @param schemaObj - The schema
 * @param id - The ID of the item
 * @returns The item
 */
export function diagramItem(schemaObj: schema, id: string): DiagramItem {
  const item = diagramItems(schemaObj).find((candidate) => candidate.id === id);
  if (!item) {
    return expect.fail(`No diagram item ${id}`);
  }
  return item;
}

/**
 * Creates the item of the inline simple type of an element. The diagram shows no items for inline types, but
 * the properties panel addresses them by their IDs.
 *
 * @param element - The item of an element with an inline simple type
 * @returns The item, with the inline type as its schema object
 */
export function anonymousSimpleTypeItem(element: DiagramItem): DiagramItem {
  const inlineType = (element.schemaObject as ElementObject).simpleType;
  if (!inlineType) {
    return expect.fail(`${element.id} has no inline simple type`);
  }
  return new DiagramItem(
    anonymousTypeId(element.id, "simpleType"),
    "",
    DiagramItemType.type,
    inlineType,
    element.diagram
  );
}

/**
 * Builds the diagram of a schema with a local element `e` in the sequence of a complex type `T` and
 * returns the item of the element.
 *
 * @param attributes - Further attributes of the element, such as `minOccurs="0"`
 * @returns The item
 */
export function localElementWith(attributes: string): DiagramItem {
  const content = `<xs:complexType name="T"><xs:sequence><xs:element name="e" ${attributes}/></xs:sequence></xs:complexType>`;
  return diagramItem(webviewSchemaWith(content), "/complexType:T/sequence[0]/element:e[0]");
}

/**
 * Parses one top-level component, such as an element, a type or a group, and returns its schema object.
 *
 * @param content - The component
 * @returns The schema object
 */
export function component(content: string): DiagramSchemaObject {
  const schemaObj = webviewSchemaWith(content);
  const parsed =
    schemaObj.element?.[0] ?? schemaObj.complexType?.[0] ?? schemaObj.simpleType?.[0] ?? schemaObj.group?.[0];
  if (!parsed) {
    return expect.fail(`No component in ${content}`);
  }
  return parsed;
}

/**
 * Parses an element with the given documentation and returns its schema object.
 *
 * @param text - The text of its single `xs:documentation`
 * @returns The schema object of the element
 */
export function documented(text: string): DiagramSchemaObject {
  return component(
    `<xs:element name="e"><xs:annotation><xs:documentation>${text}</xs:documentation></xs:annotation></xs:element>`
  );
}

/**
 * Mutes the log of the diagram builder, which logs every schema it builds, in the tests of the
 * `describe` block that calls it, and restores `console.log` after each test.
 */
export function muteDiagramBuilderLog(): void {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
}
