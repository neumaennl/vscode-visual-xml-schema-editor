import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { formChoice } from './enums';
import { annotated } from './annotated';
import { localSimpleType } from './localSimpleType';
@XmlRoot('attribute', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class attribute extends annotated {
  @XmlAttribute('type')
  type_?: String;

  @XmlAttribute('use')
  use?: String;

  @XmlAttribute('default')
  default_?: String;

  @XmlAttribute('fixed')
  fixed?: String;

  @XmlAttribute('form')
  form?: formChoice;

  @XmlAttribute('name')
  name?: String;

  @XmlAttribute('ref')
  ref?: String;

  @XmlElement('simpleType', { type: () => localSimpleType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: localSimpleType;

}