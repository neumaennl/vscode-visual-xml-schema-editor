import { XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated.js';
export class importType extends annotated {
  @XmlAttribute('namespace')
  namespace?: string;

  @XmlAttribute('schemaLocation')
  schemaLocation?: string;

}