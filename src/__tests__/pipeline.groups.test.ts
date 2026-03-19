/**
 * Integration tests: group and attributeGroup add / remove / modify pipeline.
 *
 * Covers named model groups and attribute groups, both definitions and references.
 * Success-path assertions are made against the unmarshalled schema object.
 */

import type {
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import {
  MINIMAL_SCHEMA,
  SCHEMA_WITH_GROUP,
  SCHEMA_WITH_ATTRIBUTEGROUP,
  runCommandExpectSuccessSchema,
  runCommandExpectValidationFailure,
} from "./testHelpers";

describe("Integration: Group pipeline", () => {
  // ─── addGroup ──────────────────────────────────────────────────────────────

  describe("addGroup", () => {
    it("adds a top-level named group with a sequence content model", () => {
      const cmd: AddGroupCommand = {
        type: "addGroup",
        payload: { groupName: "AddressGroup", contentModel: "sequence" },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const groups = toArray(result.group);
      const addressGroup = groups.find((g) => g.name === "AddressGroup");

      expect(addressGroup).toBeDefined();
      expect(addressGroup!.sequence).toBeDefined();
      expect(addressGroup!.choice).toBeUndefined();
    });

    it("adds a group with a choice content model", () => {
      const cmd: AddGroupCommand = {
        type: "addGroup",
        payload: { groupName: "ChoiceGroup", contentModel: "choice" },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const choiceGroup = toArray(result.group).find((g) => g.name === "ChoiceGroup");

      expect(choiceGroup).toBeDefined();
      expect(choiceGroup!.choice).toBeDefined();
      expect(choiceGroup!.sequence).toBeUndefined();
    });

    it("returns validation error for duplicate group name", () => {
      const cmd: AddGroupCommand = {
        type: "addGroup",
        payload: { groupName: "ContactGroup", contentModel: "sequence" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_GROUP, cmd, "ContactGroup");
    });

    it("returns validation error when group name is invalid", () => {
      const cmd: AddGroupCommand = {
        type: "addGroup",
        payload: { groupName: "bad group", contentModel: "sequence" },
      };

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "valid XML name");
    });
  });

  // ─── removeGroup ───────────────────────────────────────────────────────────

  describe("removeGroup", () => {
    it("removes an existing top-level group", () => {
      const cmd: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/group:ContactGroup" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_GROUP, cmd);
      const groups = toArray(result.group);

      expect(groups.some((g) => g.name === "ContactGroup")).toBe(false);
    });

    it("returns validation error when group ID does not exist", () => {
      const cmd: RemoveGroupCommand = {
        type: "removeGroup",
        payload: { groupId: "/group:NoSuchGroup" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_GROUP, cmd, "NoSuchGroup");
    });
  });

  // ─── modifyGroup ───────────────────────────────────────────────────────────

  describe("modifyGroup", () => {
    it("renames an existing group", () => {
      const cmd: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: { groupId: "/group:ContactGroup", groupName: "CommunicationGroup" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_GROUP, cmd);
      const groups = toArray(result.group);

      expect(groups.some((g) => g.name === "CommunicationGroup")).toBe(true);
      expect(groups.some((g) => g.name === "ContactGroup")).toBe(false);
    });

    it("returns validation error when group ID does not exist", () => {
      const cmd: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: { groupId: "/group:Ghost", groupName: "Other" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_GROUP, cmd, "Ghost");
    });
  });
});

describe("Integration: AttributeGroup pipeline", () => {
  // ─── addAttributeGroup ─────────────────────────────────────────────────────

  describe("addAttributeGroup", () => {
    it("adds a top-level named attributeGroup", () => {
      const cmd: AddAttributeGroupCommand = {
        type: "addAttributeGroup",
        payload: { groupName: "AuditAttributes" },
      };

      const result = runCommandExpectSuccessSchema(MINIMAL_SCHEMA, cmd);
      const groups = toArray(result.attributeGroup);

      expect(groups.some((g) => g.name === "AuditAttributes")).toBe(true);
    });

    it("returns validation error for duplicate attributeGroup name", () => {
      const cmd: AddAttributeGroupCommand = {
        type: "addAttributeGroup",
        payload: { groupName: "CommonAttrs" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ATTRIBUTEGROUP, cmd, "CommonAttrs");
    });

    it("returns validation error when group name is invalid", () => {
      const cmd: AddAttributeGroupCommand = {
        type: "addAttributeGroup",
        payload: { groupName: "bad name" },
      };

      runCommandExpectValidationFailure(MINIMAL_SCHEMA, cmd, "valid XML name");
    });
  });

  // ─── removeAttributeGroup ──────────────────────────────────────────────────

  describe("removeAttributeGroup", () => {
    it("removes an existing top-level attributeGroup", () => {
      const cmd: RemoveAttributeGroupCommand = {
        type: "removeAttributeGroup",
        payload: { groupId: "/attributeGroup:CommonAttrs" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ATTRIBUTEGROUP, cmd);
      const groups = toArray(result.attributeGroup);

      expect(groups.some((g) => g.name === "CommonAttrs")).toBe(false);
    });

    it("returns validation error when group ID does not exist", () => {
      const cmd: RemoveAttributeGroupCommand = {
        type: "removeAttributeGroup",
        payload: { groupId: "/attributeGroup:Missing" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ATTRIBUTEGROUP, cmd, "Missing");
    });
  });

  // ─── modifyAttributeGroup ──────────────────────────────────────────────────

  describe("modifyAttributeGroup", () => {
    it("renames an existing attributeGroup", () => {
      const cmd: ModifyAttributeGroupCommand = {
        type: "modifyAttributeGroup",
        payload: { groupId: "/attributeGroup:CommonAttrs", groupName: "SharedAttrs" },
      };

      const result = runCommandExpectSuccessSchema(SCHEMA_WITH_ATTRIBUTEGROUP, cmd);
      const groups = toArray(result.attributeGroup);

      expect(groups.some((g) => g.name === "SharedAttrs")).toBe(true);
      expect(groups.some((g) => g.name === "CommonAttrs")).toBe(false);
    });

    it("returns validation error when group ID does not exist", () => {
      const cmd: ModifyAttributeGroupCommand = {
        type: "modifyAttributeGroup",
        payload: { groupId: "/attributeGroup:NoSuch", groupName: "Other" },
      };

      runCommandExpectValidationFailure(SCHEMA_WITH_ATTRIBUTEGROUP, cmd, "NoSuch");
    });
  });
});
