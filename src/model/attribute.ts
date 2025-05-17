import { XsdType } from './types';
import { ValidationError } from "./types";
import { SerializedNode, VisualXsdComponent } from "./base";

export class XsdAttribute extends VisualXsdComponent {
    constructor(
        public name: string,
        public type: XsdType,
        public use: 'required' | 'optional' | 'prohibited' = 'optional',
        public defaultValue?: string,
        public fixedValue?: string
    ) { super(); }

    toJSON(): SerializedNode {
        return {
            nodeKind: 'attribute',
            name: this.name,
            type: this.type,
            use: this.use,
            defaultValue: this.defaultValue,
            fixedValue: this.fixedValue
        };
    }

    static fromJSON(json: SerializedNode): XsdAttribute {
        if (json.nodeKind !== 'attribute') {
            throw new Error('Invalid attribute JSON');
        }
        return new XsdAttribute(
            json.name,
            json.type,
            json.use ?? 'optional',
            json.defaultValue,
            json.fixedValue
        );
    }

    override getName(): string {
        return this.name;
    }

    override getChildren(): VisualXsdComponent[] {
        return [];
    }

    override render(selection: d3.Selection<SVGGElement, any, any, any>): void {
        //TODO: Implement rendering logic here
    }

    validate(): ValidationError[] {
        let errors = this.validateName(this.name, 'Attribute');
        
        if (!this.type) {
            errors.push({
                code: 'MISSING_TYPE',
                message: `Attribute ${this.name} must have a type`,
                component: 'Attribute'
            });
        }

        if (this.defaultValue && this.fixedValue) {
            errors.push({
                code: 'CONFLICTING_VALUES',
                message: `Attribute cannot have both default and fixed values`,
                component: 'Attribute'
            });
        }

        return errors;
    }

    toXsd(): string {
        const attrs = [
            `name="${this.name}"`,
            `type="${this.type}"`,
            `use="${this.use}"`,
            this.defaultValue && `default="${this.defaultValue}"`,
            this.fixedValue && `fixed="${this.fixedValue}"`
        ].filter(Boolean).join(' ');

        return `<xs:attribute ${attrs}/>`;
    }
}