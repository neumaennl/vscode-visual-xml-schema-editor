/**
 * Unit tests for attributeGroup executors.
 * Tests the implementation of add, remove, and modify execution logic for
 * attribute group definitions and attribute group references.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import {
  schema,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
} from "../../shared/types.js";
import {
  executeAddAttributeGroup,
  executeRemoveAttributeGroup,
  executeModifyAttributeGroup,
} from "./attributeGroupExecutors.js";
import { toArray } from "../../shared/schemaUtils.js";

/**
 * Unmarshals a schema with the attribute groups `CommonAttrs` and `OtherAttrs` and the given content.
 *
 * @param body - The XSD content after the two attribute group definitions
 * @returns The schema object
 */
function schemaWithAttrGroups(body: string): schema {
  return unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="CommonAttrs"/>
  <xs:attributeGroup name="OtherAttrs"/>
  ${body}
</xs:schema>`,
  );
}

/** A complexType `T` with references to `CommonAttrs` and `OtherAttrs`, in this order. */
const TWO_REFS = `<xs:complexType name="T">
    <xs:attributeGroup ref="CommonAttrs"/>
    <xs:attributeGroup ref="OtherAttrs"/>
  </xs:complexType>`;

/**
 * Returns the names that the attribute group references of the complexType `T` refer to.
 *
 * @param schemaObj - The schema object
 * @returns The referenced names, in document order
 */
function refsOfT(schemaObj: schema): (string | undefined)[] {
  const t = toArray(schemaObj.complexType).find((ct) => ct.name === "T");
  return toArray(t?.attributeGroup).map((r) => r.ref);
}

describe("AttributeGroup Executors", () => {
  describe("executeAddAttributeGroup", () => {
    describe("definition mode", () => {
      it("should add a named attribute group", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { groupName: "CommonAttrs" },
        };

        executeAddAttributeGroup(command, schemaObj);

        expect(schemaObj.attributeGroup).toHaveLength(1);
        expect(schemaObj.attributeGroup![0].name).toBe("CommonAttrs");
        expect(schemaObj.attributeGroup![0].annotation).toBeUndefined();
      });

      it("should add an attribute group with documentation", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { groupName: "DocAttrs", documentation: "Documented group" },
        };

        executeAddAttributeGroup(command, schemaObj);

        const ag = schemaObj.attributeGroup![0];
        expect(ag.name).toBe("DocAttrs");
        expect(ag.annotation?.documentation?.[0].value).toBe("Documented group");
      });

      it("should append to existing attribute groups", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="FirstAttrs"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { groupName: "SecondAttrs" },
        };

        executeAddAttributeGroup(command, schemaObj);

        expect(schemaObj.attributeGroup).toHaveLength(2);
        expect(schemaObj.attributeGroup![1].name).toBe("SecondAttrs");
      });

      it("should produce valid XSD output (round-trip)", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { groupName: "RoundTripAttrs" },
        };

        executeAddAttributeGroup(command, schemaObj);

        const xml = marshal(schemaObj);
        const reparsed = unmarshal(schema, xml);
        expect(toArray(reparsed.attributeGroup)).toHaveLength(1);
        expect(toArray(reparsed.attributeGroup)[0].name).toBe("RoundTripAttrs");
      });
    });

    describe("reference mode", () => {
      it("should add an attribute group ref to a complexType", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="CommonAttrs"/>
  <xs:complexType name="PersonType"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "CommonAttrs", parentId: "/complexType:PersonType" },
        };

        executeAddAttributeGroup(command, schemaObj);

        const ct = toArray(schemaObj.complexType)[0];
        expect(toArray(ct.attributeGroup)).toHaveLength(1);
        expect(toArray(ct.attributeGroup)[0].ref).toBe("CommonAttrs");
      });

      it("should add an attribute group ref with documentation", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="CommonAttrs"/>
  <xs:complexType name="PersonType"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: {
            ref: "CommonAttrs",
            parentId: "/complexType:PersonType",
            documentation: "Ref docs",
          },
        };

        executeAddAttributeGroup(command, schemaObj);

        const ct = toArray(schemaObj.complexType)[0];
        const agRef = toArray(ct.attributeGroup)[0];
        expect(agRef.ref).toBe("CommonAttrs");
        expect(agRef.annotation?.documentation?.[0].value).toBe("Ref docs");
      });

      it("should add multiple attribute group refs to the same complexType", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="AttrsA"/>
  <xs:attributeGroup name="AttrsB"/>
  <xs:complexType name="PersonType"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        executeAddAttributeGroup(
          { type: "addAttributeGroup", payload: { ref: "AttrsA", parentId: "/complexType:PersonType" } },
          schemaObj
        );
        executeAddAttributeGroup(
          { type: "addAttributeGroup", payload: { ref: "AttrsB", parentId: "/complexType:PersonType" } },
          schemaObj
        );

        const ct = toArray(schemaObj.complexType)[0];
        expect(toArray(ct.attributeGroup)).toHaveLength(2);
        expect(toArray(ct.attributeGroup)[1].ref).toBe("AttrsB");
      });

      it("should add an attribute group ref to a namedAttributeGroup", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="BaseAttrs"/>
  <xs:attributeGroup name="ExtendedAttrs"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: AddAttributeGroupCommand = {
          type: "addAttributeGroup",
          payload: { ref: "BaseAttrs", parentId: "/attributeGroup:ExtendedAttrs" },
        };

        executeAddAttributeGroup(command, schemaObj);

        const extGroup = toArray(schemaObj.attributeGroup).find(
          (g) => g.name === "ExtendedAttrs"
        );
        expect(toArray(extGroup?.attributeGroup)).toHaveLength(1);
        expect(toArray(extGroup?.attributeGroup)[0].ref).toBe("BaseAttrs");
      });

    });
  });

  describe("executeRemoveAttributeGroup", () => {
    describe("definition mode", () => {
      it("should remove an attribute group by ID", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="RemovableAttrs"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/attributeGroup:RemovableAttrs" },
        };

        executeRemoveAttributeGroup(command, schemaObj);

        expect(schemaObj.attributeGroup).toBeUndefined();
      });

      it("should remove one attribute group while leaving others intact", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="GroupA"/>
  <xs:attributeGroup name="GroupB"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/attributeGroup:GroupA" },
        };

        executeRemoveAttributeGroup(command, schemaObj);

        expect(toArray(schemaObj.attributeGroup)).toHaveLength(1);
        expect(toArray(schemaObj.attributeGroup)[0].name).toBe("GroupB");
      });

    });

    describe("reference mode", () => {
      it("should remove an attribute group ref from a complexType", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="CommonAttrs"/>
  <xs:complexType name="PersonType">
    <xs:attributeGroup ref="CommonAttrs"/>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/complexType:PersonType/attributeGroupRef:CommonAttrs[0]" },
        };

        executeRemoveAttributeGroup(command, schemaObj);

        const ct = toArray(schemaObj.complexType)[0];
        expect(ct.attributeGroup).toBeUndefined();
      });

      it("should remove only the matching ref while leaving others intact", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="AttrsA"/>
  <xs:attributeGroup name="AttrsB"/>
  <xs:complexType name="PersonType">
    <xs:attributeGroup ref="AttrsA"/>
    <xs:attributeGroup ref="AttrsB"/>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/complexType:PersonType/attributeGroupRef:AttrsA[0]" },
        };

        executeRemoveAttributeGroup(command, schemaObj);

        const ct = toArray(schemaObj.complexType)[0];
        expect(toArray(ct.attributeGroup)).toHaveLength(1);
        expect(toArray(ct.attributeGroup)[0].ref).toBe("AttrsB");
      });

      it("should remove an attribute group ref from a namedAttributeGroup", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="BaseAttrs"/>
  <xs:attributeGroup name="ExtendedAttrs">
    <xs:attributeGroup ref="BaseAttrs"/>
  </xs:attributeGroup>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: RemoveAttributeGroupCommand = {
          type: "removeAttributeGroup",
          payload: { groupId: "/attributeGroup:ExtendedAttrs/attributeGroupRef:BaseAttrs[0]" },
        };

        executeRemoveAttributeGroup(command, schemaObj);

        const extGroup = toArray(schemaObj.attributeGroup).find(
          (g) => g.name === "ExtendedAttrs"
        );
        expect(extGroup?.attributeGroup).toBeUndefined();
      });

    });
  });

  describe("executeModifyAttributeGroup", () => {
    describe("definition mode", () => {
      it("should rename an attribute group", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="OldName"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: { groupId: "/attributeGroup:OldName", groupName: "NewName" },
        };

        executeModifyAttributeGroup(command, schemaObj);

        expect(toArray(schemaObj.attributeGroup)[0].name).toBe("NewName");
      });

      it("should update documentation of an attribute group", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="DocGroup"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/attributeGroup:DocGroup",
            documentation: "New documentation",
          },
        };

        executeModifyAttributeGroup(command, schemaObj);

        const ag = toArray(schemaObj.attributeGroup)[0];
        expect(ag.annotation?.documentation?.[0].value).toBe("New documentation");
      });

      it("should update name and documentation together", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="OldGroup"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/attributeGroup:OldGroup",
            groupName: "UpdatedGroup",
            documentation: "Updated docs",
          },
        };

        executeModifyAttributeGroup(command, schemaObj);

        const ag = toArray(schemaObj.attributeGroup)[0];
        expect(ag.name).toBe("UpdatedGroup");
        expect(ag.annotation?.documentation?.[0].value).toBe("Updated docs");
      });

      it("should leave unchanged properties untouched", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="StableGroup"/>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: { groupId: "/attributeGroup:StableGroup" },
        };

        executeModifyAttributeGroup(command, schemaObj);

        expect(toArray(schemaObj.attributeGroup)[0].name).toBe("StableGroup");
      });
    });

    describe("reference mode", () => {
      it("should change the ref target of an attribute group reference", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="AttrsA"/>
  <xs:attributeGroup name="AttrsB"/>
  <xs:complexType name="PersonType">
    <xs:attributeGroup ref="AttrsA"/>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/complexType:PersonType/attributeGroupRef:AttrsA[0]",
            ref: "AttrsB",
          },
        };

        executeModifyAttributeGroup(command, schemaObj);

        const ct = toArray(schemaObj.complexType)[0];
        expect(toArray(ct.attributeGroup)[0].ref).toBe("AttrsB");
      });

      it("should set documentation annotation on an attribute group reference", () => {
        const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="CommonAttrs"/>
  <xs:complexType name="PersonType">
    <xs:attributeGroup ref="CommonAttrs"/>
  </xs:complexType>
</xs:schema>`;
        const schemaObj = unmarshal(schema, schemaXml);

        const command: ModifyAttributeGroupCommand = {
          type: "modifyAttributeGroup",
          payload: {
            groupId: "/complexType:PersonType/attributeGroupRef:CommonAttrs[0]",
            documentation: "Ref annotation",
          },
        };

        executeModifyAttributeGroup(command, schemaObj);

        const ct = toArray(schemaObj.complexType)[0];
        const agRef = toArray(ct.attributeGroup)[0];
        expect(agRef.annotation?.documentation?.[0].value).toBe("Ref annotation");
      });

    });
  });
  describe("identifying references", () => {
    it("should remove a reference identified by name only", () => {
      const schemaObj = schemaWithAttrGroups(TWO_REFS);
      const command: RemoveAttributeGroupCommand = {
        type: "removeAttributeGroup",
        payload: { groupId: "/complexType:T/attributeGroupRef:OtherAttrs" },
      };

      executeRemoveAttributeGroup(command, schemaObj);

      expect(refsOfT(schemaObj)).toEqual(["CommonAttrs"]);
    });

    it("should remove a reference identified by position only", () => {
      const schemaObj = schemaWithAttrGroups(TWO_REFS);
      const command: RemoveAttributeGroupCommand = {
        type: "removeAttributeGroup",
        payload: { groupId: "/complexType:T/attributeGroupRef[0]" },
      };

      executeRemoveAttributeGroup(command, schemaObj);

      expect(refsOfT(schemaObj)).toEqual(["OtherAttrs"]);
    });

    it("should change a reference identified by name only", () => {
      const schemaObj = schemaWithAttrGroups(TWO_REFS);
      const command: ModifyAttributeGroupCommand = {
        type: "modifyAttributeGroup",
        payload: { groupId: "/complexType:T/attributeGroupRef:OtherAttrs", ref: "CommonAttrs" },
      };

      executeModifyAttributeGroup(command, schemaObj);

      expect(refsOfT(schemaObj)).toEqual(["CommonAttrs", "CommonAttrs"]);
    });

    it("should change a reference identified by position only", () => {
      const schemaObj = schemaWithAttrGroups(TWO_REFS);
      const command: ModifyAttributeGroupCommand = {
        type: "modifyAttributeGroup",
        payload: { groupId: "/complexType:T/attributeGroupRef[0]", ref: "OtherAttrs" },
      };

      executeModifyAttributeGroup(command, schemaObj);

      expect(refsOfT(schemaObj)).toEqual(["OtherAttrs", "OtherAttrs"]);
    });

  });

  describe("documentation in an existing annotation", () => {
    /** An annotation with application information and a documentation entry. */
    const ANNOTATION = `<xs:annotation><xs:appinfo>tool data</xs:appinfo><xs:documentation>Old</xs:documentation></xs:annotation>`;

    it("should replace the documentation of a definition and keep its appinfo", () => {
      const schemaObj = unmarshal(
        schema,
        `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="CommonAttrs">${ANNOTATION}</xs:attributeGroup>
</xs:schema>`,
      );
      const command: ModifyAttributeGroupCommand = {
        type: "modifyAttributeGroup",
        payload: { groupId: "/attributeGroup:CommonAttrs", documentation: "New" },
      };

      executeModifyAttributeGroup(command, schemaObj);

      const annotation = schemaObj.attributeGroup![0].annotation!;
      expect(toArray(annotation.documentation).map((d) => d.value)).toEqual(["New"]);
      expect(toArray(annotation.appinfo)).toHaveLength(1);
    });

    it("should replace the documentation of a reference and keep its appinfo", () => {
      const schemaObj = schemaWithAttrGroups(
        `<xs:complexType name="T"><xs:attributeGroup ref="CommonAttrs">${ANNOTATION}</xs:attributeGroup></xs:complexType>`,
      );
      const command: ModifyAttributeGroupCommand = {
        type: "modifyAttributeGroup",
        payload: { groupId: "/complexType:T/attributeGroupRef:CommonAttrs[0]", documentation: "New" },
      };

      executeModifyAttributeGroup(command, schemaObj);

      const t = toArray(schemaObj.complexType).find((ct) => ct.name === "T");
      const annotation = toArray(t?.attributeGroup)[0].annotation!;
      expect(toArray(annotation.documentation).map((d) => d.value)).toEqual(["New"]);
      expect(toArray(annotation.appinfo)).toHaveLength(1);
    });

  });

});
