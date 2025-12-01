import { XmlRoot, XmlElement, XmlAttribute, XmlAnyAttribute } from '@neumaennl/xmlbind-ts';
import { simpleDerivationSet } from './enums';
import { annotationType } from './annotationType';
import { restrictionType } from './restrictionType';
import { listType } from './listType';
import { unionType } from './unionType';
/**
 * Required at the top level
 */
@XmlRoot('topLevelSimpleType', { namespace: 'http://www.w3.org/2001/XMLSchema', prefixes: { 'http://www.w3.org/2001/XMLSchema': 'xs', 'http://www.w3.org/2001/XMLSchema-hasFacetAndProperty': 'hfp', 'http://www.w3.org/XML/1998/namespace': 'imp1' } })
export class topLevelSimpleType {
  @XmlAnyAttribute()
  _anyAttributes?: { [name: string]: string };

  @XmlAttribute('id')
  id?: String;

  @XmlAttribute('final')
  final?: simpleDerivationSet;

  @XmlAttribute('name')
  name!: String;

  @XmlElement('annotation', { type: () => annotationType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  annotation?: annotationType;

  /**
   * base attribute and simpleType child are mutually
   * exclusive, but one or other is required
   */
  @XmlElement('restriction', { type: () => restrictionType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  restriction?: restrictionType;

  /**
   * itemType attribute and simpleType child are mutually
   * exclusive, but one or other is required
   */
  @XmlElement('list', { type: () => listType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  list?: listType;

  /**
   * memberTypes attribute must be non-empty or there must be
   * at least one simpleType child
   */
  @XmlElement('union', { type: () => unionType, namespace: 'http://www.w3.org/2001/XMLSchema' })
  union?: unionType;

}