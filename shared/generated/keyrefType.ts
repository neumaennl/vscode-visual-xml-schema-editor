import { XmlAttribute } from '@neumaennl/xmlbind-ts';
import { keybase } from './keybase';
export class keyrefType extends keybase {
  @XmlAttribute('refer')
  refer!: string;

}