import { XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
/**
 * A subset of XPath expressions for use
 * in selectors
 */
export class selectorType extends annotated {
  /**
   * A subset of XPath expressions for use
   * in selectors
   */
  @XmlAttribute('xpath')
  xpath!: string;

}