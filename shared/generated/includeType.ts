import { XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated.js';
export class includeType extends annotated {
  @XmlAttribute('schemaLocation')
  schemaLocation!: string;

}