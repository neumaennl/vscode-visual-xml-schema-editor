import { XmlAttribute } from '@neumaennl/xmlbind-ts';
import { allNNI } from './enums';
import { wildcard } from './wildcard';
export class anyType_1 extends wildcard {
  @XmlAttribute('minOccurs')
  minOccurs?: Number;

  @XmlAttribute('maxOccurs')
  maxOccurs?: allNNI;

}