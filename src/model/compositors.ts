import { ValidationError } from "./types";
import { SerializedNode, VisualXsdComponent } from "./base";
import { XsdElement } from './element';
import { OccurrenceConstraints } from './types';

export abstract class XsdCompositor extends VisualXsdComponent {
    constructor(
        public children: (XsdElement | XsdCompositor)[],
        public constraints: OccurrenceConstraints = {}
    ) { super(); }

    abstract getTagName(): string;

    getChildren(): VisualXsdComponent[] {
        return this.children;
    }

    getName(): string {
        return this.getTagName();
    }

    validate(): ValidationError[] {
        const errors: ValidationError[] = [];

        if (this.children.length === 0) {
            errors.push({
                code: 'EMPTY_COMPOSITOR',
                message: `${this.getTagName()} cannot be empty`,
                component: 'Compositor'
            });
        }

        return [...errors, ...this.children.flatMap(c => c.validate())];
    }

    toXsd(): string {
        const attrs = [
            this.constraints.minOccurs !== undefined && `minOccurs="${this.constraints.minOccurs}"`,
            this.constraints.maxOccurs !== undefined && `maxOccurs="${this.constraints.maxOccurs}"`
        ].filter(Boolean).join(' ');

        return `
        <xs:${this.getTagName()} ${attrs}>
            ${this.children.map(c => c.toXsd()).join('\n')}
        </xs:${this.getTagName()}>`;
    }

    toJSON(): SerializedNode {
        return {
            nodeKind: this.getTagName(),
            children: this.children.map(c => c.toJSON()),
            constraints: this.constraints
        };
    }

    static fromJSON(json: SerializedNode): XsdSequence | XsdChoice | XsdAll {
        if (!['sequence', 'choice', 'all'].includes(json.nodeKind)) {
            throw new Error(`Invalid compositor type: ${json.nodeKind}`);
        }

        const children = json.children?.map((child: SerializedNode) => {
            if (child.nodeKind === 'element') {
                return XsdElement.fromJSON(child);
            }
            return XsdCompositor.fromJSON(child);
        }) ?? [];

        switch (json.nodeKind) {
            case 'sequence':
                return new XsdSequence(children, json.constraints);
            case 'choice':
                return new XsdChoice(children, json.constraints);
            case 'all':
                return new XsdAll(children, json.constraints);
            default:
                throw new Error(`Unknown compositor type: ${json.nodeKind}`);
        }
    }
}

export class XsdSequence extends XsdCompositor {
    getTagName(): string { return 'sequence'; }

    override render(selection: d3.Selection<SVGGElement, any, any, any>): void {
        //TODO: Implement rendering logic for the sequence
    }
}

export class XsdChoice extends XsdCompositor {
    getTagName(): string { return 'choice'; }

    override render(selection: d3.Selection<SVGGElement, any, any, any>): void {
        //TODO: Implement rendering logic for the choice
    }
}

export class XsdAll extends XsdCompositor {
    getTagName(): string { return 'all'; }

    override render(selection: d3.Selection<SVGGElement, any, any, any>): void {
        //TODO: Implement rendering logic for the all
    }
}