import { DOMParser, Element } from '@xmldom/xmldom';
import { XsdAttribute } from '../model/attribute';
import { XsdComplexType } from '../model/complexType';
import { XsdSequence, XsdChoice, XsdAll, XsdCompositor } from '../model/compositors';
import { XsdElement } from '../model/element';
import { XsdNamespace } from '../model/namespace';
import { XsdSimpleType, XsdRestriction } from '../model/simpleType';
import { RestrictionType } from '../model/types';
import { OccurrenceConstraints, XsdType } from '../model/types';
import { XsdSchema } from '../model/xsd';

export class XsdParser {
    private namespaces: XsdNamespace[] = [];

    static parse(fileName: string, xmlString: string): XsdSchema {
        return new XsdParser().parseSchema(fileName, xmlString);
    }

    private parseSchema(fileName: string, xmlString: string): XsdSchema {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');
        const schemaNode = doc.documentElement!;

        if (schemaNode.nodeName !== 'xs:schema') {
            throw new Error('Root element must be <xs:schema>');
        }

        // Parse namespaces
        this.parseNamespaces(schemaNode);

        const schema = new XsdSchema(
            fileName,
            schemaNode.getAttribute('targetNamespace') || undefined,
            schemaNode.getAttribute('xmlns') || undefined
        );

        // Parse all schema components
        Array.from(schemaNode.childNodes).forEach(node => {
            if (node.nodeType === node.ELEMENT_NODE) {
                switch (node.nodeName) {
                    case 'xs:element':
                        schema.elements.push(this.parseElement(node as Element));
                        break;
                    case 'xs:complexType':
                        schema.complexTypes.push(this.parseComplexType(node as Element));
                        break;
                    case 'xs:simpleType':
                        schema.simpleTypes.push(this.parseSimpleType(node as Element));
                        break;
                    case 'xs:attribute':
                        schema.attributes.push(this.parseGlobalAttribute(node as Element));
                        break;
                }
            }
        });

        return schema;
    }

    private parseNamespaces(node: Element): void {
        for (let i = 0; i < node.attributes.length; i++) {
            const attr = node.attributes[i];
            if (attr.name.startsWith('xmlns')) {
                const prefix = attr.name === 'xmlns' ? '' : attr.name.split(':')[1];
                this.namespaces.push(new XsdNamespace(
                    prefix,
                    attr.value,
                    attr.name === 'xmlns'
                ));
            }
        }
    }

    private parseElement(node: Element): XsdElement {
        const name = this.getRequiredAttribute(node, 'name');
        const type = node.getAttribute('type') as XsdType | undefined;
        const constraints = this.parseOccurrenceConstraints(node);

        // Inline complexType or simpleType
        let contentModel: XsdComplexType | XsdSimpleType | undefined = undefined;
        const complexType = this.findChild(node, 'xs:complexType');
        if (complexType) {
            contentModel = this.parseComplexType(complexType, /*allowAnonymous*/true);
        }
        const simpleType = this.findChild(node, 'xs:simpleType');
        if (simpleType) {
            contentModel = this.parseSimpleType(simpleType, /*allowAnonymous*/true);
        }

        return new XsdElement(name, type, constraints, contentModel);
    }

    private parseComplexType(node: Element, allowAnonymous = false): XsdComplexType {
        // Named or anonymous
        const name = node.getAttribute('name') || (allowAnonymous ? '' : undefined);
        if (!name && !allowAnonymous) {
            throw new Error('ComplexType must have a name');
        }

        // Parse content model (sequence, choice, all)
        let contentModel: XsdSequence | XsdChoice | XsdAll | null = null;
        const sequence = this.findChild(node, 'xs:sequence');
        const choice = this.findChild(node, 'xs:choice');
        const all = this.findChild(node, 'xs:all');
        if (sequence) contentModel = this.parseSequence(sequence);
        else if (choice) contentModel = this.parseChoice(choice);
        else if (all) contentModel = this.parseAll(all);

        // Support for extension (basic, not full inheritance)
        const complexContent = this.findChild(node, 'xs:complexContent');
        if (complexContent) {
            const extension = this.findChild(complexContent, 'xs:extension');
            if (extension) {
                // TODO: handle base type and merge base content model
                // For now, just parse children as usual
                const extSequence = this.findChild(extension, 'xs:sequence');
                if (extSequence) contentModel = this.parseSequence(extSequence);
            }
        }

        return new XsdComplexType(
            name || '', // anonymous types get empty string as name
            contentModel!,
            this.parseAttributes(node),
            node.getAttribute('abstract') === 'true'
        );
    }

    private parseSimpleType(node: Element, allowAnonymous = false): XsdSimpleType {
        const name = node.getAttribute('name') || (allowAnonymous ? '' : undefined);
        if (!name && !allowAnonymous) {
            throw new Error('SimpleType must have a name');
        }
        const list = this.findChild(node, 'xs:list');
        if (list) {
            return new XsdSimpleType(
                name || '',
                list.getAttribute('itemType') as XsdType,
                [],
                true
            );
        }
        const restriction = this.findChild(node, 'xs:restriction');
        if (restriction) {
            const baseType = this.getRequiredAttribute(restriction, 'base') as XsdType;
            const restrictions = Array.from(restriction.childNodes)
                .filter(n => n.nodeType === n.ELEMENT_NODE)
                .map(n => this.parseRestriction(n as Element));
            return new XsdSimpleType(name || '', baseType, restrictions);
        }
        const union = this.findChild(node, 'xs:union');
        if (union) {
            // TODO: handle union types
            // For now, just use first member type
            const memberTypes = union.getAttribute('memberTypes');
            return new XsdSimpleType(name || '', (memberTypes?.split(' ')[0] as XsdType) || 'xs:string', []);
        }
        throw new Error('SimpleType must have restriction, list, or union');
    }

    private parseRestriction(node: Element): XsdRestriction {
        const type = node.nodeName.replace('xs:', '') as RestrictionType;
        const value = this.getRequiredAttribute(node, 'value');
        return new XsdRestriction(type, value);
    }

    private parseSequence(node: Element): XsdSequence {
        return new XsdSequence(
            this.parseCompositorChildren(node),
            this.parseOccurrenceConstraints(node)
        );
    }

    private parseChoice(node: Element): XsdChoice {
        return new XsdChoice(
            this.parseCompositorChildren(node),
            this.parseOccurrenceConstraints(node)
        );
    }

    private parseAll(node: Element): XsdAll {
        return new XsdAll(
            this.parseCompositorChildren(node),
            this.parseOccurrenceConstraints(node)
        );
    }

    private parseCompositorChildren(node: Element): (XsdElement | XsdCompositor)[] {
        return Array.from(node.childNodes)
            .filter(n => n.nodeType === n.ELEMENT_NODE &&
                ['xs:element', 'xs:sequence', 'xs:choice', 'xs:all'].includes(n.nodeName))
            .map(n => {
                const el = n as Element;
                switch (el.nodeName) {
                    case 'xs:element': return this.parseElement(el);
                    case 'xs:sequence': return this.parseSequence(el);
                    case 'xs:choice': return this.parseChoice(el);
                    case 'xs:all': return this.parseAll(el);
                    default: throw new Error(`Unexpected compositor child: ${el.nodeName}`);
                }
            });
    }

    private parseAttributes(node: Element): XsdAttribute[] {
        // Parse both direct <xs:attribute> and attributeGroup (not implemented)
        return Array.from(node.childNodes)
            .filter(n => n.nodeType === n.ELEMENT_NODE && n.nodeName === 'xs:attribute')
            .map(n => this.parseAttribute(n as Element));
    }

    private parseAttribute(node: Element): XsdAttribute {
        // Inline simpleType support
        const simpleType = this.findChild(node, 'xs:simpleType');
        let type: XsdType | undefined = node.getAttribute('type') as XsdType | undefined;
        if (!type && simpleType) {
            // For inline simpleType, use its base type or 'xs:string'
            const restriction = this.findChild(simpleType, 'xs:restriction');
            type = restriction ? (restriction.getAttribute('base') as XsdType) : 'xs:string';
        }
        return new XsdAttribute(
            this.getRequiredAttribute(node, 'name'),
            type || 'xs:string',
            node.getAttribute('use') as 'required' | 'optional' | 'prohibited' || 'optional',
            node.getAttribute('default') || undefined,
            node.getAttribute('fixed') || undefined
        );
    }

    private parseGlobalAttribute(node: Element): XsdAttribute {
        return this.parseAttribute(node);
    }

    private parseOccurrenceConstraints(node: Element): OccurrenceConstraints {
        return {
            minOccurs: node.hasAttribute('minOccurs')
                ? parseInt(node.getAttribute('minOccurs')!)
                : undefined,
            maxOccurs: node.hasAttribute('maxOccurs')
                ? node.getAttribute('maxOccurs') === 'unbounded'
                    ? 'unbounded'
                    : parseInt(node.getAttribute('maxOccurs')!)
                : undefined
        };
    }

    private findChild(node: Element, name: string): Element | null {
        return Array.from(node.childNodes)
            .find(n => n.nodeType === n.ELEMENT_NODE && n.nodeName === name) as Element || null;
    }

    private getRequiredAttribute(node: Element, name: string): string {
        const value = node.getAttribute(name);
        if (!value) throw new Error(`Missing required attribute: ${name}`);
        return value;
    }
}