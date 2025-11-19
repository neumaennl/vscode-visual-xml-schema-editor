import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { openAttrs } from './openAttrs';
@XmlRoot('annotation', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class annotation extends openAttrs {
  @XmlAttribute('id')
  id?: String;

  @XmlElement('appinfo', { array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  appinfo?: any[];

  @XmlElement('documentation', { array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  documentation?: any[];

}