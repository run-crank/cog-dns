import { Mechanism } from './mechanism';
import { Message } from './message';

export class SpfRecord {
  mechanisms: Mechanism[];
  messages: Message[];
  value: boolean;
}
