/**
 * Integration tests: group and attributeGroup add / remove / modify pipeline.
 *
 * Covers named model groups and attribute groups, both definitions and references.
 */

import type {
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
} from "../../shared/types";
import {
  MINIMAL_SCHEMA,
  SCHEMA_WITH_GROUP,
  SCHEMA_WITH_ATTRIBUTEGROUP,
  runCommandExpectSuccess,
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

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain('name="AddressGroup"');
      expect(xml).toContain("<sequence");
    });

    it("adds a group with a choice content model", () => {
      const cmd: AddGroupCommand = {
        type: "addGroup",
        payload: { groupName: "ChoiceGroup", contentModel: "choice" },
      };

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain("<choice");
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

      const xml = runCommandExpectSuccess(SCHEMA_WITH_GROUP, cmd);

      expect(xml).not.toContain('name="ContactGroup"');
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

      const xml = runCommandExpectSuccess(SCHEMA_WITH_GROUP, cmd);

      expect(xml).toContain('name="CommunicationGroup"');
      expect(xml).not.toContain('name="ContactGroup"');
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

      const xml = runCommandExpectSuccess(MINIMAL_SCHEMA, cmd);

      expect(xml).toContain('name="AuditAttributes"');
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

      const xml = runCommandExpectSuccess(SCHEMA_WITH_ATTRIBUTEGROUP, cmd);

      expect(xml).not.toContain('name="CommonAttrs"');
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

      const xml = runCommandExpectSuccess(SCHEMA_WITH_ATTRIBUTEGROUP, cmd);

      expect(xml).toContain('name="SharedAttrs"');
      expect(xml).not.toContain('name="CommonAttrs"');
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
