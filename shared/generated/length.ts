import { XmlRoot } from '@neumaennl/xmlbind-ts';
import { numFacet } from './numFacet';
@XmlRoot('length', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class length extends numFacet {}