import { XsdAttribute } from './attribute';
import { XsdAll, XsdChoice, XsdSequence } from './compositors';
import { VisualXsdComponent, ValidationError } from './xsd';

export class XsdComplexType extends VisualXsdComponent {
    constructor(
        public name: string,
        public contentModel: XsdSequence | XsdChoice | XsdAll,
        public attributes: XsdAttribute[] = [],
        public isAbstract: boolean = false
    ) { super(); }

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
        let errors = this.validateName(this.name, 'ComplexType');
        
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