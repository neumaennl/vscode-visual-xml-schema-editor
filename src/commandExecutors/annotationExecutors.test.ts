/**
 * Unit tests for annotation and documentation executors.
 *
 * ID Conventions used throughout these tests:
 * - annotationId / targetId for non-schema nodes: XPath-like path
 *   (e.g. "/element:person").
 * - annotationId for schema-root annotations: "schema/annotation[N]"
 * - documentationId for non-schema nodes: "{elementPath}/documentation[N]"
 * - documentationId for schema-root annotations:
 *     "schema/annotation[N]/documentation[M]" or "schema/documentation[N]"
 *
 * Note on references: xs:annotation, xs:documentation, and xs:appinfo have no
 * `ref` attribute in the XSD specification. No reference support is implemented
 * or tested here.
 */

import { describe, it, expect } from "vitest";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";
import {
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import {
  executeAddAnnotation,
  executeRemoveAnnotation,
  executeModifyAnnotation,
  executeAddDocumentation,
  executeRemoveDocumentation,
  executeModifyDocumentation,
} from "./annotationExecutors";
import {
  parseDocumentationId,
  parseSchemaAnnotationId,
  parseSchemaDocumentationId,
} from "../commandUtils";

// ─── Shared XML fixtures ────────────────────────────────────────────────────

/** Schema with a bare element — no annotation. */
const elementSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
</xs:schema>`;

/** Schema with a complexType. */
const complexTypeSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType"/>
</xs:schema>`;

/** Schema with an annotated element and one documentation child. */
const annotatedElementXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string">
    <xs:annotation>
      <xs:documentation>A person.</xs:documentation>
    </xs:annotation>
  </xs:element>
</xs:schema>`;

/** Schema with an annotated element and two documentation children. */
const twoDocumentationXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string">
    <xs:annotation>
      <xs:documentation xml:lang="en">English</xs:documentation>
      <xs:documentation xml:lang="de">Deutsch</xs:documentation>
    </xs:annotation>
  </xs:element>
</xs:schema>`;

/** Schema with an annotated element that also has an appinfo child. */
const annotatedWithAppinfoXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string">
    <xs:annotation>
      <xs:documentation>A person.</xs:documentation>
      <xs:appinfo>app-specific</xs:appinfo>
    </xs:annotation>
  </xs:element>
</xs:schema>`;

// ─── parseDocumentationId ────────────────────────────────────────────────────

describe("parseDocumentationId", () => {
  it("parses a simple element path with index 0", () => {
    const result = parseDocumentationId("/element:person/documentation[0]");
    expect(result.elementId).toBe("/element:person");
    expect(result.docIndex).toBe(0);
  });

  it("parses a nested path with index 2", () => {
    const result = parseDocumentationId(
      "/element:person/anonymousComplexType[0]/documentation[2]"
    );
    expect(result.elementId).toBe("/element:person/anonymousComplexType[0]");
    expect(result.docIndex).toBe(2);
  });

  it("throws for an ID without documentation suffix", () => {
    expect(() => parseDocumentationId("/element:person")).toThrow(
      "Invalid documentationId format"
    );
  });

  it("throws for a bare non-path string", () => {
    expect(() => parseDocumentationId("doc1")).toThrow(
      "Invalid documentationId format"
    );
  });
});

// ─── executeAddAnnotation ────────────────────────────────────────────────────

describe("executeAddAnnotation", () => {
  it("creates an annotation with no children when no optional fields are given", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
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

  it("creates an annotation with a documentation child", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
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

  it("creates an annotation with an appinfo child", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
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

  it("creates an annotation with both documentation and appinfo children", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
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

  it("works on a complexType target", () => {
    const schemaObj = unmarshal(schema, complexTypeSchemaXml);
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
  it("removes an existing annotation", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
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
  it("updates documentation text of an existing annotation", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
    const command: ModifyAnnotationCommand = {
      type: "modifyAnnotation",
      payload: { annotationId: "/element:person", documentation: "Updated." },
    };

    executeModifyAnnotation(command, schemaObj);

    const elem = toArray(schemaObj.element)[0];
    expect(toArray(elem.annotation?.documentation)[0].value).toBe("Updated.");
  });

  it("replaces all documentation children with a single new element", () => {
    const schemaObj = unmarshal(schema, twoDocumentationXml);
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

  it("creates a documentation child when annotation has none, preserving appinfo", () => {
    // Start with an annotation that only has appinfo
    const onlyAppinfoXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string">
    <xs:annotation>
      <xs:appinfo>app</xs:appinfo>
    </xs:annotation>
  </xs:element>
</xs:schema>`;
    const schemaObj = unmarshal(schema, onlyAppinfoXml);
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

  it("updates appinfo text", () => {
    const schemaObj = unmarshal(schema, annotatedWithAppinfoXml);
    const command: ModifyAnnotationCommand = {
      type: "modifyAnnotation",
      payload: { annotationId: "/element:person", appInfo: "new-app-info" },
    };

    executeModifyAnnotation(command, schemaObj);

    const elem = toArray(schemaObj.element)[0];
    expect(toArray(elem.annotation?.appinfo)[0].value).toBe("new-app-info");
  });

  it("adds an appinfo child when annotation has none", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
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
  it("creates an annotation and appends a documentation element", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
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

  it("appends a second documentation element to an existing annotation", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
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

  it("stores the xml:lang attribute in _anyAttributes", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
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

  it("does not add a lang attribute when lang is not supplied", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
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
  it("removes the only documentation element and clears the documentation array", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
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

  it("removes the first of two documentation elements leaving the second", () => {
    const schemaObj = unmarshal(schema, twoDocumentationXml);
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

  it("removes the second of two documentation elements leaving the first", () => {
    const schemaObj = unmarshal(schema, twoDocumentationXml);
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

  it("throws for an invalid documentationId format", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
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
  it("updates the content of an existing documentation element", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
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

  it("sets the xml:lang attribute", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
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

  it("removes the xml:lang attribute when lang is set to empty string", () => {
    const schemaObj = unmarshal(schema, twoDocumentationXml);
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

  it("updates content and lang simultaneously", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
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

  it("modifies the second of two documentation elements leaving the first unchanged", () => {
    const schemaObj = unmarshal(schema, twoDocumentationXml);
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

  it("throws for an invalid documentationId format", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
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
  it("parses 'schema/annotation[0]'", () => {
    expect(parseSchemaAnnotationId("schema/annotation[0]")).toBe(0);
  });

  it("parses '/schema/annotation[2]'", () => {
    expect(parseSchemaAnnotationId("/schema/annotation[2]")).toBe(2);
  });

  it("returns null for a non-schema path", () => {
    expect(parseSchemaAnnotationId("/element:person")).toBeNull();
  });

  it("returns null for a plain 'schema'", () => {
    expect(parseSchemaAnnotationId("schema")).toBeNull();
  });
});

describe("parseSchemaDocumentationId", () => {
  it("parses 'schema/annotation[0]/documentation[1]'", () => {
    const result = parseSchemaDocumentationId(
      "schema/annotation[0]/documentation[1]"
    );
    expect(result).toEqual({ annotIndex: 0, docIndex: 1 });
  });

  it("parses '/schema/annotation[2]/documentation[3]'", () => {
    const result = parseSchemaDocumentationId(
      "/schema/annotation[2]/documentation[3]"
    );
    expect(result).toEqual({ annotIndex: 2, docIndex: 3 });
  });

  it("returns null for a plain 'schema/documentation[0]'", () => {
    expect(parseSchemaDocumentationId("schema/documentation[0]")).toBeNull();
  });

  it("returns null for an element path", () => {
    expect(
      parseSchemaDocumentationId("/element:person/documentation[0]")
    ).toBeNull();
  });
});

// ─── Schema-root annotation operations ──────────────────────────────────────

/** Schema with NO annotations at all. */
const bareSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;

/** Schema with a single annotation on the schema element. */
const schemaWithAnnotationXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:annotation>
    <xs:documentation>Schema description.</xs:documentation>
  </xs:annotation>
</xs:schema>`;

/** Schema with two annotations on the schema element. */
const schemaWithTwoAnnotationsXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:annotation>
    <xs:documentation>First.</xs:documentation>
  </xs:annotation>
  <xs:annotation>
    <xs:documentation>Second.</xs:documentation>
  </xs:annotation>
</xs:schema>`;

describe("executeAddAnnotation — schema root", () => {
  it("appends a new annotation to an empty schema", () => {
    const schemaObj = unmarshal(schema, bareSchemaXml);
    const command: AddAnnotationCommand = {
      type: "addAnnotation",
      payload: { targetId: "schema", documentation: "My schema." },
    };

    executeAddAnnotation(command, schemaObj);

    const annots = toArray(schemaObj.annotation);
    expect(annots).toHaveLength(1);
    expect(toArray(annots[0].documentation)[0].value).toBe("My schema.");
  });

  it("appends a second annotation when one already exists", () => {
    const schemaObj = unmarshal(schema, schemaWithAnnotationXml);
    const command: AddAnnotationCommand = {
      type: "addAnnotation",
      payload: { targetId: "schema", documentation: "Second annotation." },
    };

    executeAddAnnotation(command, schemaObj);

    const annots = toArray(schemaObj.annotation);
    expect(annots).toHaveLength(2);
    expect(toArray(annots[1].documentation)[0].value).toBe("Second annotation.");
    // First annotation is preserved
    expect(toArray(annots[0].documentation)[0].value).toBe("Schema description.");
  });

  it("adds an annotation with both documentation and appinfo", () => {
    const schemaObj = unmarshal(schema, bareSchemaXml);
    const command: AddAnnotationCommand = {
      type: "addAnnotation",
      payload: { targetId: "schema", documentation: "desc", appInfo: "info" },
    };

    executeAddAnnotation(command, schemaObj);

    const annotation = toArray(schemaObj.annotation)[0];
    expect(toArray(annotation.documentation)[0].value).toBe("desc");
    expect(toArray(annotation.appinfo)[0].value).toBe("info");
  });
});

describe("executeRemoveAnnotation — schema root", () => {
  it("removes the first schema annotation by index", () => {
    const schemaObj = unmarshal(schema, schemaWithTwoAnnotationsXml);
    const command: RemoveAnnotationCommand = {
      type: "removeAnnotation",
      payload: { annotationId: "schema/annotation[0]" },
    };

    executeRemoveAnnotation(command, schemaObj);

    const annots = toArray(schemaObj.annotation);
    expect(annots).toHaveLength(1);
    expect(toArray(annots[0].documentation)[0].value).toBe("Second.");
  });

  it("removes the second schema annotation by index", () => {
    const schemaObj = unmarshal(schema, schemaWithTwoAnnotationsXml);
    const command: RemoveAnnotationCommand = {
      type: "removeAnnotation",
      payload: { annotationId: "schema/annotation[1]" },
    };

    executeRemoveAnnotation(command, schemaObj);

    const annots = toArray(schemaObj.annotation);
    expect(annots).toHaveLength(1);
    expect(toArray(annots[0].documentation)[0].value).toBe("First.");
  });

  it("removes the only annotation, leaving annotation as undefined", () => {
    const schemaObj = unmarshal(schema, schemaWithAnnotationXml);
    const command: RemoveAnnotationCommand = {
      type: "removeAnnotation",
      payload: { annotationId: "schema/annotation[0]" },
    };

    executeRemoveAnnotation(command, schemaObj);

    expect(schemaObj.annotation).toBeUndefined();
  });

});

describe("executeModifyAnnotation — schema root", () => {
  it("updates documentation on the first schema annotation", () => {
    const schemaObj = unmarshal(schema, schemaWithAnnotationXml);
    const command: ModifyAnnotationCommand = {
      type: "modifyAnnotation",
      payload: {
        annotationId: "schema/annotation[0]",
        documentation: "Updated.",
      },
    };

    executeModifyAnnotation(command, schemaObj);

    const annots = toArray(schemaObj.annotation);
    expect(toArray(annots[0].documentation)[0].value).toBe("Updated.");
  });

  it("updates documentation on the second schema annotation", () => {
    const schemaObj = unmarshal(schema, schemaWithTwoAnnotationsXml);
    const command: ModifyAnnotationCommand = {
      type: "modifyAnnotation",
      payload: {
        annotationId: "schema/annotation[1]",
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
  it("creates a schema annotation and adds a documentation element (targetId: 'schema')", () => {
    const schemaObj = unmarshal(schema, bareSchemaXml);
    const command: AddDocumentationCommand = {
      type: "addDocumentation",
      payload: { targetId: "schema", content: "Schema doc." },
    };

    executeAddDocumentation(command, schemaObj);

    const annots = toArray(schemaObj.annotation);
    expect(annots).toHaveLength(1);
    const docs = toArray(annots[0].documentation);
    expect(docs).toHaveLength(1);
    expect(docs[0].value).toBe("Schema doc.");
  });

  it("appends to the first existing annotation (targetId: 'schema')", () => {
    const schemaObj = unmarshal(schema, schemaWithAnnotationXml);
    const command: AddDocumentationCommand = {
      type: "addDocumentation",
      payload: { targetId: "schema", content: "Appended.", lang: "en" },
    };

    executeAddDocumentation(command, schemaObj);

    const docs = toArray(toArray(schemaObj.annotation)[0].documentation);
    expect(docs).toHaveLength(2);
    expect(docs[1].value).toBe("Appended.");
    expect(docs[1]._anyAttributes?.["xml:lang"]).toBe("en");
  });

  it("appends to a specific schema annotation (targetId: 'schema/annotation[N]')", () => {
    const schemaObj = unmarshal(schema, schemaWithTwoAnnotationsXml);
    const command: AddDocumentationCommand = {
      type: "addDocumentation",
      payload: {
        targetId: "schema/annotation[1]",
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
  it("removes a documentation element via 'schema/annotation[N]/documentation[M]' when multiple docs exist", () => {
    const schemaObj = unmarshal(schema, schemaWithAnnotationXml);

    // Add a second documentation node to the first schema annotation
    const addCommand: AddDocumentationCommand = {
      type: "addDocumentation",
      payload: {
        targetId: "schema/annotation[0]",
        content: "Second doc.",
      },
    };
    executeAddDocumentation(addCommand, schemaObj);

    // Remove the first documentation entry
    executeRemoveDocumentation(
      {
        type: "removeDocumentation",
        payload: {
          documentationId: "schema/annotation[0]/documentation[0]",
        },
      } as RemoveDocumentationCommand,
      schemaObj
    );

    const annotation = toArray(schemaObj.annotation)[0];
    const docs = toArray(annotation.documentation);
    expect(docs).toHaveLength(1);
    expect(docs[0].value).toBe("Second doc.");
  });

  it("removes a documentation element via 'schema/documentation[N]' shorthand", () => {
    const schemaObj = unmarshal(schema, schemaWithAnnotationXml);
    executeRemoveDocumentation(
      {
        type: "removeDocumentation",
        payload: { documentationId: "schema/documentation[0]" },
      } as RemoveDocumentationCommand,
      schemaObj
    );

    const annotation = toArray(schemaObj.annotation)[0];
    // When the last documentation is removed, the property should be undefined
    expect(annotation.documentation).toBeUndefined();
  });

});

describe("executeModifyDocumentation — schema root", () => {
  it("modifies a documentation element via 'schema/annotation[N]/documentation[M]'", () => {
    const schemaObj = unmarshal(schema, schemaWithAnnotationXml);
    executeModifyDocumentation(
      {
        type: "modifyDocumentation",
        payload: {
          documentationId: "schema/annotation[0]/documentation[0]",
          content: "Modified.",
          lang: "en",
        },
      } as ModifyDocumentationCommand,
      schemaObj
    );

    const doc = toArray(toArray(schemaObj.annotation)[0].documentation)[0];
    expect(doc.value).toBe("Modified.");
    expect(doc._anyAttributes?.["xml:lang"]).toBe("en");
  });

  it("modifies a documentation element via 'schema/documentation[N]' shorthand", () => {
    const schemaObj = unmarshal(schema, schemaWithAnnotationXml);
    executeModifyDocumentation(
      {
        type: "modifyDocumentation",
        payload: {
          documentationId: "schema/documentation[0]",
          content: "Modified via shorthand.",
        },
      } as ModifyDocumentationCommand,
      schemaObj
    );

    const doc = toArray(toArray(schemaObj.annotation)[0].documentation)[0];
    expect(doc.value).toBe("Modified via shorthand.");
  });
});
