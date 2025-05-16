import { RestrictionType, XsdType } from './types';
import { VisualXsdComponent, ValidationError } from './xsd';

export class XsdSimpleType extends VisualXsdComponent {
    constructor(
        public name: string,
        public baseType: XsdType,
        public restrictions: XsdRestriction[] = [],
        public isList: boolean = false
    ) { super(); }

    override getName(): string {
        return this.name;
    }

    override getChildren(): VisualXsdComponent[] {
        return this.restrictions;
    }

    override render(selection: d3.Selection<SVGGElement, any, any, any>): void {
        //TODO: Implement rendering logic here
    }

    validate(): ValidationError[] {
        let errors = this.validateName(this.name, 'SimpleType');
        
        if (!this.baseType) {
            errors.push({
                code: 'MISSING_BASE_TYPE',
                message: `SimpleType ${this.name} must have a base type`,
                component: 'SimpleType'
            });
        }

        return [...errors, ...this.restrictions.flatMap(r => r.validate())];
    }

    toXsd(): string {
        const restrictionContent = this.restrictions.map(r => r.toXsd()).join('\n');
        
        return `
        <xs:simpleType name="${this.name}">
            ${this.isList ? 
                `<xs:list itemType="${this.baseType}"/>` :
                `<xs:restriction base="${this.baseType}">
                    ${restrictionContent}
                </xs:restriction>`}
        </xs:simpleType>`;
    }
}

export class XsdRestriction extends VisualXsdComponent {
    constructor(
        public type: RestrictionType,
        public value: string
    ) { super(); }

    override getName(): string {
        return this.type;
    }

    override getChildren(): VisualXsdComponent[] {
        return [];
    }

    override render(selection: d3.Selection<SVGGElement, any, any, any>): void {
        //TODO: Implement rendering logic here
    }

    validate(): ValidationError[] {
        const errors: ValidationError[] = [];
        
        if (this.type === 'length' && isNaN(Number(this.value))) {
            errors.push({
                code: 'INVALID_RESTRICTION',
                message: `Length restriction must be a number`,
                component: 'Restriction'
            });
        }

        return errors;
    }

    toXsd(): string {
        return `<xs:${this.type} value="${this.value}"/>`;
    }
}