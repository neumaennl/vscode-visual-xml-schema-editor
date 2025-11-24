import { XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
export class includeType extends annotated {
  @XmlAttribute('schemaLocation')
  schemaLocation!: String;

}