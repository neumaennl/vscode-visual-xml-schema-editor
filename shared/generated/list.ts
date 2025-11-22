import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
import { localSimpleType } from './localSimpleType';
/**
 * itemType attribute and simpleType child are mutually
 * exclusive, but one or other is required
 */
@XmlRoot('list', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class list extends annotated {
  @XmlAttribute('itemType')
  itemType?: String;

  @XmlElement('simpleType', { type: localSimpleType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  simpleType?: localSimpleType;

}