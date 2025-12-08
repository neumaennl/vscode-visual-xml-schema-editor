import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { formChoice } from './enums';
import { annotated } from './annotated';
import { localSimpleType } from './localSimpleType';
@XmlRoot('attribute', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class attribute extends annotated {
  @XmlAttribute('type')
  type_?: string;

  @XmlAttribute('use')
  use?: string;

  @XmlAttribute('default')
  default_?: string;

  @XmlAttribute('fixed')
  fixed?: string;

  @XmlAttribute('form')
  form?: formChoice;

  @XmlAttribute('name')
  name?: string;

  @XmlAttribute('ref')
  ref?: string;

  @XmlElement('simpleType', { type: () => localSimpleType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: localSimpleType;

}