import { XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated.js';
import { localSimpleType } from './localSimpleType.js';
/**
 * itemType attribute and simpleType child are mutually
 * exclusive, but one or other is required
 */
export class listType extends annotated {
  @XmlAttribute('itemType')
  itemType?: string;

  @XmlElement('simpleType', { type: () => localSimpleType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: localSimpleType;

}