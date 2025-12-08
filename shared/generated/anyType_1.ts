import { XmlAttribute } from '@neumaennl/xmlbind-ts';
import type { allNNI } from './types';
import { wildcard } from './wildcard';
export class anyType_1 extends wildcard {
  @XmlAttribute('minOccurs')
  minOccurs?: number;

  @XmlAttribute('maxOccurs')
  maxOccurs?: allNNI;

}