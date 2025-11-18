import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { simpleDerivationSet } from './enums';
import { annotated } from './annotated';
@XmlRoot('simpleType', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class simpleType extends annotated {
  @XmlAttribute('final')
  final?: simpleDerivationSet;

  @XmlAttribute('name')
  name?: String;

  @XmlElement('restriction', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  restriction?: any;

  @XmlElement('list', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  list?: any;

  @XmlElement('union', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  union?: any;

}