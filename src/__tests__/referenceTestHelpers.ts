/**
 * Places in schema content that the reference searches of the group and attribute group validators
 * must look into.
 */

/**
 * Returns the places where a local element can be nested in schema content: in the compositors of a
 * complexType, of the extension and restriction of its complex content, of the inline complexType of a
 * top-level element and of a named group.
 *
 * @param localElement - The local element, whose inline complexType holds the reference
 * @returns Pairs of a description, such as "a local element in the all of a complexType", and the schema
 * content
 */
export function localElementPlaces(localElement: string): Array<[string, string]> {
  const derived = (derivation: string, compositor: string): string => {
    const content = `<xs:${compositor}>${localElement}</xs:${compositor}>`;
    if (derivation === "extension") {
      return `<xs:complexType name="Base"/>
     <xs:complexType name="Derived"><xs:complexContent><xs:extension base="Base">${content}</xs:extension></xs:complexContent></xs:complexType>`;
    }
    return `<xs:complexType name="Derived"><xs:complexContent><xs:restriction base="xs:anyType">${content}</xs:restriction></xs:complexContent></xs:complexType>`;
  };
  const places: Array<[string, string]> = [
    [
      "the sequence of a complexType",
      `<xs:complexType name="T"><xs:sequence>${localElement}</xs:sequence></xs:complexType>`,
    ],
    ["the choice of a complexType", `<xs:complexType name="T"><xs:choice>${localElement}</xs:choice></xs:complexType>`],
    ["the all of a complexType", `<xs:complexType name="T"><xs:all>${localElement}</xs:all></xs:complexType>`],
    [
      "a choice nested in a sequence",
      `<xs:complexType name="T"><xs:sequence><xs:choice>${localElement}</xs:choice></xs:sequence></xs:complexType>`,
    ],
    [
      "a sequence nested in a choice",
      `<xs:complexType name="T"><xs:choice><xs:sequence>${localElement}</xs:sequence></xs:choice></xs:complexType>`,
    ],
    [
      "a top-level element",
      `<xs:element name="root"><xs:complexType><xs:sequence>${localElement}</xs:sequence></xs:complexType></xs:element>`,
    ],
    [
      "the sequence of a named group",
      `<xs:group name="Combined"><xs:sequence>${localElement}</xs:sequence></xs:group>`,
    ],
    ["the all of a named group", `<xs:group name="Combined"><xs:all>${localElement}</xs:all></xs:group>`],
  ];
  for (const derivation of ["extension", "restriction"]) {
    for (const compositor of ["sequence", "choice", "all"]) {
      places.push([`the ${compositor} of a complexContent ${derivation}`, derived(derivation, compositor)]);
    }
  }
  return places.map(([place, content]) => [`a local element in ${place}`, content]);
}
