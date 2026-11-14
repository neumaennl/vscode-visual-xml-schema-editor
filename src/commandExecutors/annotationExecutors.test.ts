/**
 * Unit tests for annotation and documentation executors.
 *
 * ID Conventions used throughout these tests:
 * - annotationId / targetId for non-schema nodes: XPath-like path
 *   (e.g. "/element:person").
 * - annotationId for schema-root annotations: "/schema/annotation[N]"
 * - documentationId for non-schema nodes: "{elementPath}/documentation[N]"
 * - documentationId for schema-root annotations:
 *     "/schema/annotation[N]/documentation[M]" or "/schema/documentation[N]"
 *
 * Note on references: xs:annotation, xs:documentation, and xs:appinfo have no
 * `ref` attribute in the XSD specification. No reference support is implemented
 * or tested here.
 */

import {
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
  schema,
} from "../../shared/types.js";
import {
  executeAddAnnotation,
  executeRemoveAnnotation,
  executeModifyAnnotation,
  executeAddDocumentation,
  executeRemoveDocumentation,
  executeModifyDocumentation,
} from "./annotationExecutors.js";
import { emptySchema, schemaWith } from "../../shared/__tests__/schemaTestHelpers.js";
import { readTestSchema } from "../__tests__/resourceTestHelpers.js";

/**
 * Returns the values of documentation or appinfo entries.
 *
 * @param entries - The entries
 * @returns Their values, in document order
 */
function valuesOf(entries: Array<{ value?: string }> | undefined): Array<string | undefined> {
  return (entries ?? []).map((entry) => entry.value);
}

/**
 * Executes an addAnnotation command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function addAnnotation(schemaObj: schema, payload: AddAnnotationCommand["payload"]): void {
  executeAddAnnotation({ type: "addAnnotation", payload }, schemaObj);
}

/**
 * Executes an addDocumentation command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function addDocumentation(schemaObj: schema, payload: AddDocumentationCommand["payload"]): void {
  executeAddDocumentation({ type: "addDocumentation", payload }, schemaObj);
}

/**
 * Executes a modifyAnnotation command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function modifyAnnotation(schemaObj: schema, payload: ModifyAnnotationCommand["payload"]): void {
  executeModifyAnnotation({ type: "modifyAnnotation", payload }, schemaObj);
}

/**
 * Executes a modifyDocumentation command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function modifyDocumentation(schemaObj: schema, payload: ModifyDocumentationCommand["payload"]): void {
  executeModifyDocumentation({ type: "modifyDocumentation", payload }, schemaObj);
}

/**
 * Executes a removeAnnotation command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function removeAnnotation(schemaObj: schema, payload: RemoveAnnotationCommand["payload"]): void {
  executeRemoveAnnotation({ type: "removeAnnotation", payload }, schemaObj);
}

/**
 * Executes a removeDocumentation command.
 *
 * @param schemaObj - The schema to change
 * @param payload - The payload of the command
 */
function removeDocumentation(schemaObj: schema, payload: RemoveDocumentationCommand["payload"]): void {
  executeRemoveDocumentation({ type: "removeDocumentation", payload }, schemaObj);
}

// ─── Shared XML fixtures ────────────────────────────────────────────────────

/** The file with an element `person` with an annotation that has one documentation. */
const DOCUMENTED_PERSON_XSD = "person-element-with-documentation.xsd";

/** The file with a schema with two annotations. */
const TWO_ANNOTATIONS_XSD = "schema-with-two-annotations.xsd";

/** The file with an element `person` with an annotation that has two documentations. */
const TWO_DOCUMENTATIONS_XSD = "person-element-with-two-documentations.xsd";

/** A bare element — no annotation. */
const PERSON_ELEMENT = `<xs:element name="person" type="xs:string"/>`;

// ─── executeAddAnnotation ────────────────────────────────────────────────────

describe("executeAddAnnotation", () => {
  test.each([
    ["no children when no optional fields are given", {}, [], []],
    ["a documentation child", { documentation: "A person." }, ["A person."], []],
    ["an appinfo child", { appInfo: "app-info" }, [], ["app-info"]],
    ["both documentation and appinfo children", { documentation: "doc", appInfo: "info" }, ["doc"], ["info"]],
  ])("creates an annotation with %s", (_case, fields, documentation, appinfo) => {
    const schemaObj = schemaWith(PERSON_ELEMENT);

    addAnnotation(schemaObj, { targetId: "/element:person", ...fields });

    const annotation = schemaObj.element?.[0].annotation;
    expect(annotation).toBeDefined();
    expect(valuesOf(annotation?.documentation)).toEqual(documentation);
    expect(valuesOf(annotation?.appinfo)).toEqual(appinfo);
  });

  test("works on a complexType target", () => {
    const schemaObj = schemaWith(`<xs:complexType name="PersonType"/>`);

    addAnnotation(schemaObj, { targetId: "/complexType:PersonType", documentation: "A type." });

    const types = schemaObj.complexType ?? [];
    expect(types[0].annotation).toBeDefined();
    expect((types[0].annotation?.documentation ?? [])[0].value).toBe("A type.");
  });
});

// ─── executeRemoveAnnotation ─────────────────────────────────────────────────

describe("executeRemoveAnnotation", () => {
  test("removes an existing annotation", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);

    removeAnnotation(schemaObj, { annotationId: "/element:person" });

    const elem = (schemaObj.element ?? [])[0];
    expect(elem.annotation).toBeUndefined();
  });

});

// ─── executeModifyAnnotation ─────────────────────────────────────────────────

describe("executeModifyAnnotation", () => {
  test("updates documentation text of an existing annotation", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);

    modifyAnnotation(schemaObj, { annotationId: "/element:person", documentation: "Updated." });

    const elem = (schemaObj.element ?? [])[0];
    expect((elem.annotation?.documentation ?? [])[0].value).toBe("Updated.");
  });

  test("replaces all documentation children with a single new element", () => {
    const schemaObj = readTestSchema(TWO_DOCUMENTATIONS_XSD);

    modifyAnnotation(schemaObj, { annotationId: "/element:person", documentation: "Replaced." });

    const elem = (schemaObj.element ?? [])[0];
    expect(valuesOf(elem.annotation?.documentation)).toEqual(["Replaced."]);
  });

  test("creates a documentation child when annotation has none, preserving appinfo", () => {
    // Start with an annotation that only has appinfo
    const schemaObj = schemaWith(`<xs:element name="person" type="xs:string">
  <xs:annotation>
    <xs:appinfo>app</xs:appinfo>
  </xs:annotation>
</xs:element>`);

    modifyAnnotation(schemaObj, { annotationId: "/element:person", documentation: "New doc." });

    const elem = (schemaObj.element ?? [])[0];
    expect(valuesOf(elem.annotation?.documentation)).toEqual(["New doc."]);
    // Existing appinfo must be preserved
    expect(valuesOf(elem.annotation?.appinfo)).toEqual(["app"]);
  });

  test("updates appinfo text", () => {
    const schemaObj = schemaWith(`<xs:element name="person" type="xs:string">
  <xs:annotation>
    <xs:documentation>A person.</xs:documentation>
    <xs:appinfo>app-specific</xs:appinfo>
  </xs:annotation>
</xs:element>`);

    modifyAnnotation(schemaObj, { annotationId: "/element:person", appInfo: "new-app-info" });

    const elem = (schemaObj.element ?? [])[0];
    expect((elem.annotation?.appinfo ?? [])[0].value).toBe("new-app-info");
  });

  test("adds an appinfo child when annotation has none", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);

    modifyAnnotation(schemaObj, { annotationId: "/element:person", appInfo: "new-info" });

    expect(valuesOf((schemaObj.element ?? [])[0].annotation?.appinfo)).toEqual(["new-info"]);
  });

});

// ─── executeAddDocumentation ─────────────────────────────────────────────────

describe("executeAddDocumentation", () => {
  test("creates an annotation and appends a documentation element", () => {
    const schemaObj = schemaWith(PERSON_ELEMENT);

    addDocumentation(schemaObj, { targetId: "/element:person", content: "A person." });

    const elem = (schemaObj.element ?? [])[0];
    expect(elem.annotation).toBeDefined();
    expect(valuesOf(elem.annotation?.documentation)).toEqual(["A person."]);
  });

  test("appends a second documentation element to an existing annotation", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);

    addDocumentation(schemaObj, { targetId: "/element:person", content: "Second.", lang: "en" });

    const documentations = (schemaObj.element ?? [])[0].annotation?.documentation ?? [];
    expect(documentations).toHaveLength(2);
    expect(documentations[1].value).toBe("Second.");
    expect(documentations[1]._anyAttributes?.["xml:lang"]).toBe("en");
  });

  test("stores the xml:lang attribute in _anyAttributes", () => {
    const schemaObj = schemaWith(PERSON_ELEMENT);

    addDocumentation(schemaObj, { targetId: "/element:person", content: "Hallo.", lang: "de" });

    const documentations = (schemaObj.element ?? [])[0].annotation?.documentation ?? [];
    expect(documentations[0]._anyAttributes?.["xml:lang"]).toBe("de");
  });

  test("does not add a lang attribute when lang is not supplied", () => {
    const schemaObj = schemaWith(PERSON_ELEMENT);

    addDocumentation(schemaObj, { targetId: "/element:person", content: "No lang." });

    const documentations = (schemaObj.element ?? [])[0].annotation?.documentation ?? [];
    expect(documentations[0]._anyAttributes?.["xml:lang"]).toBeUndefined();
  });

});

// ─── executeRemoveDocumentation ──────────────────────────────────────────────

describe("executeRemoveDocumentation", () => {
  test("removes the only documentation element and clears the documentation array", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);

    removeDocumentation(schemaObj, { documentationId: "/element:person/documentation[0]" });

    const elem = (schemaObj.element ?? [])[0];
    // annotation stays but documentation array is cleared
    expect(elem.annotation).toBeDefined();
    expect(elem.annotation?.documentation).toBeUndefined();
  });

  test("removes the first of two documentation elements leaving the second", () => {
    const schemaObj = readTestSchema(TWO_DOCUMENTATIONS_XSD);

    removeDocumentation(schemaObj, { documentationId: "/element:person/documentation[0]" });

    const documentations = (schemaObj.element ?? [])[0].annotation?.documentation ?? [];
    expect(documentations).toHaveLength(1);
    expect(documentations[0]._anyAttributes?.["xml:lang"]).toBe("de");
  });

  test("removes the second of two documentation elements leaving the first", () => {
    const schemaObj = readTestSchema(TWO_DOCUMENTATIONS_XSD);

    removeDocumentation(schemaObj, { documentationId: "/element:person/documentation[1]" });

    const documentations = (schemaObj.element ?? [])[0].annotation?.documentation ?? [];
    expect(documentations).toHaveLength(1);
    expect(documentations[0]._anyAttributes?.["xml:lang"]).toBe("en");
  });

  test("throws for an invalid documentationId format", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
    const command: RemoveDocumentationCommand = {
      type: "removeDocumentation",
      payload: { documentationId: "/element:person" },
    };

    expect(() => executeRemoveDocumentation(command, schemaObj)).toThrow(
      "Invalid documentationId format"
    );
  });

});

// ─── executeModifyDocumentation ──────────────────────────────────────────────

describe("executeModifyDocumentation", () => {
  test("updates the content of an existing documentation element", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);

    modifyDocumentation(schemaObj, {
      documentationId: "/element:person/documentation[0]",
      content: "Updated.",
    });

    const documentations = (schemaObj.element ?? [])[0].annotation?.documentation ?? [];
    expect(documentations[0].value).toBe("Updated.");
  });

  test("sets the xml:lang attribute", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);

    modifyDocumentation(schemaObj, {
      documentationId: "/element:person/documentation[0]",
      lang: "fr",
    });

    const documentations = (schemaObj.element ?? [])[0].annotation?.documentation ?? [];
    expect(documentations[0]._anyAttributes?.["xml:lang"]).toBe("fr");
  });

  test("removes the xml:lang attribute when lang is set to empty string", () => {
    const schemaObj = readTestSchema(TWO_DOCUMENTATIONS_XSD);

    modifyDocumentation(schemaObj, {
      documentationId: "/element:person/documentation[0]",
      lang: "",
    });

    const documentations = (schemaObj.element ?? [])[0].annotation?.documentation ?? [];
    expect(documentations[0]._anyAttributes?.["xml:lang"]).toBeUndefined();
    // second documentation is unchanged
    expect(documentations[1]._anyAttributes?.["xml:lang"]).toBe("de");
  });

  test("updates content and lang simultaneously", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);

    modifyDocumentation(schemaObj, {
      documentationId: "/element:person/documentation[0]",
      content: "Aktualisiert.",
      lang: "de",
    });

    const documentations = (schemaObj.element ?? [])[0].annotation?.documentation ?? [];
    expect(documentations[0].value).toBe("Aktualisiert.");
    expect(documentations[0]._anyAttributes?.["xml:lang"]).toBe("de");
  });

  test("modifies the second of two documentation elements leaving the first unchanged", () => {
    const schemaObj = readTestSchema(TWO_DOCUMENTATIONS_XSD);

    modifyDocumentation(schemaObj, {
      documentationId: "/element:person/documentation[1]",
      content: "German updated.",
    });

    const documentations = (schemaObj.element ?? [])[0].annotation?.documentation ?? [];
    expect(documentations[0].value).toBe("English");
    expect(documentations[1].value).toBe("German updated.");
  });

  test("throws for an invalid documentationId format", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
    const command: ModifyDocumentationCommand = {
      type: "modifyDocumentation",
      payload: { documentationId: "doc-123", content: "x" },
    };

    expect(() => executeModifyDocumentation(command, schemaObj)).toThrow(
      "Invalid documentationId format"
    );
  });

});

// ─── Schema-root annotation operations ──────────────────────────────────────

/** A single annotation on the schema element. */
const SCHEMA_ANNOTATION = `<xs:annotation>
  <xs:documentation>Schema description.</xs:documentation>
</xs:annotation>`;

describe("executeAddAnnotation — schema root", () => {
  test("appends a new annotation to an empty schema", () => {
    const schemaObj = emptySchema();

    addAnnotation(schemaObj, { targetId: "/schema", documentation: "My schema." });

    const annotations = schemaObj.annotation ?? [];
    expect(annotations).toHaveLength(1);
    expect((annotations[0].documentation ?? [])[0].value).toBe("My schema.");
  });

  test("appends a second annotation when one already exists", () => {
    const schemaObj = schemaWith(SCHEMA_ANNOTATION);

    addAnnotation(schemaObj, { targetId: "/schema", documentation: "Second annotation." });

    const annotations = schemaObj.annotation ?? [];
    expect(annotations).toHaveLength(2);
    expect((annotations[1].documentation ?? [])[0].value).toBe("Second annotation.");
    // First annotation is preserved
    expect((annotations[0].documentation ?? [])[0].value).toBe("Schema description.");
  });

  test("adds an annotation with both documentation and appinfo", () => {
    const schemaObj = emptySchema();

    addAnnotation(schemaObj, { targetId: "/schema", documentation: "desc", appInfo: "info" });

    const annotation = (schemaObj.annotation ?? [])[0];
    expect((annotation.documentation ?? [])[0].value).toBe("desc");
    expect((annotation.appinfo ?? [])[0].value).toBe("info");
  });
});

describe("executeRemoveAnnotation — schema root", () => {
  test("removes the first schema annotation by index", () => {
    const schemaObj = readTestSchema(TWO_ANNOTATIONS_XSD);

    removeAnnotation(schemaObj, { annotationId: "/schema/annotation[0]" });

    const annotations = schemaObj.annotation ?? [];
    expect(annotations).toHaveLength(1);
    expect((annotations[0].documentation ?? [])[0].value).toBe("Second.");
  });

  test("removes the second schema annotation by index", () => {
    const schemaObj = readTestSchema(TWO_ANNOTATIONS_XSD);

    removeAnnotation(schemaObj, { annotationId: "/schema/annotation[1]" });

    const annotations = schemaObj.annotation ?? [];
    expect(annotations).toHaveLength(1);
    expect((annotations[0].documentation ?? [])[0].value).toBe("First.");
  });

  test("removes the only annotation, leaving annotation as undefined", () => {
    const schemaObj = schemaWith(SCHEMA_ANNOTATION);

    removeAnnotation(schemaObj, { annotationId: "/schema/annotation[0]" });

    expect(schemaObj.annotation).toBeUndefined();
  });

});

describe("executeModifyAnnotation — schema root", () => {
  test("updates documentation on the first schema annotation", () => {
    const schemaObj = schemaWith(SCHEMA_ANNOTATION);

    modifyAnnotation(schemaObj, {
      annotationId: "/schema/annotation[0]",
      documentation: "Updated.",
    });

    const annotations = schemaObj.annotation ?? [];
    expect((annotations[0].documentation ?? [])[0].value).toBe("Updated.");
  });

  test("updates documentation on the second schema annotation", () => {
    const schemaObj = readTestSchema(TWO_ANNOTATIONS_XSD);

    modifyAnnotation(schemaObj, {
      annotationId: "/schema/annotation[1]",
      documentation: "Second updated.",
    });

    const annotations = schemaObj.annotation ?? [];
    expect((annotations[1].documentation ?? [])[0].value).toBe("Second updated.");
    // First annotation untouched
    expect((annotations[0].documentation ?? [])[0].value).toBe("First.");
  });

});

describe("executeAddDocumentation — schema root", () => {
  test("creates a schema annotation and adds a documentation element (targetId: '/schema')", () => {
    const schemaObj = emptySchema();

    addDocumentation(schemaObj, { targetId: "/schema", content: "Schema doc." });

    const annotations = schemaObj.annotation ?? [];
    expect(annotations).toHaveLength(1);
    expect(valuesOf(annotations[0].documentation)).toEqual(["Schema doc."]);
  });

  test("appends to the first existing annotation (targetId: '/schema')", () => {
    const schemaObj = schemaWith(SCHEMA_ANNOTATION);

    addDocumentation(schemaObj, { targetId: "/schema", content: "Appended.", lang: "en" });

    const documentations = (schemaObj.annotation ?? [])[0].documentation ?? [];
    expect(documentations).toHaveLength(2);
    expect(documentations[1].value).toBe("Appended.");
    expect(documentations[1]._anyAttributes?.["xml:lang"]).toBe("en");
  });

  test("appends to a specific schema annotation (targetId: '/schema/annotation[N]')", () => {
    const schemaObj = readTestSchema(TWO_ANNOTATIONS_XSD);

    addDocumentation(schemaObj, {
      targetId: "/schema/annotation[1]",
      content: "Into second annotation.",
    });

    const annotations = schemaObj.annotation ?? [];
    const documentations = annotations[1].documentation ?? [];
    expect(documentations).toHaveLength(2);
    expect(documentations[1].value).toBe("Into second annotation.");
    // First annotation untouched
    expect(annotations[0].documentation ?? []).toHaveLength(1);
  });

});

describe("executeRemoveDocumentation — schema root", () => {
  test("removes a documentation element via '/schema/annotation[N]/documentation[M]' when multiple documentations exist", () => {
    const schemaObj = schemaWith(SCHEMA_ANNOTATION);

    // Add a second documentation node to the first schema annotation
    const addCommand: AddDocumentationCommand = {
      type: "addDocumentation",
      payload: {
        targetId: "/schema/annotation[0]",
        content: "Second doc.",
      },
    };
    executeAddDocumentation(addCommand, schemaObj);

    // Remove the first documentation entry
    executeRemoveDocumentation(
      {
        type: "removeDocumentation",
        payload: {
          documentationId: "/schema/annotation[0]/documentation[0]",
        },
      },
      schemaObj
    );

    const annotation = (schemaObj.annotation ?? [])[0];
    expect(valuesOf(annotation.documentation)).toEqual(["Second doc."]);
  });

  test("removes a documentation element via '/schema/documentation[N]' shorthand", () => {
    const schemaObj = schemaWith(SCHEMA_ANNOTATION);
    executeRemoveDocumentation(
      {
        type: "removeDocumentation",
        payload: { documentationId: "/schema/documentation[0]" },
      },
      schemaObj
    );

    const annotation = (schemaObj.annotation ?? [])[0];
    // When the last documentation is removed, the property should be undefined
    expect(annotation.documentation).toBeUndefined();
  });

});

describe("executeModifyDocumentation — schema root", () => {
  test("modifies a documentation element via '/schema/annotation[N]/documentation[M]'", () => {
    const schemaObj = schemaWith(SCHEMA_ANNOTATION);
    executeModifyDocumentation(
      {
        type: "modifyDocumentation",
        payload: {
          documentationId: "/schema/annotation[0]/documentation[0]",
          content: "Modified.",
          lang: "en",
        },
      },
      schemaObj
    );

    const doc = ((schemaObj.annotation ?? [])[0].documentation ?? [])[0];
    expect(doc.value).toBe("Modified.");
    expect(doc._anyAttributes?.["xml:lang"]).toBe("en");
  });

  test("modifies a documentation element via '/schema/documentation[N]' shorthand", () => {
    const schemaObj = schemaWith(SCHEMA_ANNOTATION);
    executeModifyDocumentation(
      {
        type: "modifyDocumentation",
        payload: {
          documentationId: "/schema/documentation[0]",
          content: "Modified via shorthand.",
        },
      },
      schemaObj
    );

    const doc = ((schemaObj.annotation ?? [])[0].documentation ?? [])[0];
    expect(doc.value).toBe("Modified via shorthand.");
  });
});
