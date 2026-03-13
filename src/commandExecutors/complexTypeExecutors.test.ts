/**
 * Unit tests for complexType executors.
 * Tests the implementation of add, remove, and modify complex type execution logic.
 */

import { unmarshal, marshal } from "@neumaennl/xmlbind-ts";
import {
  schema,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
} from "../../shared/types";
import {
  executeAddComplexType,
  executeRemoveComplexType,
  executeModifyComplexType,
} from "./typeExecutors";
import { toArray } from "../../shared/schemaUtils";

describe("ComplexType Executors", () => {
  describe("executeAddComplexType", () => {
    it("should add a complexType with a sequence content model", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "PersonType",
          contentModel: "sequence",
        },
      };

      executeAddComplexType(command, schemaObj);

      expect(schemaObj.complexType).toHaveLength(1);
      const ct = schemaObj.complexType![0];
      expect(ct.name).toBe("PersonType");
      expect(ct.sequence).toBeDefined();
      expect(ct.choice).toBeUndefined();
      expect(ct.all).toBeUndefined();
      expect(ct.complexContent).toBeUndefined();
    });

    it("should add a complexType with a choice content model", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "ShapeType",
          contentModel: "choice",
        },
      };

      executeAddComplexType(command, schemaObj);

      const ct = schemaObj.complexType![0];
      expect(ct.choice).toBeDefined();
      expect(ct.sequence).toBeUndefined();
      expect(ct.all).toBeUndefined();
    });

    it("should add a complexType with an all content model", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "AddressType",
          contentModel: "all",
        },
      };

      executeAddComplexType(command, schemaObj);

      const ct = schemaObj.complexType![0];
      expect(ct.all).toBeDefined();
      expect(ct.sequence).toBeUndefined();
      expect(ct.choice).toBeUndefined();
    });

    it("should add a complexType with abstract=true", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "BaseType",
          contentModel: "sequence",
          abstract: true,
        },
      };

      executeAddComplexType(command, schemaObj);

      const ct = schemaObj.complexType![0];
      expect(ct.abstract).toBe(true);
    });

    it("should add a complexType with mixed=true", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "MixedType",
          contentModel: "sequence",
          mixed: true,
        },
      };

      executeAddComplexType(command, schemaObj);

      const ct = schemaObj.complexType![0];
      expect(ct.mixed).toBe(true);
    });

    it("should add a complexType with documentation", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "DocumentedType",
          contentModel: "sequence",
          documentation: "Describes a person.",
        },
      };

      executeAddComplexType(command, schemaObj);

      const ct = schemaObj.complexType![0];
      expect(ct.annotation).toBeDefined();
      expect(ct.annotation!.documentation![0].value).toBe("Describes a person.");
    });

    it("should add a complexType with base type extension (complexContent)", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "EmployeeType",
          contentModel: "sequence",
          baseType: "PersonType",
        },
      };

      executeAddComplexType(command, schemaObj);

      const ct = schemaObj.complexType![0];
      expect(ct.complexContent).toBeDefined();
      expect(ct.complexContent!.extension).toBeDefined();
      expect(ct.complexContent!.extension!.base).toBe("PersonType");
      expect(ct.complexContent!.extension!.sequence).toBeDefined();
      expect(ct.sequence).toBeUndefined();
    });

    it("should add a complexType with base type extension using choice", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "DerivedType",
          contentModel: "choice",
          baseType: "BaseType",
        },
      };

      executeAddComplexType(command, schemaObj);

      const ct = schemaObj.complexType![0];
      expect(ct.complexContent!.extension!.choice).toBeDefined();
      expect(ct.complexContent!.extension!.sequence).toBeUndefined();
    });

    it("should append to existing complexTypes", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="ExistingType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "NewType",
          contentModel: "choice",
        },
      };

      executeAddComplexType(command, schemaObj);

      expect(toArray(schemaObj.complexType)).toHaveLength(2);
      expect(toArray(schemaObj.complexType)[1].name).toBe("NewType");
    });

    it("should produce valid XSD output for a sequence complexType", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "PersonType",
          contentModel: "sequence",
        },
      };

      executeAddComplexType(command, schemaObj);

      const reparsed = unmarshal(schema, marshal(schemaObj));
      const ct = toArray(reparsed.complexType)[0];
      expect(ct.name).toBe("PersonType");
      expect(ct.sequence).toBeDefined();
    });

    it("should produce valid XSD output for a complexType with base type extension", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          typeName: "EmployeeType",
          contentModel: "sequence",
          baseType: "PersonType",
        },
      };

      executeAddComplexType(command, schemaObj);

      const reparsed = unmarshal(schema, marshal(schemaObj));
      const ct = toArray(reparsed.complexType)[0];
      expect(ct.name).toBe("EmployeeType");
      expect(ct.complexContent).toBeDefined();
      expect(ct.complexContent!.extension!.base).toBe("PersonType");
      expect(ct.complexContent!.extension!.sequence).toBeDefined();
    });
  });

  describe("executeRemoveComplexType", () => {
    it("should remove a complexType by typeId", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveComplexTypeCommand = {
        type: "removeComplexType",
        payload: { typeId: "/complexType:PersonType" },
      };

      executeRemoveComplexType(command, schemaObj);

      expect(schemaObj.complexType).toBeUndefined();
    });

    it("should remove only the targeted complexType leaving others intact", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="TypeA">
    <xs:sequence/>
  </xs:complexType>
  <xs:complexType name="TypeB">
    <xs:choice/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveComplexTypeCommand = {
        type: "removeComplexType",
        payload: { typeId: "/complexType:TypeA" },
      };

      executeRemoveComplexType(command, schemaObj);

      const remaining = toArray(schemaObj.complexType);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].name).toBe("TypeB");
    });

    it("should throw when the complexType does not exist", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: RemoveComplexTypeCommand = {
        type: "removeComplexType",
        payload: { typeId: "/complexType:NonExistent" },
      };

      expect(() => executeRemoveComplexType(command, schemaObj)).toThrow(
        "ComplexType not found: NonExistent"
      );
    });
  });

  describe("executeModifyComplexType", () => {
    it("should rename a complexType", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="OldName">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/complexType:OldName",
          typeName: "NewName",
        },
      };

      executeModifyComplexType(command, schemaObj);

      const ct = toArray(schemaObj.complexType)[0];
      expect(ct.name).toBe("NewName");
    });

    it("should update abstract flag", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="BaseType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/complexType:BaseType",
          abstract: true,
        },
      };

      executeModifyComplexType(command, schemaObj);

      expect(toArray(schemaObj.complexType)[0].abstract).toBe(true);
    });

    it("should update mixed flag", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="TextType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/complexType:TextType",
          mixed: true,
        },
      };

      executeModifyComplexType(command, schemaObj);

      expect(toArray(schemaObj.complexType)[0].mixed).toBe(true);
    });

    it("should update documentation", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="DocType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/complexType:DocType",
          documentation: "Updated documentation.",
        },
      };

      executeModifyComplexType(command, schemaObj);

      const ct = toArray(schemaObj.complexType)[0];
      expect(ct.annotation).toBeDefined();
      expect(ct.annotation!.documentation![0].value).toBe("Updated documentation.");
    });

    it("should change content model from sequence to choice", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="FlexType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/complexType:FlexType",
          contentModel: "choice",
        },
      };

      executeModifyComplexType(command, schemaObj);

      const ct = toArray(schemaObj.complexType)[0];
      expect(ct.choice).toBeDefined();
      expect(ct.sequence).toBeUndefined();
      expect(ct.all).toBeUndefined();
    });

    it("should change content model from sequence to all", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="AllType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/complexType:AllType",
          contentModel: "all",
        },
      };

      executeModifyComplexType(command, schemaObj);

      const ct = toArray(schemaObj.complexType)[0];
      expect(ct.all).toBeDefined();
      expect(ct.sequence).toBeUndefined();
    });

    it("should add a base type to a plain complexType", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="EmployeeType">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/complexType:EmployeeType",
          baseType: "PersonType",
        },
      };

      executeModifyComplexType(command, schemaObj);

      const ct = toArray(schemaObj.complexType)[0];
      expect(ct.complexContent).toBeDefined();
      expect(ct.complexContent!.extension!.base).toBe("PersonType");
      expect(ct.complexContent!.extension!.sequence).toBeDefined();
      expect(ct.sequence).toBeUndefined();
    });

    it("should update the base type of an existing extension", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="EmployeeType">
    <xs:complexContent>
      <xs:extension base="PersonType">
        <xs:sequence/>
      </xs:extension>
    </xs:complexContent>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/complexType:EmployeeType",
          baseType: "WorkerType",
        },
      };

      executeModifyComplexType(command, schemaObj);

      const ct = toArray(schemaObj.complexType)[0];
      expect(ct.complexContent!.extension!.base).toBe("WorkerType");
      expect(ct.complexContent!.extension!.sequence).toBeDefined();
    });

    it("should remove the base type when baseType is set to empty string", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="EmployeeType">
    <xs:complexContent>
      <xs:extension base="PersonType">
        <xs:sequence/>
      </xs:extension>
    </xs:complexContent>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/complexType:EmployeeType",
          baseType: "",
        },
      };

      executeModifyComplexType(command, schemaObj);

      const ct = toArray(schemaObj.complexType)[0];
      expect(ct.complexContent).toBeUndefined();
      expect(ct.sequence).toBeDefined();
    });

    it("should not modify unrelated properties when only one is updated", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="RichType" abstract="true" mixed="false">
    <xs:sequence/>
  </xs:complexType>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/complexType:RichType",
          typeName: "RicherType",
        },
      };

      executeModifyComplexType(command, schemaObj);

      const ct = toArray(schemaObj.complexType)[0];
      expect(ct.name).toBe("RicherType");
      // abstract is stored as-is from XML deserialization (string "true"); use toBeTruthy
      expect(ct.abstract).toBeTruthy();
      expect(ct.sequence).toBeDefined();
    });

    it("should throw when the complexType does not exist", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: ModifyComplexTypeCommand = {
        type: "modifyComplexType",
        payload: {
          typeId: "/complexType:NonExistent",
          typeName: "NewName",
        },
      };

      expect(() => executeModifyComplexType(command, schemaObj)).toThrow(
        "ComplexType not found: NonExistent"
      );
    });
  });

  // ── Anonymous complexType (inline inside element) ──────────────────────

  describe("executeAddComplexType (anonymous inside element)", () => {
    it("should add an anonymous complexType with a sequence content model", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          parentId: "/element:person",
          contentModel: "sequence",
        },
      };

      executeAddComplexType(command, schemaObj);

      const element = toArray(schemaObj.element)[0];
      expect(element.complexType).toBeDefined();
      expect(element.complexType!.sequence).toBeDefined();
      expect(element.complexType!.choice).toBeUndefined();
      expect(element.complexType!.all).toBeUndefined();
    });

    it("should add an anonymous complexType with choice and mixed content", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="content"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          parentId: "/element:content",
          contentModel: "choice",
          mixed: true,
        },
      };

      executeAddComplexType(command, schemaObj);

      const element = toArray(schemaObj.element)[0];
      expect(element.complexType!.choice).toBeDefined();
      expect(element.complexType!.mixed).toBe(true);
    });

    it("should add an anonymous complexType with an all content model", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="address"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          parentId: "/element:address",
          contentModel: "all",
        },
      };

      executeAddComplexType(command, schemaObj);

      const element = toArray(schemaObj.element)[0];
      expect(element.complexType!.all).toBeDefined();
    });

    it("should add an anonymous complexType with documentation", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="order"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          parentId: "/element:order",
          contentModel: "sequence",
          documentation: "Represents an order.",
        },
      };

      executeAddComplexType(command, schemaObj);

      const element = toArray(schemaObj.element)[0];
      expect(element.complexType!.annotation!.documentation![0].value).toBe("Represents an order.");
    });

    it("should add an anonymous complexType with base type extension", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="employee"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          parentId: "/element:employee",
          contentModel: "sequence",
          baseType: "PersonType",
        },
      };

      executeAddComplexType(command, schemaObj);

      const element = toArray(schemaObj.element)[0];
      expect(element.complexType!.complexContent).toBeDefined();
      expect(element.complexType!.complexContent!.extension!.base).toBe("PersonType");
      expect(element.complexType!.complexContent!.extension!.sequence).toBeDefined();
    });

    it("should throw when the parent element is not found", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      const command: AddComplexTypeCommand = {
        type: "addComplexType",
        payload: {
          parentId: "/element:nonExistent",
          contentModel: "sequence",
        },
      };

      expect(() => executeAddComplexType(command, schemaObj)).toThrow("Parent not found");
    });

    it("should produce valid XSD output for an anonymous complexType", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      executeAddComplexType(
        {
          type: "addComplexType",
          payload: { parentId: "/element:person", contentModel: "sequence" },
        },
        schemaObj
      );

      const reparsed = unmarshal(schema, marshal(schemaObj));
      const element = toArray(reparsed.element)[0];
      expect(element.name).toBe("person");
      expect(element.complexType).toBeDefined();
      expect(element.complexType!.sequence).toBeDefined();
    });
  });

  describe("executeRemoveComplexType (anonymous inside element)", () => {
    it("should remove an anonymous complexType from an element", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType><xs:sequence/></xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      executeRemoveComplexType(
        {
          type: "removeComplexType",
          payload: { typeId: "/element:person/anonymousComplexType[0]" },
        },
        schemaObj
      );

      const element = toArray(schemaObj.element)[0];
      expect(element.complexType).toBeUndefined();
    });

    it("should throw when the parent element has no anonymous complexType", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      expect(() =>
        executeRemoveComplexType(
          {
            type: "removeComplexType",
            payload: { typeId: "/element:person/anonymousComplexType[0]" },
          },
          schemaObj
        )
      ).toThrow("No anonymous complexType found in parent: /element:person");
    });
  });

  describe("executeModifyComplexType (anonymous inside element)", () => {
    it("should update the content model of an anonymous complexType", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person">
    <xs:complexType><xs:sequence/></xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      executeModifyComplexType(
        {
          type: "modifyComplexType",
          payload: {
            typeId: "/element:person/anonymousComplexType[0]",
            contentModel: "choice",
          },
        },
        schemaObj
      );

      const element = toArray(schemaObj.element)[0];
      expect(element.complexType!.choice).toBeDefined();
      expect(element.complexType!.sequence).toBeUndefined();
    });

    it("should update mixed flag of an anonymous complexType", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="text">
    <xs:complexType><xs:sequence/></xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      executeModifyComplexType(
        {
          type: "modifyComplexType",
          payload: {
            typeId: "/element:text/anonymousComplexType[0]",
            mixed: true,
          },
        },
        schemaObj
      );

      const element = toArray(schemaObj.element)[0];
      expect(element.complexType!.mixed).toBe(true);
    });

    it("should add a base type to an anonymous complexType", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="employee">
    <xs:complexType><xs:sequence/></xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      executeModifyComplexType(
        {
          type: "modifyComplexType",
          payload: {
            typeId: "/element:employee/anonymousComplexType[0]",
            baseType: "PersonType",
          },
        },
        schemaObj
      );

      const element = toArray(schemaObj.element)[0];
      expect(element.complexType!.complexContent!.extension!.base).toBe("PersonType");
      expect(element.complexType!.sequence).toBeUndefined();
    });

    it("should update documentation of an anonymous complexType", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="order">
    <xs:complexType><xs:sequence/></xs:complexType>
  </xs:element>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      executeModifyComplexType(
        {
          type: "modifyComplexType",
          payload: {
            typeId: "/element:order/anonymousComplexType[0]",
            documentation: "Represents an order.",
          },
        },
        schemaObj
      );

      const element = toArray(schemaObj.element)[0];
      expect(element.complexType!.annotation!.documentation![0].value).toBe("Represents an order.");
    });

    it("should throw when the parent element has no anonymous complexType", () => {
      const schemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person"/>
</xs:schema>`;
      const schemaObj = unmarshal(schema, schemaXml);

      expect(() =>
        executeModifyComplexType(
          {
            type: "modifyComplexType",
            payload: {
              typeId: "/element:person/anonymousComplexType[0]",
              contentModel: "choice",
            },
          },
          schemaObj
        )
      ).toThrow("No anonymous complexType found in parent: /element:person");
    });
  });
});
