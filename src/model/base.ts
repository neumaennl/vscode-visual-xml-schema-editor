import { ValidationError } from "./types";

export abstract class VisualXsdComponent {
    abstract toXsd(): string;
    abstract validate(): ValidationError[];

    protected validateName(name: string, componentType: string): ValidationError[] {
        const errors: ValidationError[] = [];
        if (!name) {
            errors.push({
                code: 'MISSING_NAME',
                message: `${componentType} name is required`,
                component: componentType
            });
        } else if (!/^[a-zA-Z_][\w.-]*$/.test(name)) {
            errors.push({
                code: 'INVALID_NAME',
                message: `Invalid ${componentType} name: ${name}`,
                component: componentType
            });
        }
        return errors;
    }
    abstract render(selection: d3.Selection<SVGGElement, any, any, any>): void;
    abstract getChildren(): VisualXsdComponent[];
    abstract getName(): string;
}

export interface SerializedNode {
    nodeKind: string;  // discriminator for JSON deserialization
    [key: string]: any;
}
