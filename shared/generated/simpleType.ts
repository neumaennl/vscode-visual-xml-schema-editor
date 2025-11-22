import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { simpleDerivationSet } from './enums';
import { annotated } from './annotated';
/**
 * Can be restricted to required or forbidden
 */
@XmlRoot('simpleType', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class simpleType extends annotated {
  @XmlAttribute('final')
  final?: simpleDerivationSet;

  /**
   * Can be restricted to required or forbidden
   */
  @XmlAttribute('name')
  name?: String;

  /**
   * base attribute and simpleType child are mutually
   * exclusive, but one or other is required
   */
  @XmlElement('restriction', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  restriction?: any;

  /**
   * itemType attribute and simpleType child are mutually
   * exclusive, but one or other is required
   */
  @XmlElement('list', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  list?: any;

  /**
   * memberTypes attribute must be non-empty or there must be
   * at least one simpleType child
   */
  @XmlElement('union', { namespace: 'http://www.w3.org/2001/XMLSchema' })
  union?: any;

}