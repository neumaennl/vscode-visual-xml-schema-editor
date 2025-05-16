export class XsdNamespace {
    constructor(
        public prefix: string,
        public uri: string,
        public isDefault: boolean = false
    ) {}

    toXsd(): string {
        return this.isDefault 
            ? `xmlns="${this.uri}"`
            : `xmlns:${this.prefix}="${this.uri}"`;
    }

    qualify(name: string): string {
        return this.isDefault ? name : `${this.prefix}:${name}`;
    }
}