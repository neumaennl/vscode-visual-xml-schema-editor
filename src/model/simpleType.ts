import { RestrictionType, XsdType } from './types';
import { ValidationError } from "./types";
import { SerializedNode, VisualXsdComponent } from "./base";

export class XsdSimpleType extends VisualXsdComponent {
    constructor(
        public name: string,
        public baseType: XsdType,
        public restrictions: XsdRestriction[] = [],
        public isList: boolean = false
    ) { super(); }

    toJSON(): SerializedNode {
        return {
            nodeKind: 'simpleType',
            name: this.name,
            baseType: this.baseType,
            restrictions: this.restrictions.map(r => r.toJSON()),
            isList: this.isList
        };
    }

    static fromJSON(json: SerializedNode): XsdSimpleType {
        if (json.nodeKind !== 'simpleType') {
            throw new Error('Invalid simpleType JSON');
        }
        return new XsdSimpleType(
            json.name,
            json.baseType,
            json.restrictions?.map((r: SerializedNode) => XsdRestriction.fromJSON(r)) ?? [],
            json.isList ?? false
        );
    }

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
        const errors = this.validateName(this.name, 'SimpleType');
        
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

    toJSON(): SerializedNode {
        return {
            nodeKind: 'restriction',
            type: this.type,
            value: this.value
        };
    }

    static fromJSON(json: SerializedNode): XsdRestriction {
        if (json.nodeKind !== 'restriction') {
            throw new Error('Invalid restriction JSON');
        }
        return new XsdRestriction(
            json.type,
            json.value
        );
    }

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