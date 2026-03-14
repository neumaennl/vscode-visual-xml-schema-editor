/**
 * Unit tests for annotation and documentation executors.
 *
 * ID Conventions used throughout these tests:
 * - annotationId / targetId: XPath-like path to the annotated schema component
 *   (e.g. "/element:person").
 * - documentationId: annotated-element path + "/documentation[N]"
 *   (e.g. "/element:person/documentation[0]").
 *
 * Note on references: xs:annotation, xs:documentation, and xs:appinfo have no
 * `ref` attribute in the XSD specification. No reference support is implemented
 * or tested here.
 */

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
  parseDocumentationId,
} from "./annotationExecutors";

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

  it("replaces an existing annotation", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
    const command: AddAnnotationCommand = {
      type: "addAnnotation",
      payload: { targetId: "/element:person", documentation: "New doc." },
    };

    executeAddAnnotation(command, schemaObj);

    const elem = toArray(schemaObj.element)[0];
    const docs = toArray(elem.annotation?.documentation);
    expect(docs).toHaveLength(1);
    expect(docs[0].value).toBe("New doc.");
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

  it("throws when target node is not found", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
    const command: AddAnnotationCommand = {
      type: "addAnnotation",
      payload: { targetId: "/element:missing" },
    };

    expect(() => executeAddAnnotation(command, schemaObj)).toThrow("not found");
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

  it("throws when the element has no annotation", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
    const command: RemoveAnnotationCommand = {
      type: "removeAnnotation",
      payload: { annotationId: "/element:person" },
    };

    expect(() => executeRemoveAnnotation(command, schemaObj)).toThrow(
      "No annotation"
    );
  });

  it("throws when the target node is not found", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
    const command: RemoveAnnotationCommand = {
      type: "removeAnnotation",
      payload: { annotationId: "/element:missing" },
    };

    expect(() => executeRemoveAnnotation(command, schemaObj)).toThrow(
      "not found"
    );
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

  it("adds a documentation child when annotation has none", () => {
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

    const docs = toArray(
      toArray(schemaObj.element)[0].annotation?.documentation
    );
    expect(docs).toHaveLength(1);
    expect(docs[0].value).toBe("New doc.");
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

  it("throws when element has no annotation", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
    const command: ModifyAnnotationCommand = {
      type: "modifyAnnotation",
      payload: { annotationId: "/element:person", documentation: "x" },
    };

    expect(() => executeModifyAnnotation(command, schemaObj)).toThrow(
      "No annotation"
    );
  });

  it("throws when the target node is not found", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
    const command: ModifyAnnotationCommand = {
      type: "modifyAnnotation",
      payload: { annotationId: "/element:missing", documentation: "x" },
    };

    expect(() => executeModifyAnnotation(command, schemaObj)).toThrow(
      "not found"
    );
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

  it("throws when the target node is not found", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
    const command: AddDocumentationCommand = {
      type: "addDocumentation",
      payload: { targetId: "/element:missing", content: "x" },
    };

    expect(() => executeAddDocumentation(command, schemaObj)).toThrow(
      "not found"
    );
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

  it("throws when the element has no annotation", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
    const command: RemoveDocumentationCommand = {
      type: "removeDocumentation",
      payload: { documentationId: "/element:person/documentation[0]" },
    };

    expect(() => executeRemoveDocumentation(command, schemaObj)).toThrow(
      "No annotation"
    );
  });

  it("throws when the documentation index is out of bounds", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
    const command: RemoveDocumentationCommand = {
      type: "removeDocumentation",
      payload: { documentationId: "/element:person/documentation[5]" },
    };

    expect(() => executeRemoveDocumentation(command, schemaObj)).toThrow(
      "out of bounds"
    );
  });

  it("throws when the element is not found", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
    const command: RemoveDocumentationCommand = {
      type: "removeDocumentation",
      payload: { documentationId: "/element:missing/documentation[0]" },
    };

    expect(() => executeRemoveDocumentation(command, schemaObj)).toThrow(
      "not found"
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

  it("throws when the element has no annotation", () => {
    const schemaObj = unmarshal(schema, elementSchemaXml);
    const command: ModifyDocumentationCommand = {
      type: "modifyDocumentation",
      payload: {
        documentationId: "/element:person/documentation[0]",
        content: "x",
      },
    };

    expect(() => executeModifyDocumentation(command, schemaObj)).toThrow(
      "No annotation"
    );
  });

  it("throws when the documentation index is out of bounds", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
    const command: ModifyDocumentationCommand = {
      type: "modifyDocumentation",
      payload: {
        documentationId: "/element:person/documentation[9]",
        content: "x",
      },
    };

    expect(() => executeModifyDocumentation(command, schemaObj)).toThrow(
      "out of bounds"
    );
  });

  it("throws when the element is not found", () => {
    const schemaObj = unmarshal(schema, annotatedElementXml);
    const command: ModifyDocumentationCommand = {
      type: "modifyDocumentation",
      payload: {
        documentationId: "/element:missing/documentation[0]",
        content: "x",
      },
    };

    expect(() => executeModifyDocumentation(command, schemaObj)).toThrow(
      "not found"
    );
  });
});
