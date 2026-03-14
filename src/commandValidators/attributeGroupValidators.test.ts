/**
 * Unit tests for attributeGroup validators.
 * Tests validation of add, remove, and modify commands for attribute group
 * definitions and attribute group references.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types";
import {
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
} from "../../shared/types";
import {
  validateAddAttributeGroup,
  validateRemoveAttributeGroup,
  validateModifyAttributeGroup,
} from "./attributeGroupValidators";

describe("AttributeGroup Validators", () => {
  let schemaObj: schema;
  let schemaWithAttrGroup: schema;

  beforeEach(() => {
    const emptySchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
    schemaObj = unmarshal(schema, emptySchemaXml);

    const schemaWithGroupXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="CommonAttrs"/>
</xs:schema>`;
    schemaWithAttrGroup = unmarshal(schema, schemaWithGroupXml);
  });

  describe("validateAddAttributeGroup", () => {
    describe("definition mode", () => {
      test("should reject addAttributeGroup with missing groupName", () => {
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { groupName: "" },
        };

        const result = validateAddAttributeGroup(command, schemaObj);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Attribute group name must be a valid XML name");
      });

      test("should reject addAttributeGroup with an invalid XML name", () => {
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { groupName: "123-invalid" },
        };

        const result = validateAddAttributeGroup(command, schemaObj);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Attribute group name must be a valid XML name");
      });

      test("should reject addAttributeGroup when name already exists", () => {
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { groupName: "CommonAttrs" },
        };

        const result = validateAddAttributeGroup(command, schemaWithAttrGroup);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Attribute group name already exists: CommonAttrs");
      });

      test("should accept addAttributeGroup with a valid unique name", () => {
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { groupName: "NewAttrs" },
        };

        const result = validateAddAttributeGroup(command, schemaObj);
        expect(result.valid).toBe(true);
      });

      test("should reject when both groupName and parentId are provided", () => {
        const command = {
          type: "addAttributeGroup",
          payload: { groupName: "NewAttrs", parentId: "/complexType:PersonType" },
        } as AddAttributeGroupCommand;

        const result = validateAddAttributeGroup(command, schemaObj);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Cannot combine groupName with parentId");
      });
    });

    describe("reference mode", () => {
      const schemaWithComplexType = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="CommonAttrs"/>
  <xs:complexType name="PersonType"/>
</xs:schema>`;

      test("should accept adding a ref to a valid complexType parent", () => {
        const schemaObj2 = unmarshal(schema, schemaWithComplexType);
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "CommonAttrs", parentId: "/complexType:PersonType" },
        };

        const result = validateAddAttributeGroup(command, schemaObj2);
        expect(result.valid).toBe(true);
      });

      test("should reject when parentId is missing", () => {
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "CommonAttrs" },
        };

        const result = validateAddAttributeGroup(command, schemaWithAttrGroup);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Parent ID is required");
      });

      test("should reject when ref is an invalid XML name", () => {
        const schemaObj2 = unmarshal(schema, schemaWithComplexType);
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "123-invalid", parentId: "/complexType:PersonType" },
        };

        const result = validateAddAttributeGroup(command, schemaObj2);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Attribute group ref must be a valid XML name");
      });

      test("should reject when the referenced group does not exist", () => {
        const schemaObj2 = unmarshal(schema, schemaWithComplexType);
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "NonExistent", parentId: "/complexType:PersonType" },
        };

        const result = validateAddAttributeGroup(command, schemaObj2);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Referenced attribute group does not exist");
      });

      test("should reject when parent node does not exist", () => {
        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "CommonAttrs", parentId: "/complexType:NonExistent" },
        };

        const result = validateAddAttributeGroup(command, schemaWithAttrGroup);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Parent node not found");
      });

      test("should reject when both ref and groupName are provided", () => {
        const command = {
          type: "addAttributeGroup",
          payload: {
            ref: "CommonAttrs",
            groupName: "SomeName",
            parentId: "/complexType:PersonType",
          },
        } as AddAttributeGroupCommand;

        const result = validateAddAttributeGroup(command, schemaObj);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Cannot combine ref with groupName");
      });
    });
  });

  describe("validateRemoveAttributeGroup", () => {
    describe("definition mode", () => {
      test("should reject removeAttributeGroup with missing groupId", () => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "" },
        };

        const result = validateRemoveAttributeGroup(command, schemaObj);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Attribute group ID cannot be empty");
      });

      test("should reject removeAttributeGroup when group does not exist", () => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/attributeGroup:NonExistent" },
        };

        const result = validateRemoveAttributeGroup(command, schemaObj);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Attribute group not found");
      });

      test("should reject removeAttributeGroup when group is referenced in a complexType", () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="CommonAttrs"/>
  <xs:complexType name="PersonType">
    <xs:attributeGroup ref="CommonAttrs"/>
  </xs:complexType>
</xs:schema>`;
        const referenced = unmarshal(schema, xml);
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/attributeGroup:CommonAttrs" },
        };

        const result = validateRemoveAttributeGroup(command, referenced);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("still referenced");
      });

      test("should reject removeAttributeGroup when group is referenced inside a nested local element's inline complexType", () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="CommonAttrs"/>
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:element name="address">
        <xs:complexType>
          <xs:attributeGroup ref="CommonAttrs"/>
        </xs:complexType>
      </xs:element>
    </xs:sequence>
  </xs:complexType>
</xs:schema>`;
        const referenced = unmarshal(schema, xml);
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/attributeGroup:CommonAttrs" },
        };

        const result = validateRemoveAttributeGroup(command, referenced);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("still referenced");
      });

      test("should reject removeAttributeGroup when group is referenced inside a nested choice's local element", () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="CommonAttrs"/>
  <xs:complexType name="ShapeType">
    <xs:choice>
      <xs:element name="circle">
        <xs:complexType>
          <xs:attributeGroup ref="CommonAttrs"/>
        </xs:complexType>
      </xs:element>
    </xs:choice>
  </xs:complexType>
</xs:schema>`;
        const referenced = unmarshal(schema, xml);
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/attributeGroup:CommonAttrs" },
        };

        const result = validateRemoveAttributeGroup(command, referenced);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("still referenced");
      });

      test("should accept removeAttributeGroup when group exists and is not referenced", () => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/attributeGroup:CommonAttrs" },
        };

        const result = validateRemoveAttributeGroup(command, schemaWithAttrGroup);
        expect(result.valid).toBe(true);
      });
    });

    describe("reference mode", () => {
      test("should accept removing an attributeGroupRef when parent exists", () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="CommonAttrs"/>
  <xs:complexType name="PersonType">
    <xs:attributeGroup ref="CommonAttrs"/>
  </xs:complexType>
</xs:schema>`;
        const schemaWithRef = unmarshal(schema, xml);
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: {
            groupId: "/complexType:PersonType/attributeGroupRef:CommonAttrs[0]",
          },
        };

        const result = validateRemoveAttributeGroup(command, schemaWithRef);
        expect(result.valid).toBe(true);
      });

      test("should reject removing an attributeGroupRef when parent does not exist", () => {
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: {
            groupId: "/complexType:NonExistent/attributeGroupRef:CommonAttrs[0]",
          },
        };

        const result = validateRemoveAttributeGroup(command, schemaObj);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Parent node not found");
      });

      test("should reject removing an attributeGroupRef when the ref does not exist on the parent", () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="CommonAttrs"/>
  <xs:complexType name="PersonType">
    <xs:attributeGroup ref="CommonAttrs"/>
  </xs:complexType>
</xs:schema>`;
        const schemaWithRef = unmarshal(schema, xml);
        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: {
            groupId: "/complexType:PersonType/attributeGroupRef:NonExistent[0]",
          },
        };

        const result = validateRemoveAttributeGroup(command, schemaWithRef);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Attribute group reference not found");
      });
    });
  });

  describe("validateModifyAttributeGroup", () => {
    describe("definition mode", () => {
      test("should reject modifyAttributeGroup with missing groupId", () => {
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: { groupId: "" },
        };

        const result = validateModifyAttributeGroup(command, schemaObj);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Attribute group ID cannot be empty");
      });

      test("should reject modifyAttributeGroup when group does not exist", () => {
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/attributeGroup:NonExistent",
            groupName: "NewName",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaObj);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Attribute group not found");
      });

      test("should reject modifyAttributeGroup with invalid new name", () => {
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/attributeGroup:CommonAttrs",
            groupName: "123-invalid",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaWithAttrGroup);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Attribute group name must be a valid XML name");
      });

      test("should reject modifyAttributeGroup when new name already exists", () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="GroupA"/>
  <xs:attributeGroup name="GroupB"/>
</xs:schema>`;
        const twoGroups = unmarshal(schema, xml);
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/attributeGroup:GroupA",
            groupName: "GroupB",
          },
        };

        const result = validateModifyAttributeGroup(command, twoGroups);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Attribute group name already exists");
      });

      test("should accept modifyAttributeGroup with valid payload", () => {
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/attributeGroup:CommonAttrs",
            groupName: "ValidNewName",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaWithAttrGroup);
        expect(result.valid).toBe(true);
      });

      test("should accept renaming to the same name (no-op)", () => {
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/attributeGroup:CommonAttrs",
            groupName: "CommonAttrs",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaWithAttrGroup);
        expect(result.valid).toBe(true);
      });

      test("should reject using ref field on a definition ID", () => {
        const command = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/attributeGroup:CommonAttrs",
            ref: "OtherGroup",
          },
        } as ModifyAttributeGroupCommand;

        const result = validateModifyAttributeGroup(command, schemaWithAttrGroup);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Cannot use ref when modifying an attribute group definition");
      });
    });

    describe("reference mode", () => {
      const xmlWithRef = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="AttrsA"/>
  <xs:attributeGroup name="AttrsB"/>
  <xs:complexType name="PersonType">
    <xs:attributeGroup ref="AttrsA"/>
  </xs:complexType>
</xs:schema>`;

      test("should accept modifying the ref target of an attributeGroupRef", () => {
        const schemaWithRef = unmarshal(schema, xmlWithRef);
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/complexType:PersonType/attributeGroupRef:AttrsA[0]",
            ref: "AttrsB",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaWithRef);
        expect(result.valid).toBe(true);
      });

      test("should reject modifying an attributeGroupRef when parent does not exist", () => {
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/complexType:NonExistent/attributeGroupRef:AttrsA[0]",
            ref: "AttrsB",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaObj);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Parent node not found");
      });

      test("should reject modifying an attributeGroupRef when the ref does not exist on the parent", () => {
        const schemaWithRef = unmarshal(schema, xmlWithRef);
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/complexType:PersonType/attributeGroupRef:NonExistent[0]",
            ref: "AttrsB",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaWithRef);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Attribute group reference not found");
      });

      test("should reject when new ref target does not exist", () => {
        const schemaWithRef = unmarshal(schema, xmlWithRef);
        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/complexType:PersonType/attributeGroupRef:AttrsA[0]",
            ref: "NonExistent",
          },
        };

        const result = validateModifyAttributeGroup(command, schemaWithRef);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Referenced attribute group does not exist");
      });

      test("should reject using groupName field on a reference ID", () => {
        const schemaWithRef = unmarshal(schema, xmlWithRef);
        const command = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/complexType:PersonType/attributeGroupRef:AttrsA[0]",
            groupName: "NewName",
          },
        } as ModifyAttributeGroupCommand;

        const result = validateModifyAttributeGroup(command, schemaWithRef);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Cannot use groupName when modifying an attribute group reference");
      });
    });
  });
});
