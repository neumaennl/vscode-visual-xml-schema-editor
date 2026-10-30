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
} from "../../shared/types.js";
import { toArray } from "../../shared/schemaUtils.js";
import {
  executeAddAnnotation,
  executeRemoveAnnotation,
  executeModifyAnnotation,
  executeAddDocumentation,
  executeRemoveDocumentation,
  executeModifyDocumentation,
} from "./annotationExecutors.js";
import {
  parseDocumentationId,
  parseSchemaAnnotationId,
  parseSchemaDocumentationId,
} from "../commandUtils.js";
import { emptySchema, readTestSchema, schemaWith } from "../__tests__/schemaTestHelpers.js";

// ─── Shared XML fixtures ────────────────────────────────────────────────────

/** The file with an element `person` with an annotation that has one documentation. */
const DOCUMENTED_PERSON_XSD = "person-element-with-documentation.xsd";

/** The file with a schema with two annotations. */
const TWO_ANNOTATIONS_XSD = "schema-with-two-annotations.xsd";

/** The file with an element `person` with an annotation that has two documentations. */
const TWO_DOCUMENTATIONS_XSD = "person-element-with-two-documentations.xsd";

/** A bare element — no annotation. */
const PERSON_ELEMENT = `<xs:element name="person" type="xs:string"/>`;

// ─── parseDocumentationId ────────────────────────────────────────────────────

describe("parseDocumentationId", () => {
  test("parses a simple element path with index 0", () => {
    const result = parseDocumentationId("/element:person/documentation[0]");
    expect(result.elementId).toBe("/element:person");
    expect(result.docIndex).toBe(0);
  });

  test("parses a nested path with index 2", () => {
    const result = parseDocumentationId(
      "/element:person/anonymousComplexType[0]/documentation[2]"
    );
    expect(result.elementId).toBe("/element:person/anonymousComplexType[0]");
    expect(result.docIndex).toBe(2);
  });

  test("throws for an ID without documentation suffix", () => {
    expect(() => parseDocumentationId("/element:person")).toThrow(
      "Invalid documentationId format"
    );
  });

  test("throws for a bare non-path string", () => {
    expect(() => parseDocumentationId("doc1")).toThrow(
      "Invalid documentationId format"
    );
  });
});

// ─── executeAddAnnotation ────────────────────────────────────────────────────

describe("executeAddAnnotation", () => {
  test("creates an annotation with no children when no optional fields are given", () => {
    const schemaObj = schemaWith(PERSON_ELEMENT);
    const command: AddAnnotationCommand = {
      type: "addAnnotation",
      payload: { targetId: "/element:person" },
    };

    executeAddAnnotation(command, schemaObj);

    const elem = toArray(schemaObj.element)[0];
    expect(elem.annotation).toBeDefined();
    expect(toArray(elem.annotation?.documentation)).toHaveLength(0);
    expect(toArray(elem.annotation?.appinfo)).toHaveLength(0);
  });

  test("creates an annotation with a documentation child", () => {
    const schemaObj = schemaWith(PERSON_ELEMENT);
    const command: AddAnnotationCommand = {
      type: "addAnnotation",
      payload: { targetId: "/element:person", documentation: "A person." },
    };

    executeAddAnnotation(command, schemaObj);

    const elem = toArray(schemaObj.element)[0];
    const docs = toArray(elem.annotation?.documentation);
    expect(docs).toHaveLength(1);
    expect(docs[0].value).toBe("A person.");
  });

  test("creates an annotation with an appinfo child", () => {
    const schemaObj = schemaWith(PERSON_ELEMENT);
    const command: AddAnnotationCommand = {
      type: "addAnnotation",
      payload: { targetId: "/element:person", appInfo: "app-info" },
    };

    executeAddAnnotation(command, schemaObj);

    const elem = toArray(schemaObj.element)[0];
    const infos = toArray(elem.annotation?.appinfo);
    expect(infos).toHaveLength(1);
    expect(infos[0].value).toBe("app-info");
  });

  test("creates an annotation with both documentation and appinfo children", () => {
    const schemaObj = schemaWith(PERSON_ELEMENT);
    const command: AddAnnotationCommand = {
      type: "addAnnotation",
      payload: {
        targetId: "/element:person",
        documentation: "doc",
        appInfo: "info",
      },
    };

    executeAddAnnotation(command, schemaObj);

    const elem = toArray(schemaObj.element)[0];
    expect(toArray(elem.annotation?.documentation)[0].value).toBe("doc");
    expect(toArray(elem.annotation?.appinfo)[0].value).toBe("info");
  });

  test("works on a complexType target", () => {
    const schemaObj = schemaWith(`<xs:complexType name="PersonType"/>`);
    const command: AddAnnotationCommand = {
      type: "addAnnotation",
      payload: { targetId: "/complexType:PersonType", documentation: "A type." },
    };

    executeAddAnnotation(command, schemaObj);

    const types = toArray(schemaObj.complexType);
    expect(types[0].annotation).toBeDefined();
    expect(toArray(types[0].annotation?.documentation)[0].value).toBe("A type.");
  });
});

// ─── executeRemoveAnnotation ─────────────────────────────────────────────────

describe("executeRemoveAnnotation", () => {
  test("removes an existing annotation", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
    const command: RemoveAnnotationCommand = {
      type: "removeAnnotation",
      payload: { annotationId: "/element:person" },
    };

    executeRemoveAnnotation(command, schemaObj);

    const elem = toArray(schemaObj.element)[0];
    expect(elem.annotation).toBeUndefined();
  });

});

// ─── executeModifyAnnotation ─────────────────────────────────────────────────

describe("executeModifyAnnotation", () => {
  test("updates documentation text of an existing annotation", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
    const command: ModifyAnnotationCommand = {
      type: "modifyAnnotation",
      payload: { annotationId: "/element:person", documentation: "Updated." },
    };

    executeModifyAnnotation(command, schemaObj);

    const elem = toArray(schemaObj.element)[0];
    expect(toArray(elem.annotation?.documentation)[0].value).toBe("Updated.");
  });

  test("replaces all documentation children with a single new element", () => {
    const schemaObj = readTestSchema(TWO_DOCUMENTATIONS_XSD);
    const command: ModifyAnnotationCommand = {
      type: "modifyAnnotation",
      payload: { annotationId: "/element:person", documentation: "Replaced." },
    };

    executeModifyAnnotation(command, schemaObj);

    const elem = toArray(schemaObj.element)[0];
    const docs = toArray(elem.annotation?.documentation);
    expect(docs).toHaveLength(1);
    expect(docs[0].value).toBe("Replaced.");
  });

  test("creates a documentation child when annotation has none, preserving appinfo", () => {
    // Start with an annotation that only has appinfo
    const schemaObj = schemaWith(`<xs:element name="person" type="xs:string">
  <xs:annotation>
    <xs:appinfo>app</xs:appinfo>
  </xs:annotation>
</xs:element>`);
    const command: ModifyAnnotationCommand = {
      type: "modifyAnnotation",
      payload: { annotationId: "/element:person", documentation: "New doc." },
    };

    executeModifyAnnotation(command, schemaObj);

    const elem = toArray(schemaObj.element)[0];
    const docs = toArray(elem.annotation?.documentation);
    expect(docs).toHaveLength(1);
    expect(docs[0].value).toBe("New doc.");
    // Existing appinfo must be preserved
    const infos = toArray(elem.annotation?.appinfo);
    expect(infos).toHaveLength(1);
    expect(infos[0].value).toBe("app");
  });

  test("updates appinfo text", () => {
    const schemaObj = schemaWith(`<xs:element name="person" type="xs:string">
  <xs:annotation>
    <xs:documentation>A person.</xs:documentation>
    <xs:appinfo>app-specific</xs:appinfo>
  </xs:annotation>
</xs:element>`);
    const command: ModifyAnnotationCommand = {
      type: "modifyAnnotation",
      payload: { annotationId: "/element:person", appInfo: "new-app-info" },
    };

    executeModifyAnnotation(command, schemaObj);

    const elem = toArray(schemaObj.element)[0];
    expect(toArray(elem.annotation?.appinfo)[0].value).toBe("new-app-info");
  });

  test("adds an appinfo child when annotation has none", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
    const command: ModifyAnnotationCommand = {
      type: "modifyAnnotation",
      payload: { annotationId: "/element:person", appInfo: "new-info" },
    };

    executeModifyAnnotation(command, schemaObj);

    const infos = toArray(
      toArray(schemaObj.element)[0].annotation?.appinfo
    );
    expect(infos).toHaveLength(1);
    expect(infos[0].value).toBe("new-info");
  });

});

// ─── executeAddDocumentation ─────────────────────────────────────────────────

describe("executeAddDocumentation", () => {
  test("creates an annotation and appends a documentation element", () => {
    const schemaObj = schemaWith(PERSON_ELEMENT);
    const command: AddDocumentationCommand = {
      type: "addDocumentation",
      payload: { targetId: "/element:person", content: "A person." },
    };

    executeAddDocumentation(command, schemaObj);

    const elem = toArray(schemaObj.element)[0];
    expect(elem.annotation).toBeDefined();
    const docs = toArray(elem.annotation?.documentation);
    expect(docs).toHaveLength(1);
    expect(docs[0].value).toBe("A person.");
  });

  test("appends a second documentation element to an existing annotation", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
    const command: AddDocumentationCommand = {
      type: "addDocumentation",
      payload: { targetId: "/element:person", content: "Second.", lang: "en" },
    };

    executeAddDocumentation(command, schemaObj);

    const docs = toArray(
      toArray(schemaObj.element)[0].annotation?.documentation
    );
    expect(docs).toHaveLength(2);
    expect(docs[1].value).toBe("Second.");
    expect(docs[1]._anyAttributes?.["xml:lang"]).toBe("en");
  });

  test("stores the xml:lang attribute in _anyAttributes", () => {
    const schemaObj = schemaWith(PERSON_ELEMENT);
    const command: AddDocumentationCommand = {
      type: "addDocumentation",
      payload: { targetId: "/element:person", content: "Hallo.", lang: "de" },
    };

    executeAddDocumentation(command, schemaObj);

    const docs = toArray(
      toArray(schemaObj.element)[0].annotation?.documentation
    );
    expect(docs[0]._anyAttributes?.["xml:lang"]).toBe("de");
  });

  test("does not add a lang attribute when lang is not supplied", () => {
    const schemaObj = schemaWith(PERSON_ELEMENT);
    const command: AddDocumentationCommand = {
      type: "addDocumentation",
      payload: { targetId: "/element:person", content: "No lang." },
    };

    executeAddDocumentation(command, schemaObj);

    const docs = toArray(
      toArray(schemaObj.element)[0].annotation?.documentation
    );
    expect(docs[0]._anyAttributes?.["xml:lang"]).toBeUndefined();
  });

});

// ─── executeRemoveDocumentation ──────────────────────────────────────────────

describe("executeRemoveDocumentation", () => {
  test("removes the only documentation element and clears the documentation array", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
    const command: RemoveDocumentationCommand = {
      type: "removeDocumentation",
      payload: { documentationId: "/element:person/documentation[0]" },
    };

    executeRemoveDocumentation(command, schemaObj);

    const elem = toArray(schemaObj.element)[0];
    // annotation stays but documentation array is cleared
    expect(elem.annotation).toBeDefined();
    expect(elem.annotation?.documentation).toBeUndefined();
  });

  test("removes the first of two documentation elements leaving the second", () => {
    const schemaObj = readTestSchema(TWO_DOCUMENTATIONS_XSD);
    const command: RemoveDocumentationCommand = {
      type: "removeDocumentation",
      payload: { documentationId: "/element:person/documentation[0]" },
    };

    executeRemoveDocumentation(command, schemaObj);

    const docs = toArray(
      toArray(schemaObj.element)[0].annotation?.documentation
    );
    expect(docs).toHaveLength(1);
    expect(docs[0]._anyAttributes?.["xml:lang"]).toBe("de");
  });

  test("removes the second of two documentation elements leaving the first", () => {
    const schemaObj = readTestSchema(TWO_DOCUMENTATIONS_XSD);
    const command: RemoveDocumentationCommand = {
      type: "removeDocumentation",
      payload: { documentationId: "/element:person/documentation[1]" },
    };

    executeRemoveDocumentation(command, schemaObj);

    const docs = toArray(
      toArray(schemaObj.element)[0].annotation?.documentation
    );
    expect(docs).toHaveLength(1);
    expect(docs[0]._anyAttributes?.["xml:lang"]).toBe("en");
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
    const command: ModifyDocumentationCommand = {
      type: "modifyDocumentation",
      payload: {
        documentationId: "/element:person/documentation[0]",
        content: "Updated.",
      },
    };

    executeModifyDocumentation(command, schemaObj);

    const docs = toArray(
      toArray(schemaObj.element)[0].annotation?.documentation
    );
    expect(docs[0].value).toBe("Updated.");
  });

  test("sets the xml:lang attribute", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
    const command: ModifyDocumentationCommand = {
      type: "modifyDocumentation",
      payload: {
        documentationId: "/element:person/documentation[0]",
        lang: "fr",
      },
    };

    executeModifyDocumentation(command, schemaObj);

    const docs = toArray(
      toArray(schemaObj.element)[0].annotation?.documentation
    );
    expect(docs[0]._anyAttributes?.["xml:lang"]).toBe("fr");
  });

  test("removes the xml:lang attribute when lang is set to empty string", () => {
    const schemaObj = readTestSchema(TWO_DOCUMENTATIONS_XSD);
    const command: ModifyDocumentationCommand = {
      type: "modifyDocumentation",
      payload: {
        documentationId: "/element:person/documentation[0]",
        lang: "",
      },
    };

    executeModifyDocumentation(command, schemaObj);

    const docs = toArray(
      toArray(schemaObj.element)[0].annotation?.documentation
    );
    expect(docs[0]._anyAttributes?.["xml:lang"]).toBeUndefined();
    // second documentation is unchanged
    expect(docs[1]._anyAttributes?.["xml:lang"]).toBe("de");
  });

  test("updates content and lang simultaneously", () => {
    const schemaObj = readTestSchema(DOCUMENTED_PERSON_XSD);
    const command: ModifyDocumentationCommand = {
      type: "modifyDocumentation",
      payload: {
        documentationId: "/element:person/documentation[0]",
        content: "Aktualisiert.",
        lang: "de",
      },
    };

    executeModifyDocumentation(command, schemaObj);

    const docs = toArray(
      toArray(schemaObj.element)[0].annotation?.documentation
    );
    expect(docs[0].value).toBe("Aktualisiert.");
    expect(docs[0]._anyAttributes?.["xml:lang"]).toBe("de");
  });

  test("modifies the second of two documentation elements leaving the first unchanged", () => {
    const schemaObj = readTestSchema(TWO_DOCUMENTATIONS_XSD);
    const command: ModifyDocumentationCommand = {
      type: "modifyDocumentation",
      payload: {
        documentationId: "/element:person/documentation[1]",
        content: "German updated.",
      },
    };

    executeModifyDocumentation(command, schemaObj);

    const docs = toArray(
      toArray(schemaObj.element)[0].annotation?.documentation
    );
    expect(docs[0].value).toBe("English");
    expect(docs[1].value).toBe("German updated.");
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

// ─── parseSchemaAnnotationId / parseSchemaDocumentationId ───────────────────

describe("parseSchemaAnnotationId", () => {
  test("parses '/schema/annotation[0]'", () => {
    expect(parseSchemaAnnotationId("/schema/annotation[0]")).toBe(0);
  });

  test("parses '/schema/annotation[2]'", () => {
    expect(parseSchemaAnnotationId("/schema/annotation[2]")).toBe(2);
  });

  test("returns null for a non-canonical 'schema/annotation[0]' path", () => {
    expect(parseSchemaAnnotationId("schema/annotation[0]")).toBeNull();
  });

  test("returns null for a non-schema path", () => {
    expect(parseSchemaAnnotationId("/element:person")).toBeNull();
  });

  test("returns null for a plain 'schema'", () => {
    expect(parseSchemaAnnotationId("schema")).toBeNull();
  });
});

describe("parseSchemaDocumentationId", () => {
  test("parses '/schema/annotation[0]/documentation[1]'", () => {
    const result = parseSchemaDocumentationId(
      "/schema/annotation[0]/documentation[1]"
    );
    expect(result).toEqual({ annotIndex: 0, docIndex: 1 });
  });

  test("parses '/schema/annotation[2]/documentation[3]'", () => {
    const result = parseSchemaDocumentationId(
      "/schema/annotation[2]/documentation[3]"
    );
    expect(result).toEqual({ annotIndex: 2, docIndex: 3 });
  });

  test("returns null for a plain '/schema/documentation[0]'", () => {
    expect(parseSchemaDocumentationId("/schema/documentation[0]")).toBeNull();
  });

  test("returns null for a non-canonical 'schema/annotation[0]/documentation[1]' path", () => {
    expect(parseSchemaDocumentationId("schema/annotation[0]/documentation[1]")).toBeNull();
  });

  test("returns null for an element path", () => {
    expect(
      parseSchemaDocumentationId("/element:person/documentation[0]")
    ).toBeNull();
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
    const command: AddAnnotationCommand = {
      type: "addAnnotation",
      payload: { targetId: "/schema", documentation: "My schema." },
    };

    executeAddAnnotation(command, schemaObj);

    const annots = toArray(schemaObj.annotation);
    expect(annots).toHaveLength(1);
    expect(toArray(annots[0].documentation)[0].value).toBe("My schema.");
  });

  test("appends a second annotation when one already exists", () => {
    const schemaObj = schemaWith(SCHEMA_ANNOTATION);
    const command: AddAnnotationCommand = {
      type: "addAnnotation",
      payload: { targetId: "/schema", documentation: "Second annotation." },
    };

    executeAddAnnotation(command, schemaObj);

    const annots = toArray(schemaObj.annotation);
    expect(annots).toHaveLength(2);
    expect(toArray(annots[1].documentation)[0].value).toBe("Second annotation.");
    // First annotation is preserved
    expect(toArray(annots[0].documentation)[0].value).toBe("Schema description.");
  });

  test("adds an annotation with both documentation and appinfo", () => {
    const schemaObj = emptySchema();
    const command: AddAnnotationCommand = {
      type: "addAnnotation",
      payload: { targetId: "/schema", documentation: "desc", appInfo: "info" },
    };

    executeAddAnnotation(command, schemaObj);

    const annotation = toArray(schemaObj.annotation)[0];
    expect(toArray(annotation.documentation)[0].value).toBe("desc");
    expect(toArray(annotation.appinfo)[0].value).toBe("info");
  });
});

describe("executeRemoveAnnotation — schema root", () => {
  test("removes the first schema annotation by index", () => {
    const schemaObj = readTestSchema(TWO_ANNOTATIONS_XSD);
    const command: RemoveAnnotationCommand = {
      type: "removeAnnotation",
      payload: { annotationId: "/schema/annotation[0]" },
    };

    executeRemoveAnnotation(command, schemaObj);

    const annots = toArray(schemaObj.annotation);
    expect(annots).toHaveLength(1);
    expect(toArray(annots[0].documentation)[0].value).toBe("Second.");
  });

  test("removes the second schema annotation by index", () => {
    const schemaObj = readTestSchema(TWO_ANNOTATIONS_XSD);
    const command: RemoveAnnotationCommand = {
      type: "removeAnnotation",
      payload: { annotationId: "/schema/annotation[1]" },
    };

    executeRemoveAnnotation(command, schemaObj);

    const annots = toArray(schemaObj.annotation);
    expect(annots).toHaveLength(1);
    expect(toArray(annots[0].documentation)[0].value).toBe("First.");
  });

  test("removes the only annotation, leaving annotation as undefined", () => {
    const schemaObj = schemaWith(SCHEMA_ANNOTATION);
    const command: RemoveAnnotationCommand = {
      type: "removeAnnotation",
      payload: { annotationId: "/schema/annotation[0]" },
    };

    executeRemoveAnnotation(command, schemaObj);

    expect(schemaObj.annotation).toBeUndefined();
  });

});

describe("executeModifyAnnotation — schema root", () => {
  test("updates documentation on the first schema annotation", () => {
    const schemaObj = schemaWith(SCHEMA_ANNOTATION);
    const command: ModifyAnnotationCommand = {
      type: "modifyAnnotation",
      payload: {
        annotationId: "/schema/annotation[0]",
        documentation: "Updated.",
      },
    };

    executeModifyAnnotation(command, schemaObj);

    const annots = toArray(schemaObj.annotation);
    expect(toArray(annots[0].documentation)[0].value).toBe("Updated.");
  });

  test("updates documentation on the second schema annotation", () => {
    const schemaObj = readTestSchema(TWO_ANNOTATIONS_XSD);
    const command: ModifyAnnotationCommand = {
      type: "modifyAnnotation",
      payload: {
        annotationId: "/schema/annotation[1]",
        documentation: "Second updated.",
      },
    };

    executeModifyAnnotation(command, schemaObj);

    const annots = toArray(schemaObj.annotation);
    expect(toArray(annots[1].documentation)[0].value).toBe("Second updated.");
    // First annotation untouched
    expect(toArray(annots[0].documentation)[0].value).toBe("First.");
  });

});

describe("executeAddDocumentation — schema root", () => {
  test("creates a schema annotation and adds a documentation element (targetId: '/schema')", () => {
    const schemaObj = emptySchema();
    const command: AddDocumentationCommand = {
      type: "addDocumentation",
      payload: { targetId: "/schema", content: "Schema doc." },
    };

    executeAddDocumentation(command, schemaObj);

    const annots = toArray(schemaObj.annotation);
    expect(annots).toHaveLength(1);
    const docs = toArray(annots[0].documentation);
    expect(docs).toHaveLength(1);
    expect(docs[0].value).toBe("Schema doc.");
  });

  test("appends to the first existing annotation (targetId: '/schema')", () => {
    const schemaObj = schemaWith(SCHEMA_ANNOTATION);
    const command: AddDocumentationCommand = {
      type: "addDocumentation",
      payload: { targetId: "/schema", content: "Appended.", lang: "en" },
    };

    executeAddDocumentation(command, schemaObj);

    const docs = toArray(toArray(schemaObj.annotation)[0].documentation);
    expect(docs).toHaveLength(2);
    expect(docs[1].value).toBe("Appended.");
    expect(docs[1]._anyAttributes?.["xml:lang"]).toBe("en");
  });

  test("appends to a specific schema annotation (targetId: '/schema/annotation[N]')", () => {
    const schemaObj = readTestSchema(TWO_ANNOTATIONS_XSD);
    const command: AddDocumentationCommand = {
      type: "addDocumentation",
      payload: {
        targetId: "/schema/annotation[1]",
        content: "Into second annotation.",
      },
    };

    executeAddDocumentation(command, schemaObj);

    const annots = toArray(schemaObj.annotation);
    const docs = toArray(annots[1].documentation);
    expect(docs).toHaveLength(2);
    expect(docs[1].value).toBe("Into second annotation.");
    // First annotation untouched
    expect(toArray(annots[0].documentation)).toHaveLength(1);
  });

});

describe("executeRemoveDocumentation — schema root", () => {
  test("removes a documentation element via '/schema/annotation[N]/documentation[M]' when multiple docs exist", () => {
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

    const annotation = toArray(schemaObj.annotation)[0];
    const docs = toArray(annotation.documentation);
    expect(docs).toHaveLength(1);
    expect(docs[0].value).toBe("Second doc.");
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

    const annotation = toArray(schemaObj.annotation)[0];
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

    const doc = toArray(toArray(schemaObj.annotation)[0].documentation)[0];
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

    const doc = toArray(toArray(schemaObj.annotation)[0].documentation)[0];
    expect(doc.value).toBe("Modified via shorthand.");
  });
});
