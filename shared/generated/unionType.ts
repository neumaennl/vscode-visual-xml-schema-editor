import { XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
import { localSimpleType } from './localSimpleType';
/**
 * memberTypes attribute must be non-empty or there must be
 * at least one simpleType child
 */
export class unionType extends annotated {
  @XmlAttribute('memberTypes')
  memberTypes?: string;

  @XmlElement('simpleType', { type: () => localSimpleType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: localSimpleType[];

}