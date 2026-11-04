/**
 * Integration tests: the validators and the executors agree.
 *
 * The validator checks everything an executor relies on, and the executor does not check it again
 * (see docs/architecture/003-validators-check-executors-assume.md). This test checks that they agree
 * for the commands that the webview can send: it builds the diagram of every test schema, which gives
 * the IDs of all nodes, creates commands for them, and applies every command that the validator
 * accepts. The executor must neither throw nor leave the schema unchanged.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { marshal, unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";
import type { SchemaCommand } from "../../shared/types";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { CommandValidator } from "../../src/commandValidator.js";
import { CommandExecutor } from "../../src/commandExecutor.js";
import { DiagramBuilder } from "../diagram/DiagramBuilder";
import type { DiagramItem } from "../diagram/DiagramItem";

/** The folders with the schemas of the test. */
const SCHEMA_FOLDERS = [
  join(import.meta.dirname, "../../src/__tests__/test-resources"),
  join(import.meta.dirname, "../../exampleFiles"),
];

/** The paths of all schemas of the test. */
const SCHEMA_FILES = SCHEMA_FOLDERS.flatMap((folder) =>
  readdirSync(folder).filter((name) => name.endsWith(".xsd")).map((name) => join(folder, name))
);

/**
 * Returns the commands that change or remove the node of a diagram item, depending on its kind.
 *
 * @param id - The ID of the node
 * @returns The commands
 */
function commandsForNode(id: string): SchemaCommand[] {
  const { nodeType, name } = parseSchemaId(id);
  switch (nodeType) {
    case SchemaNodeType.Element:
      return [
        { type: "removeElement", payload: { elementId: id } },
        { type: "modifyElement", payload: { elementId: id, documentation: "Changed" } },
      ];
    case SchemaNodeType.ComplexType:
    case SchemaNodeType.AnonymousComplexType:
      return [
        { type: "removeComplexType", payload: { typeId: id } },
        { type: "modifyComplexType", payload: { typeId: id, documentation: "Changed" } },
        { type: "modifyComplexType", payload: { typeId: id, baseType: "xs:anyType" } },
        // The test schemas derive only by extension, so a restriction is always a change
        { type: "modifyComplexType", payload: { typeId: id, derivationKind: "restriction" } },
      ];
    case SchemaNodeType.SimpleType:
      return [
        { type: "removeSimpleType", payload: { typeId: id } },
        { type: "modifySimpleType", payload: { typeId: id, documentation: "Changed" } },
        { type: "modifySimpleType", payload: { typeId: id, typeName: `Renamed${name}` } },
      ];
    case SchemaNodeType.AnonymousSimpleType:
      return [
        { type: "removeSimpleType", payload: { typeId: id } },
        { type: "modifySimpleType", payload: { typeId: id, documentation: "Changed" } },
      ];
    case SchemaNodeType.Group:
    case SchemaNodeType.GroupRef:
      return [
        { type: "removeGroup", payload: { groupId: id } },
        { type: "modifyGroup", payload: { groupId: id, minOccurs: 0 } },
        { type: "modifyGroup", payload: { groupId: id, documentation: "Changed" } },
      ];
    case SchemaNodeType.AttributeGroup:
    case SchemaNodeType.AttributeGroupRef:
      return [
        { type: "removeAttributeGroup", payload: { groupId: id } },
        { type: "modifyAttributeGroup", payload: { groupId: id, documentation: "Changed" } },
      ];
    default:
      return [];
  }
}

/**
 * Returns the commands that the webview can send for a diagram item: changing or removing its node,
 * adding children to it, and editing its annotations and documentation.
 *
 * @param item - The diagram item
 * @returns The commands
 */
function commandsForItem(item: DiagramItem): SchemaCommand[] {
  return [
    ...commandsForNode(item.id),
    { type: "addElement", payload: { parentId: item.id, elementName: "added", elementType: "xs:string" } },
    { type: "addAttribute", payload: { parentId: item.id, attributeName: "added", attributeType: "xs:string" } },
    { type: "addAnnotation", payload: { targetId: item.id, documentation: "Added" } },
    { type: "addDocumentation", payload: { targetId: item.id, content: "Added" } },
    ...item.documentationAnnotations.flatMap((annotation): SchemaCommand[] => [
      { type: "removeAnnotation", payload: { annotationId: annotation.id } },
      { type: "modifyAnnotation", payload: { annotationId: annotation.id, documentation: "Changed" } },
      { type: "addDocumentation", payload: { targetId: annotation.id, content: "Added" } },
      ...annotation.documentationEntries.flatMap((entry): SchemaCommand[] => [
        { type: "removeDocumentation", payload: { documentationId: entry.id } },
        { type: "modifyDocumentation", payload: { documentationId: entry.id, content: "Changed" } },
      ]),
    ]),
  ];
}

/**
 * Returns the commands for the nodes that the diagram does not show as items of their own:
 * imports, includes and the attributes of the schema and its complex types.
 *
 * @param schemaObj - The schema
 * @returns The commands
 */
function commandsForSchemaContent(schemaObj: schema): SchemaCommand[] {
  const attributeIds = [
    ...(schemaObj.attribute ?? []).map((attr) => `/attribute:${attr.name}`),
    ...(schemaObj.complexType ?? []).flatMap((ct) =>
      (ct.attribute ?? []).map((attr, index) => `/complexType:${ct.name}/attribute:${attr.name ?? attr.ref ?? index}`)
    ),
  ];
  return [
    ...(schemaObj.import_ ?? []).flatMap((_, index): SchemaCommand[] => [
      { type: "removeImport", payload: { importId: `/import[${index}]` } },
      { type: "modifyImport", payload: { importId: `/import[${index}]`, schemaLocation: "changed.xsd" } },
    ]),
    ...(schemaObj.include ?? []).flatMap((_, index): SchemaCommand[] => [
      { type: "removeInclude", payload: { includeId: `/include[${index}]` } },
      { type: "modifyInclude", payload: { includeId: `/include[${index}]`, schemaLocation: "changed.xsd" } },
    ]),
    ...attributeIds.flatMap((attributeId): SchemaCommand[] => [
      { type: "removeAttribute", payload: { attributeId } },
      { type: "modifyAttribute", payload: { attributeId, documentation: "Changed" } },
    ]),
  ];
}

/**
 * Returns all diagram items of a schema, depth first.
 *
 * @param schemaObj - The schema
 * @returns The diagram items
 */
function diagramItems(schemaObj: schema): DiagramItem[] {
  const items: DiagramItem[] = [];
  const collect = (item: DiagramItem): void => {
    items.push(item);
    item.childElements.forEach(collect);
  };
  new DiagramBuilder().buildFromSchema(schemaObj).rootElements.forEach(collect);
  return items;
}

/**
 * Applies a command that the validator accepts and describes what went wrong, if anything.
 *
 * @param xml - The schema
 * @param command - The command
 * @returns A description of the problem, or `undefined` if the validator rejects the command or the
 *   executor changes the schema
 */
function disagreement(xml: string, command: SchemaCommand): string | undefined {
  const schemaObj = unmarshal(schema, xml);
  if (!new CommandValidator().validate(command, schemaObj).valid) return undefined;
  const before = marshal(schemaObj);
  try {
    new CommandExecutor().execute(command, schemaObj);
  } catch (error) {
    return `${JSON.stringify(command)} threw: ${(error as Error).message}`;
  }
  return marshal(schemaObj) === before ? `${JSON.stringify(command)} changed nothing` : undefined;
}

describe("Integration: validators and executors agree", () => {
  beforeEach(() => {
    // The diagram builder logs every schema it builds
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  test.each(SCHEMA_FILES)("should apply every command that the validator accepts to %s", (file) => {
    const xml = readFileSync(file, "utf8");
    const commands = [
      ...diagramItems(unmarshal(schema, xml)).flatMap(commandsForItem),
      ...commandsForSchemaContent(unmarshal(schema, xml)),
    ];

    // disagreement() returns undefined for every command that is fine, and filter(Boolean) drops these,
    // so the list holds only the problems; comparing it with [] shows all of them when the test fails
    expect(commands.map((command) => disagreement(xml, command)).filter(Boolean)).toEqual([]);
  });
});
