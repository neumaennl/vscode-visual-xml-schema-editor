import { VisualXsdComponent, ValidationError } from './xsd';
import { OccurrenceConstraints, XsdType } from './types';
import { XsdComplexType } from './complexType';
import { XsdSimpleType } from './simpleType';

export class XsdElement extends VisualXsdComponent {
    constructor(
        public name: string,
        public type?: XsdType,
        public constraints: OccurrenceConstraints = {},
        public contentModel?: XsdComplexType|XsdSimpleType,
    ) { super(); }

    override getName(): string {
        return this.name;
    }

    override getChildren(): VisualXsdComponent[] {
        return this.contentModel ? [this.contentModel] : [];
    }

    override render(selection: d3.Selection<SVGGElement, any, any, any>): void {
        //TODO: Implement rendering logic here
    }

    validate(): ValidationError[] {
        let errors = this.validateName(this.name, 'Element');

        if (this.constraints.minOccurs !== undefined && this.constraints.minOccurs < 0) {
            errors.push({
                code: 'INVALID_OCCURRENCE',
                message: `minOccurs cannot be negative`,
                component: 'Element',
                path: this.name
            });
        }

        if(this.contentModel) {
            errors.push(...this.contentModel.validate());
        }

        return errors;
    }

    toXsd(): string {
        const attrs = [
            `name="${this.name}"`,
            this.type && `type="${this.type}"`,
            this.constraints.minOccurs !== undefined && `minOccurs="${this.constraints.minOccurs}"`,
            this.constraints.maxOccurs !== undefined && `maxOccurs="${this.constraints.maxOccurs}"`
        ].filter(Boolean).join(' ');
        return `
        <xs:element ${attrs}>
        ${this.contentModel?.toXsd()}
        </xs:element>`;
    }
}