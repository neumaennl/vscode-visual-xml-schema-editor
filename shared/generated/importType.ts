import { XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
export class importType extends annotated {
  @XmlAttribute('namespace')
  namespace?: String;

  @XmlAttribute('schemaLocation')
  schemaLocation?: String;

}