import { XmlAttribute } from '@neumaennl/xmlbind-ts';
import type { allNNI } from './types';
import { wildcard } from './wildcard';
export class anyType_1 extends wildcard {
  @XmlAttribute('minOccurs', { type: Number })
  minOccurs?: number;

  @XmlAttribute('maxOccurs', { type: Number, allowStringFallback: true })
  maxOccurs?: allNNI;

}