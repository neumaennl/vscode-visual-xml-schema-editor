import { XsdAttribute } from './attribute';
import { XsdAll, XsdChoice, XsdSequence, XsdCompositor } from './compositors';
import { ValidationError } from "./types";
import { SerializedNode, VisualXsdComponent } from "./base";

export class XsdComplexType extends VisualXsdComponent {
    constructor(
        public name: string,
        public contentModel: XsdSequence | XsdChoice | XsdAll,
        public attributes: XsdAttribute[] = [],
        public isAbstract: boolean = false
    ) { super(); }

    toJSON(): SerializedNode {
        return {
            nodeKind: 'complexType',
            name: this.name,
            contentModel: this.contentModel?.toJSON(),
            attributes: this.attributes.map(a => a.toJSON()),
            isAbstract: this.isAbstract
        };
    }

    static fromJSON(json: SerializedNode): XsdComplexType {
        if (json.nodeKind !== 'complexType') {
            throw new Error('Invalid complexType JSON');
        }
        return new XsdComplexType(
            json.name,
            json.contentModel && XsdCompositor.fromJSON(json.contentModel),
            json.attributes?.map((a: SerializedNode) => XsdAttribute.fromJSON(a)) ?? [],
            json.isAbstract
        );
    }

    override getName(): string {
        return this.name;
    }

    override getChildren(): VisualXsdComponent[] {
        return [
            this.contentModel,
            ...this.attributes,
        ];
    }

    override render(selection: d3.Selection<SVGGElement, any, any, any>): void {
        //TODO: Implement rendering logic here
    }

    validate(): ValidationError[] {
        const errors = this.validateName(this.name, 'ComplexType');

        if (!this.contentModel) {
            errors.push({
                code: 'MISSING_CONTENT',
                message: `ComplexType ${this.name} must have a content model`,
                component: 'ComplexType'
            });
        } else {
            errors.push(...this.contentModel.validate());
        }

        return [...errors, ...this.attributes.flatMap(a => a.validate())];
    }

    toXsd(): string {
        return `
        <xs:complexType name="${this.name}" ${this.isAbstract ? 'abstract="true"' : ''}>
            ${this.contentModel.toXsd()}
            ${this.attributes.map(a => a.toXsd()).join('\n')}
        </xs:complexType>`;
    }
}