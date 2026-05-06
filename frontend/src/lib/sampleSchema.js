// Sample XML Schema matching the user's screenshot example.xsd
// Tree-shaped data structure used by the diagram renderer & properties panel

export const sampleSchema = {
  fileName: "example.xsd",
  targetNamespace: "http://example.com/schema",
  nodes: [
    {
      id: "schema",
      kind: "schema",
      name: "Schema: example.xsd",
      doc: "Root schema container",
      children: ["el-example", "ct-choiceType", "ct-loggingType", "st-lengthRestriction"],
      expanded: true,
    },
    {
      id: "el-example",
      kind: "element",
      name: "example",
      type: "complexType (sequence)",
      cardinality: "1..1",
      doc: "Top-level example element containing meta and product entries.",
      compositor: "sequence",
      children: ["el-meta", "el-product"],
      expanded: true,
    },
    {
      id: "el-meta",
      kind: "element",
      name: "meta",
      type: "metaType",
      cardinality: "0..1",
      optional: true,
      doc: "Optional metadata for the example.",
      children: [],
    },
    {
      id: "el-product",
      kind: "element",
      name: "product",
      type: "productType",
      cardinality: "0..∞",
      optional: true,
      repeating: true,
      doc: "Zero or more product entries.",
      children: [],
    },
    {
      id: "ct-choiceType",
      kind: "complexType",
      name: "choiceType",
      compositor: "choice",
      cardinality: "1..1",
      doc: "A choice between either and or.",
      children: ["el-either", "el-or"],
      expanded: true,
    },
    {
      id: "el-either",
      kind: "element",
      name: "either",
      type: "xs:string",
      cardinality: "1..1",
      doc: "First branch of the choice.",
      children: [],
    },
    {
      id: "el-or",
      kind: "element",
      name: "or",
      type: "xs:string",
      cardinality: "2..4",
      repeating: true,
      doc: "Repeating branch (2 to 4 occurrences).",
      children: [],
    },
    {
      id: "ct-loggingType",
      kind: "complexType",
      name: "loggingType",
      compositor: "all",
      cardinality: "1..1",
      doc: "Logging container (all-compositor).",
      children: ["el-log-level", "el-log-message"],
      expanded: false,
    },
    {
      id: "el-log-level",
      kind: "element",
      name: "level",
      type: "logLevelType",
      cardinality: "1..1",
      doc: "Severity level.",
      children: [],
    },
    {
      id: "el-log-message",
      kind: "element",
      name: "message",
      type: "xs:string",
      cardinality: "1..1",
      doc: "Log message body.",
      children: [],
    },
    {
      id: "st-lengthRestriction",
      kind: "simpleType",
      name: "lengthRestricitionType",
      base: "xs:string",
      cardinality: "1..1",
      doc: "a simple string with a max length",
      restrictions: { maxLength: 255 },
      children: [],
    },
  ],
};

export const paletteGroups = [
  {
    label: "Structure",
    items: [
      { id: "element", name: "element", icon: "Code2", color: "#dcdcaa", desc: "Named element declaration" },
      { id: "attribute", name: "attribute", icon: "AtSign", color: "#9cdcfe", desc: "Attribute on an element" },
      { id: "group", name: "group", icon: "Group", color: "#c586c0", desc: "Reusable model group" },
      { id: "any", name: "any", icon: "Asterisk", color: "#d7ba7d", desc: "xs:any wildcard" },
    ],
  },
  {
    label: "Compositors",
    items: [
      { id: "sequence", name: "sequence", icon: "ListChecks", color: "#79c0a4", desc: "Ordered list of children" },
      { id: "choice", name: "choice", icon: "Shuffle", color: "#c586c0", desc: "Exactly one of the children" },
      { id: "all", name: "all", icon: "Layers3", color: "#ce9178", desc: "Each child once, any order" },
    ],
  },
  {
    label: "Types",
    items: [
      { id: "complexType", name: "complexType", icon: "Boxes", color: "#7aa6ff", desc: "Nested structure with children" },
      { id: "simpleType", name: "simpleType", icon: "Box", color: "#aac7ff", desc: "Restriction of a primitive type" },
      { id: "extension", name: "extension", icon: "PlusSquare", color: "#6a9955", desc: "Extend an existing type" },
      { id: "restriction", name: "restriction", icon: "MinusSquare", color: "#f48771", desc: "Restrict an existing type" },
    ],
  },
  {
    label: "Facets",
    items: [
      { id: "enumeration", name: "enumeration", icon: "List", color: "#dcdcaa", desc: "Allowed value set" },
      { id: "pattern", name: "pattern", icon: "Regex", color: "#c586c0", desc: "Regex pattern" },
      { id: "length", name: "length", icon: "Ruler", color: "#79c0a4", desc: "Length / min / max" },
      { id: "range", name: "range", icon: "MoveHorizontal", color: "#9cdcfe", desc: "Min/max numeric value" },
    ],
  },
];

export const xsdPrimitives = [
  "xs:string", "xs:boolean", "xs:integer", "xs:decimal", "xs:double", "xs:float",
  "xs:date", "xs:time", "xs:dateTime", "xs:anyURI", "xs:base64Binary", "xs:ID", "xs:IDREF",
];
