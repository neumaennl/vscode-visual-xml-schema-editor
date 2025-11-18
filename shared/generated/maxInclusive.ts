import { XmlRoot } from '@neumaennl/xmlbind-ts';
import { facet } from './facet';
@XmlRoot('maxInclusive', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class maxInclusive extends facet {}