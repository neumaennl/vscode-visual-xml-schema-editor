/**
 * Unit tests for annotation and documentation command types.
 */

import {
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
} from "../../commands/metadata";

describe("Annotation Commands", () => {
  test("AddAnnotationCommand should have correct structure", () => {
    const command: AddAnnotationCommand = {
      type: "addAnnotation",
      payload: {
        targetId: "element-123",
        documentation: "This is documentation",
        appInfo: "Application specific info",
      },
    };

    expect(command.type).toBe("addAnnotation");
    expect(command.payload.targetId).toBe("element-123");
    expect(command.payload.documentation).toBe("This is documentation");
  });

  test("RemoveAnnotationCommand should have correct structure", () => {
    const command: RemoveAnnotationCommand = {
      type: "removeAnnotation",
      payload: {
        annotationId: "annotation-123",
      },
    };

    expect(command.type).toBe("removeAnnotation");
    expect(command.payload.annotationId).toBe("annotation-123");
  });

  test("ModifyAnnotationCommand should have correct structure", () => {
    const command: ModifyAnnotationCommand = {
      type: "modifyAnnotation",
      payload: {
        annotationId: "annotation-456",
        documentation: "Updated documentation",
      },
    };

    expect(command.payload.documentation).toBe("Updated documentation");
  });
});

describe("Documentation Commands", () => {
  test("AddDocumentationCommand should have correct structure", () => {
    const command: AddDocumentationCommand = {
      type: "addDocumentation",
      payload: {
        targetId: "element-123",
        content: "Documentation content",
        lang: "en",
      },
    };

    expect(command.type).toBe("addDocumentation");
    expect(command.payload.content).toBe("Documentation content");
    expect(command.payload.lang).toBe("en");
  });

  test("RemoveDocumentationCommand should have correct structure", () => {
    const command: RemoveDocumentationCommand = {
      type: "removeDocumentation",
      payload: {
        documentationId: "doc-123",
      },
    };

    expect(command.type).toBe("removeDocumentation");
    expect(command.payload.documentationId).toBe("doc-123");
  });

  test("ModifyDocumentationCommand should have correct structure", () => {
    const command: ModifyDocumentationCommand = {
      type: "modifyDocumentation",
      payload: {
        documentationId: "doc-456",
        content: "Updated content",
      },
    };

    expect(command.payload.content).toBe("Updated content");
  });
});
