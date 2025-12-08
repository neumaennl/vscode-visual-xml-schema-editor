import { XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
/**
 * A subset of XPath expressions for use
 * in fields
 */
export class fieldType extends annotated {
  /**
   * A subset of XPath expressions for use
   * in fields
   */
  @XmlAttribute('xpath')
  xpath!: string;

}