import { XmlRoot, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
/**
 * This type is extended by almost all schema types
 * to allow attributes from other namespaces to be
 * added to user schemas.
 */
@XmlRoot('openAttrs', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class openAttrs {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

}