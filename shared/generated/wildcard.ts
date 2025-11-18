import { XmlRoot, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { namespaceList } from './enums';
import { annotated } from './annotated';
@XmlRoot('wildcard', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class wildcard extends annotated {
  @XmlAttribute('namespace')
  namespace?: namespaceList;

  @XmlAttribute('processContents')
  processContents?: String;

}