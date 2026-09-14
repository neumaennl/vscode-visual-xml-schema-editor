import { XmlAttribute } from '@neumaennl/xmlbind-ts';
import { keybase } from './keybase.js';
export class keyrefType extends keybase {
  @XmlAttribute('refer')
  refer!: string;

}