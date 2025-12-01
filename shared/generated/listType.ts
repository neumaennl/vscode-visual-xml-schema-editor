import { XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
import { localSimpleType } from './localSimpleType';
/**
 * itemType attribute and simpleType child are mutually
 * exclusive, but one or other is required
 */
export class listType extends annotated {
  @XmlAttribute('itemType')
  itemType?: String;

  @XmlElement('simpleType', { type: () => localSimpleType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: localSimpleType;

}