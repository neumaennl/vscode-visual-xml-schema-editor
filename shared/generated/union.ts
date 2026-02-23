import { XmlRoot } from '@neumaennl/xmlbind-ts';
import { unionType } from './unionType';
/**
 * memberTypes attribute must be non-empty or there must be
 * at least one simpleType child
 */
@XmlRoot('union', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class union extends unionType {
  _namespacePrefixes?: Record<string, string>;

}