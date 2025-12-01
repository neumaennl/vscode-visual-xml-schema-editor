import { XmlRoot, XmlElement, XmlAttribute } from '@neumaennl/xmlbind-ts';
import { annotated } from './annotated';
import { selectorType } from './selectorType';
import { fieldType } from './fieldType';
@XmlRoot('keybase', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class keybase extends annotated {
  @XmlAttribute('name')
  name!: String;

  @XmlElement('selector', { type: () => selectorType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  selector!: selectorType;

  @XmlElement('field', { type: () => fieldType, array: true, namespace: 'http://www.w3.org/2001/XMLSchema' })
  field!: fieldType[];

}