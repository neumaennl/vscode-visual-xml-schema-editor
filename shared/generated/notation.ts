import { XmlRoot, XmlAttribute } from '@neumaennl/xmlbind-ts';
import type { public_ } from './types';
import { annotated } from './annotated';
@XmlRoot('notation', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class notation extends annotated {
  @XmlAttribute('name')
  name!: String;

  @XmlAttribute('public')
  public_?: public_;

  @XmlAttribute('system')
  system?: String;

}