import { XmlRoot } from '@neumaennl/xmlbind-ts';
import { whiteSpaceType } from './whiteSpaceType';
@XmlRoot('whiteSpace', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class whiteSpace extends whiteSpaceType {
  _namespacePrefixes?: Record<string, string>;

}