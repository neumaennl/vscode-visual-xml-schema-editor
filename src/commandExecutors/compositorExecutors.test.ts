/**
 * Unit tests for the compositor executors.
 */

import type {
  schema,
  AddCompositorCommand,
  RemoveCompositorCommand,
  ModifyCompositorCommand,
} from "../../shared/types.js";
import { executeAddCompositor, executeRemoveCompositor, executeModifyCompositor } from "./compositorExecutors.js";
import { schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";

/**
 * Executes an `addCompositor` command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function addCompositor(schemaObj: schema, payload: AddCompositorCommand["payload"]): void {
  executeAddCompositor({ type: "addCompositor", payload }, schemaObj);
}

/**
 * Executes a `removeCompositor` command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function removeCompositor(schemaObj: schema, payload: RemoveCompositorCommand["payload"]): void {
  executeRemoveCompositor({ type: "removeCompositor", payload }, schemaObj);
}

/**
 * Executes a `modifyCompositor` command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function modifyCompositor(schemaObj: schema, payload: ModifyCompositorCommand["payload"]): void {
  executeModifyCompositor({ type: "modifyCompositor", payload }, schemaObj);
}

/** A complexType with a sequence, which holds two choices, and a group definition with an all. */
const COMPOSITORS = `<xs:complexType name="PersonType">
  <xs:sequence><xs:choice><xs:element name="a" type="xs:string"/></xs:choice><xs:choice><xs:element name="b" type="xs:string"/></xs:choice></xs:sequence>
</xs:complexType>
<xs:group name="PersonGroup"><xs:all><xs:element name="id" type="xs:string"/></xs:all></xs:group>`;

describe("executeAddCompositor", () => {
  test("should append a choice to a sequence after its choices", () => {
    const schemaObj = schemaWith(COMPOSITORS);

    addCompositor(schemaObj, {
      parentId: "/complexType:PersonType/sequence[0]",
      compositor: "choice",
      minOccurs: 0,
    });

    const choices = schemaObj.complexType?.[0]?.sequence?.choice ?? [];
    expect(choices).toHaveLength(3);
    expect(choices[2]?.minOccurs).toBe(0);
    expect(choices[2]?.element).toBeUndefined();
  });

  test("should add a sequence to the compositor of a group definition", () => {
    const schemaObj = schemaWith(
      `<xs:group name="G"><xs:choice><xs:element name="a" type="xs:string"/></xs:choice></xs:group>`
    );

    addCompositor(schemaObj, { parentId: "/group:G/choice[0]", compositor: "sequence" });

    expect(schemaObj.group?.[0]?.choice?.sequence).toHaveLength(1);
  });
});

describe("executeRemoveCompositor", () => {
  test("should remove the compositor of a complexType", () => {
    const schemaObj = schemaWith(COMPOSITORS);

    removeCompositor(schemaObj, { compositorId: "/complexType:PersonType/sequence[0]" });

    expect(schemaObj.complexType?.[0]?.sequence).toBeUndefined();
  });

  test("should remove one of two compositors nested in a sequence", () => {
    const schemaObj = schemaWith(COMPOSITORS);

    removeCompositor(schemaObj, { compositorId: "/complexType:PersonType/sequence[0]/choice[1]" });

    const choices = schemaObj.complexType?.[0]?.sequence?.choice ?? [];
    expect(choices).toHaveLength(1);
    expect(choices[0]?.element?.[0]?.name).toBe("a");
  });
});

describe("executeModifyCompositor", () => {
  test("should set the occurrences of a compositor", () => {
    const schemaObj = schemaWith(COMPOSITORS);

    modifyCompositor(schemaObj, {
      compositorId: "/complexType:PersonType/sequence[0]",
      minOccurs: 0,
      maxOccurs: "unbounded",
    });

    const sequence = schemaObj.complexType?.[0]?.sequence;
    expect(sequence?.minOccurs).toBe(0);
    expect(sequence?.maxOccurs).toBe("unbounded");
  });

  test("should keep the occurrences that the payload leaves out", () => {
    const schemaObj = schemaWith(COMPOSITORS);

    modifyCompositor(schemaObj, { compositorId: "/complexType:PersonType/sequence[0]", maxOccurs: 3 });
    modifyCompositor(schemaObj, { compositorId: "/complexType:PersonType/sequence[0]", minOccurs: 2 });

    const sequence = schemaObj.complexType?.[0]?.sequence;
    expect(sequence?.minOccurs).toBe(2);
    expect(sequence?.maxOccurs).toBe(3);
  });
});

describe("executeModifyCompositor (kind)", () => {
  test("should move a nested choice as a sequence to the end of the sequences", () => {
    const schemaObj = schemaWith(`<xs:complexType name="T"><xs:sequence>
  <xs:choice><xs:element name="a" type="xs:string"/></xs:choice>
  <xs:sequence><xs:element name="b" type="xs:string"/></xs:sequence>
</xs:sequence></xs:complexType>`);

    modifyCompositor(schemaObj, {
      compositorId: "/complexType:T/sequence[0]/choice[0]",
      compositor: "sequence",
      maxOccurs: 2,
    });

    const sequence = schemaObj.complexType?.[0]?.sequence;
    expect(sequence?.choice).toBeUndefined();
    expect(sequence?.sequence?.map((s) => s.element?.[0]?.name)).toEqual(["b", "a"]);
    expect(sequence?.sequence?.[1]?.maxOccurs).toBe(2);
  });

  test("should turn a sequence into an all with its elements and occurrences as strings", () => {
    const schemaObj = schemaWith(`<xs:complexType name="T"><xs:sequence minOccurs="0">
  <xs:annotation><xs:documentation>Doc</xs:documentation></xs:annotation>
  <xs:element name="a" type="xs:string" minOccurs="0"/>
</xs:sequence></xs:complexType>`);

    modifyCompositor(schemaObj, { compositorId: "/complexType:T/sequence[0]", compositor: "all" });

    const ct = schemaObj.complexType?.[0];
    expect(ct?.sequence).toBeUndefined();
    expect(ct?.all?.minOccurs).toBe("0");
    expect(ct?.all?.annotation?.documentation?.[0]?.value).toBe("Doc");
    expect(ct?.all?.element?.[0]).toMatchObject({ name: "a", minOccurs: "0" });
  });

  test("should turn an all into a choice with its elements and occurrences as numbers", () => {
    const schemaObj = schemaWith(
      `<xs:complexType name="T"><xs:all minOccurs="0"><xs:element name="a" type="xs:string" maxOccurs="0"/></xs:all></xs:complexType>`
    );

    modifyCompositor(schemaObj, { compositorId: "/complexType:T/all[0]", compositor: "choice" });

    const choice = schemaObj.complexType?.[0]?.choice;
    expect(choice?.minOccurs).toBe(0);
    expect(choice?.element?.[0]).toMatchObject({ name: "a", maxOccurs: 0 });
  });

  test("should change the compositor of complex content", () => {
    const schemaObj = schemaWith(`<xs:complexType name="T"><xs:complexContent><xs:extension base="B">
  <xs:sequence><xs:element name="a" type="xs:string"/></xs:sequence>
</xs:extension></xs:complexContent></xs:complexType>
<xs:complexType name="B"/>`);

    modifyCompositor(schemaObj, { compositorId: "/complexType:T/sequence[0]", compositor: "choice" });

    const extension = schemaObj.complexType?.[0]?.complexContent?.extension;
    expect(extension?.sequence).toBeUndefined();
    expect(extension?.choice?.element?.[0]?.name).toBe("a");
  });

  test("should change the compositor of a group definition", () => {
    const schemaObj = schemaWith(COMPOSITORS);

    modifyCompositor(schemaObj, { compositorId: "/group:PersonGroup/all[0]", compositor: "sequence" });

    const group = schemaObj.group?.[0];
    expect(group?.all).toBeUndefined();
    expect(group?.sequence?.element?.[0]?.name).toBe("id");
  });
});
