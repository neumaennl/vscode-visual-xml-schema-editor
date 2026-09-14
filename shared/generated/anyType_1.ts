import { XmlAttribute } from '@neumaennl/xmlbind-ts';
import type { allNNI } from './types.js';
import { wildcard } from './wildcard.js';
export class anyType_1 extends wildcard {
  @XmlAttribute('minOccurs', { type: Number })
  minOccurs?: number;

  @XmlAttribute('maxOccurs', { type: Number, allowStringFallback: true })
  maxOccurs?: allNNI;

}