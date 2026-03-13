/**
 * Unit tests for group executors.
 * Tests the implementation of add, remove, and modify group execution logic.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import {
  schema,
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
} from "../../shared/types";
import {
  executeAddGroup,
  executeRemoveGroup,
  executeModifyGroup,
} from "./groupExecutors";
import { toArray } from "../../shared/schemaUtils";

describe("Group Executors", () => {
  describe("executeAddGroup", () => {
    it("should add a group with a sequence content model", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "PersonGroup",
          contentModel: "sequence",
        },
      };

      executeAddGroup(command, schemaObj);

      expect(schemaObj.group).toHaveLength(1);
      const grp = schemaObj.group![0];
      expect(grp.name).toBe("PersonGroup");
      expect(grp.sequence).toBeDefined();
      expect(grp.choice).toBeUndefined();
      expect(grp.all).toBeUndefined();
    });

    it("should add a group with a choice content model", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "ShapeGroup",
          contentModel: "choice",
        },
      };

      executeAddGroup(command, schemaObj);

      const grp = schemaObj.group![0];
      expect(grp.choice).toBeDefined();
      expect(grp.sequence).toBeUndefined();
      expect(grp.all).toBeUndefined();
    });

    it("should add a group with an all content model", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "AddressGroup",
          contentModel: "all",
        },
      };

      executeAddGroup(command, schemaObj);

      const grp = schemaObj.group![0];
      expect(grp.all).toBeDefined();
      expect(grp.sequence).toBeUndefined();
      expect(grp.choice).toBeUndefined();
    });

    it("should add a group with documentation", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "DocGroup",
          contentModel: "sequence",
          documentation: "A documented group",
        },
      };

      executeAddGroup(command, schemaObj);

      const grp = schemaObj.group![0];
      expect(grp.annotation).toBeDefined();
      expect(grp.annotation!.documentation![0].value).toBe("A documented group");
    });

    it("should append to existing groups", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="ExistingGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "NewGroup",
          contentModel: "choice",
        },
      };

      executeAddGroup(command, schemaObj);

      expect(toArray(schemaObj.group)).toHaveLength(2);
      expect(toArray(schemaObj.group)[1].name).toBe("NewGroup");
    });

    it("should produce valid XSD output", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddGroupCommand = {
        type: "addGroup",
        payload: {
          groupName: "MyGroup",
          contentModel: "sequence",
        },
      };

      executeAddGroup(command, schemaObj);

      const xml = marshal(schemaObj);
      expect(xml).toContain('name="MyGroup"');
      expect(xml).toContain("sequence");
    });
  });

  describe("executeRemoveGroup", () => {
    it("should remove a group by ID", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="PersonGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:PersonGroup",
        },
      };

      executeRemoveGroup(command, schemaObj);

      expect(schemaObj.group).toBeUndefined();
    });

    it("should remove one group while leaving others intact", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="GroupA">
    <xs:sequence/>
  </xs:group>
  <xs:group name="GroupB">
    <xs:choice/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:GroupA",
        },
      };

      executeRemoveGroup(command, schemaObj);

      expect(toArray(schemaObj.group)).toHaveLength(1);
      expect(toArray(schemaObj.group)[0].name).toBe("GroupB");
    });

    it("should throw if group does not exist", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveGroupCommand = {
        type: "removeGroup",
        payload: {
          groupId: "/group:NonExistent",
        },
      };

      expect(() => executeRemoveGroup(command, schemaObj)).toThrow(
        "Group not found: NonExistent"
      );
    });
  });

  describe("executeModifyGroup", () => {
    it("should rename a group", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="OldName">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:OldName",
          groupName: "NewName",
        },
      };

      executeModifyGroup(command, schemaObj);

      const grp = toArray(schemaObj.group)[0];
      expect(grp.name).toBe("NewName");
    });

    it("should change the content model of a group", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="MyGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:MyGroup",
          contentModel: "choice",
        },
      };

      executeModifyGroup(command, schemaObj);

      const grp = toArray(schemaObj.group)[0];
      expect(grp.choice).toBeDefined();
      expect(grp.sequence).toBeUndefined();
      expect(grp.all).toBeUndefined();
    });

    it("should update the documentation of a group", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="DocGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:DocGroup",
          documentation: "Updated documentation",
        },
      };

      executeModifyGroup(command, schemaObj);

      const grp = toArray(schemaObj.group)[0];
      expect(grp.annotation).toBeDefined();
      expect(grp.annotation!.documentation![0].value).toBe(
        "Updated documentation"
      );
    });

    it("should update name, content model, and documentation together", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="OriginalGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:OriginalGroup",
          groupName: "UpdatedGroup",
          contentModel: "all",
          documentation: "New doc",
        },
      };

      executeModifyGroup(command, schemaObj);

      const grp = toArray(schemaObj.group)[0];
      expect(grp.name).toBe("UpdatedGroup");
      expect(grp.all).toBeDefined();
      expect(grp.sequence).toBeUndefined();
      expect(grp.annotation!.documentation![0].value).toBe("New doc");
    });

    it("should throw if group does not exist", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:NonExistent",
          groupName: "Updated",
        },
      };

      expect(() => executeModifyGroup(command, schemaObj)).toThrow(
        "Group not found: NonExistent"
      );
    });

    it("should leave unchanged properties untouched", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="StableGroup">
    <xs:sequence/>
  </xs:group>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyGroupCommand = {
        type: "modifyGroup",
        payload: {
          groupId: "/group:StableGroup",
          // No changes provided
        },
      };

      executeModifyGroup(command, schemaObj);

      const grp = toArray(schemaObj.group)[0];
      expect(grp.name).toBe("StableGroup");
      expect(grp.sequence).toBeDefined();
    });
  });
});
