import { XmlRoot } from '@neumaennl/xmlbind-ts';
import { explicitGroup } from './explicitGroup';
@XmlRoot('sequence', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class sequence extends explicitGroup {
  _namespacePrefixes?: Record<string, string>;

}