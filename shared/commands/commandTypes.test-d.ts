/**
 * Type tests for the commands. The compiler checks them; they are not run.
 * They check the rules of the types that the validators and executors rely on:
 * required fields, the allowed values of maxOccurs and the discriminated union.
 */

import type {
  AddAttributePayload,
  RemoveAttributePayload,
  ModifyAttributePayload,
} from "./attribute.js";
import type {
  AddElementPayload,
  RemoveElementPayload,
  ModifyElementPayload,
} from "./element.js";
import type {
  AddGroupPayload,
  RemoveGroupPayload,
  ModifyGroupPayload,
  RemoveAttributeGroupPayload,
  ModifyAttributeGroupPayload,
} from "./group.js";
import type {
  AddAnnotationPayload,
  RemoveAnnotationPayload,
  ModifyAnnotationPayload,
  AddDocumentationPayload,
  RemoveDocumentationPayload,
  ModifyDocumentationPayload,
} from "./metadata.js";
import type {
  AddImportPayload,
  RemoveImportPayload,
  ModifyImportPayload,
  AddIncludePayload,
  RemoveIncludePayload,
  ModifyIncludePayload,
  ModifySchemaNamespacesPayload,
} from "./module.js";
import type {
  RemoveSimpleTypePayload,
  ModifySimpleTypePayload,
  AddComplexTypePayload,
  RemoveComplexTypePayload,
  ModifyComplexTypePayload,
} from "./schemaTypes.js";
import type { SchemaCommand } from "./index.js";

describe("Command types", () => {
  describe("required fields", () => {
    test("should require the parent and the IDs of element commands", () => {
      expectTypeOf<Omit<AddElementPayload, "parentId">>().not.toExtend<AddElementPayload>();
      expectTypeOf<Omit<RemoveElementPayload, "elementId">>().not.toExtend<RemoveElementPayload>();
      expectTypeOf<Omit<ModifyElementPayload, "elementId">>().not.toExtend<ModifyElementPayload>();
    });

    test("should require the parent and the IDs of attribute commands", () => {
      expectTypeOf<Omit<AddAttributePayload, "parentId">>().not.toExtend<AddAttributePayload>();
      expectTypeOf<Omit<RemoveAttributePayload, "attributeId">>().not.toExtend<RemoveAttributePayload>();
      expectTypeOf<Omit<ModifyAttributePayload, "attributeId">>().not.toExtend<ModifyAttributePayload>();
    });

    test("should require the IDs of group and attribute group commands", () => {
      expectTypeOf<Omit<RemoveGroupPayload, "groupId">>().not.toExtend<RemoveGroupPayload>();
      expectTypeOf<Omit<ModifyGroupPayload, "groupId">>().not.toExtend<ModifyGroupPayload>();
      expectTypeOf<Omit<RemoveAttributeGroupPayload, "groupId">>().not.toExtend<RemoveAttributeGroupPayload>();
      expectTypeOf<Omit<ModifyAttributeGroupPayload, "groupId">>().not.toExtend<ModifyAttributeGroupPayload>();
    });

    test("should require the IDs of type commands and the content model of a new complex type", () => {
      expectTypeOf<Omit<RemoveSimpleTypePayload, "typeId">>().not.toExtend<RemoveSimpleTypePayload>();
      expectTypeOf<Omit<ModifySimpleTypePayload, "typeId">>().not.toExtend<ModifySimpleTypePayload>();
      expectTypeOf<Omit<AddComplexTypePayload, "contentModel">>().not.toExtend<AddComplexTypePayload>();
      expectTypeOf<Omit<RemoveComplexTypePayload, "typeId">>().not.toExtend<RemoveComplexTypePayload>();
      expectTypeOf<Omit<ModifyComplexTypePayload, "typeId">>().not.toExtend<ModifyComplexTypePayload>();
    });

    test("should require the target, the IDs and the content of annotation and documentation commands", () => {
      expectTypeOf<Omit<AddAnnotationPayload, "targetId">>().not.toExtend<AddAnnotationPayload>();
      expectTypeOf<Omit<RemoveAnnotationPayload, "annotationId">>().not.toExtend<RemoveAnnotationPayload>();
      expectTypeOf<Omit<ModifyAnnotationPayload, "annotationId">>().not.toExtend<ModifyAnnotationPayload>();
      expectTypeOf<Omit<AddDocumentationPayload, "targetId">>().not.toExtend<AddDocumentationPayload>();
      expectTypeOf<Omit<AddDocumentationPayload, "content">>().not.toExtend<AddDocumentationPayload>();
      expectTypeOf<Omit<RemoveDocumentationPayload, "documentationId">>().not.toExtend<RemoveDocumentationPayload>();
      expectTypeOf<Omit<ModifyDocumentationPayload, "documentationId">>().not.toExtend<ModifyDocumentationPayload>();
    });

    test("should require the namespace, the schema locations and the IDs of import and include commands", () => {
      expectTypeOf<Omit<AddImportPayload, "namespace">>().not.toExtend<AddImportPayload>();
      expectTypeOf<Omit<AddImportPayload, "schemaLocation">>().not.toExtend<AddImportPayload>();
      expectTypeOf<Omit<RemoveImportPayload, "importId">>().not.toExtend<RemoveImportPayload>();
      expectTypeOf<Omit<ModifyImportPayload, "importId">>().not.toExtend<ModifyImportPayload>();
      expectTypeOf<Omit<AddIncludePayload, "schemaLocation">>().not.toExtend<AddIncludePayload>();
      expectTypeOf<Omit<RemoveIncludePayload, "includeId">>().not.toExtend<RemoveIncludePayload>();
      expectTypeOf<Omit<ModifyIncludePayload, "includeId">>().not.toExtend<ModifyIncludePayload>();
      expectTypeOf<Omit<ModifyIncludePayload, "schemaLocation">>().not.toExtend<ModifyIncludePayload>();
      expectTypeOf<
        Omit<ModifySchemaNamespacesPayload, "namespacePrefixes">
      >().not.toExtend<ModifySchemaNamespacesPayload>();
    });
  });

  describe("maxOccurs", () => {
    test("should accept a number and 'unbounded' but no other string", () => {
      expectTypeOf<number>().toExtend<AddElementPayload["maxOccurs"]>();
      expectTypeOf<"unbounded">().toExtend<AddElementPayload["maxOccurs"]>();
      expectTypeOf<"many">().not.toExtend<AddElementPayload["maxOccurs"]>();
      expectTypeOf<"5">().not.toExtend<AddElementPayload["maxOccurs"]>();
    });

    test("should allow the same values in all payloads that have maxOccurs", () => {
      expectTypeOf<ModifyElementPayload["maxOccurs"]>().toEqualTypeOf<AddElementPayload["maxOccurs"]>();
      expectTypeOf<AddGroupPayload["maxOccurs"]>().toEqualTypeOf<AddElementPayload["maxOccurs"]>();
      expectTypeOf<ModifyGroupPayload["maxOccurs"]>().toEqualTypeOf<AddElementPayload["maxOccurs"]>();
    });
  });

  describe("SchemaCommand", () => {
    test("should reject an unknown command type", () => {
      expectTypeOf<{ type: "addWidget"; payload: AddElementPayload }>().not.toExtend<SchemaCommand>();
    });

    test("should reject a payload that does not belong to the command type", () => {
      expectTypeOf<{ type: "addElement"; payload: AddElementPayload }>().toExtend<SchemaCommand>();
      expectTypeOf<{ type: "addElement"; payload: RemoveElementPayload }>().not.toExtend<SchemaCommand>();
    });
  });
});
