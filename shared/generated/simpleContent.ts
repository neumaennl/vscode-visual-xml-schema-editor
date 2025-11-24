import { XmlRoot } from '@neumaennl/xmlbind-ts';
import { simpleContentType } from './simpleContentType';
@XmlRoot('simpleContent', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class simpleContent extends simpleContentType {}