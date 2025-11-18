import { XmlRoot, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { blockSet, formChoice, fullDerivationSet } from './enums';
import { openAttrs } from './openAttrs';
@XmlRoot('schema', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class schema extends openAttrs {
  @XmlAttribute('targetNamespace')
  targetNamespace?: String;

  @XmlAttribute('version')
  version?: String;

  @XmlAttribute('finalDefault')
  finalDefault?: fullDerivationSet;

  @XmlAttribute('blockDefault')
  blockDefault?: blockSet;

  @XmlAttribute('attributeFormDefault')
  attributeFormDefault?: formChoice;

  @XmlAttribute('elementFormDefault')
  elementFormDefault?: formChoice;

  @XmlAttribute('id')
  id?: String;

}