import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { openAttrs } from './openAttrs.js';
import { annotationType } from './annotationType.js';
/**
 * This type is extended by all types which allow annotation
 * other than <schema> itself
 */
@XmlRoot('annotated', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class annotated extends openAttrs {
  @XmlAttribute('id')
  id?: string;

  @XmlElement('annotation', { type: () => annotationType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: annotationType;

}