import { XmlAttribute } from '@neumaennl/xmlbind-ts';
import type { public_ } from './types.js';
import { annotated } from './annotated.js';
export class notationType extends annotated {
  @XmlAttribute('name')
  name!: string;

  @XmlAttribute('public')
  public_?: public_;

  @XmlAttribute('system')
  system?: string;

}