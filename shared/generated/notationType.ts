import { XmlAttribute } from '@neumaennl/xmlbind-ts';
import type { public_ } from './types';
import { annotated } from './annotated';
export class notationType extends annotated {
  @XmlAttribute('name')
  name!: string;

  @XmlAttribute('public')
  public_?: public_;

  @XmlAttribute('system')
  system?: string;

}