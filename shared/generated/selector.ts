import { XmlRoot, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
/**
 * A subset of XPath expressions for use
 * in selectors
 */
@XmlRoot('selector', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class selector extends annotated {
  /**
   * A subset of XPath expressions for use
   * in selectors
   */
  @XmlAttribute('xpath')
  xpath!: String;

}