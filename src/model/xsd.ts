import * as d3 from "d3";
import { XsdAttribute } from "./attribute";
import { XsdComplexType } from "./complexType";
import { XsdElement } from "./element";
import { XsdSimpleType } from "./simpleType";
import { SerializedNode, VisualXsdComponent } from "./base";
import { ValidationError } from "./types";

export class XsdSchema extends VisualXsdComponent {
    constructor(
        private name: string,
        public targetNamespace?: string,
        public xmlns?: string,
        public elements: XsdElement[] = [],
        public complexTypes: XsdComplexType[] = [],
        public simpleTypes: XsdSimpleType[] = [],
        public attributes: XsdAttribute[] = []
    ) { super(); }

    override getName(): string {
        return this.name;
    }

    override getChildren(): VisualXsdComponent[] {
        return [
            ...this.elements,
            ...this.complexTypes,
            ...this.simpleTypes,
            ...this.attributes
        ];
    }
    override render(selection: d3.Selection<SVGGElement, any, any, any>): void {
        //TODO: Implement rendering logic for the schema
    }

    override validate(): ValidationError[] {
        const errors: ValidationError[] = [];

        // Unique name validation
        const allNames = [
            ...this.elements.map(e => e.name),
            ...this.complexTypes.map(ct => ct.name),
            ...this.simpleTypes.map(st => st.name)
        ];
        const duplicates = allNames.filter((name, index) => allNames.indexOf(name) !== index);
        duplicates.forEach(name => {
            errors.push({
                code: 'DUPLICATE_NAME',
                message: `Duplicate component name: ${name}`,
                component: 'Schema'
            });
        });

        // Validate all components
        this.elements.forEach(e => errors.push(...e.validate()));
        this.complexTypes.forEach(ct => errors.push(...ct.validate()));
        this.simpleTypes.forEach(st => errors.push(...st.validate()));

        return errors;
    }

    override toXsd(): string {
        const nsAttrs = [
            this.targetNamespace && `targetNamespace="${this.targetNamespace}"`,
            this.xmlns && `xmlns="${this.xmlns}"`
        ].filter(Boolean).join(' ');

        return `
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" ${nsAttrs}>
            ${this.elements.map(e => e.toXsd()).join('\n')}
            ${this.complexTypes.map(ct => ct.toXsd()).join('\n')}
            ${this.simpleTypes.map(st => st.toXsd()).join('\n')}
            ${this.attributes.map(a => a.toXsd()).join('\n')}
        </xs:schema>`;
    }

    // Transformation methods
    addElement(element: XsdElement): this {
        this.elements.push(element);
        return this;
    }

    findElement(name: string): XsdElement | undefined {
        return this.elements.find(e => e.name === name);
    }

    removeElement(name: string): this {
        this.elements = this.elements.filter(e => e.name !== name);
        return this;
    }

    toJSON(): SerializedNode {
        return {
            nodeKind: 'schema',
            name: this.name,
            targetNamespace: this.targetNamespace,
            xmlns: this.xmlns,
            elements: this.elements.map(e => e.toJSON()),
            complexTypes: this.complexTypes.map(ct => ct.toJSON()),
            simpleTypes: this.simpleTypes.map(st => st.toJSON()),
            attributes: this.attributes.map(a => a.toJSON())
        };
    }

    static fromJSON(json: SerializedNode): XsdSchema {
        if (json.nodeKind !== 'schema') {
            throw new Error('Invalid schema JSON');
        }
        return new XsdSchema(
            json.name,
            json.targetNamespace,
            json.xmlns,
            json.elements?.map((e: SerializedNode) => XsdElement.fromJSON(e)) ?? [],
            json.complexTypes?.map((ct: SerializedNode) => XsdComplexType.fromJSON(ct)) ?? [],
            json.simpleTypes?.map((st: SerializedNode) => XsdSimpleType.fromJSON(st)) ?? [],
            json.attributes?.map((a: SerializedNode) => XsdAttribute.fromJSON(a)) ?? []
        );
    }
}