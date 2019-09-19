import { Message } from './../models/message';
import { Mechanism } from '../models/mechanism';
import { SpfRecord } from './../models/spf-record';
/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class ValidateSpfRecord extends BaseStep implements StepInterface {

  protected stepName: string = "Check the validity of a domain's SPF record";
  protected stepExpression: string = 'the spf record for (?<domain>.+) should be valid';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [{
    field: 'domain',
    type: FieldDefinition.Type.STRING,
    description: 'Domain name',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const sizeOf = require('object-sizeof');
    const stepData: any = step.getData().toJavaScript();
    const domain: string = stepData.domain;
    let records: SpfRecord[];

    try {
      records = await this.client.findSpfRecordByDomain(domain);
    } catch (e) {
      return this.error('There was a problem checking the domain: %s', [e.toString()]);
    }

    if (records.length !== 1) {
      // If record has more than 1 record, return a fail.
      // tslint:disable-next-line:max-line-length
      return this.fail('Domain %s does not have exactly one SPF record, it has %s SPF records', [domain, records.length.toString()]);
    // tslint:disable-next-line:max-line-length
    } else if (records[0].mechanisms.filter((mechanism: Mechanism) => mechanism.type === 'include' || mechanism.type === 'a' || mechanism.type === 'mx' || mechanism.type === 'ptr' || mechanism.type === 'exists').length > 10) {
      // If record has more than 10 lookups, return a fail.
      // tslint:disable-next-line:max-line-length
      const mechanismLength: string = records[0].mechanisms.filter((mechanism: Mechanism) => mechanism.type === 'include' || mechanism.type === 'a' || mechanism.type === 'mx' || mechanism.type === 'ptr' || mechanism.type === 'exists').length.toString();
      // tslint:disable-next-line:max-line-length
      return this.fail('Domain %s SPF record has more than ten lookups, it has %s lookups', [domain, mechanismLength]);
    } else if (JSON.stringify(records[0]).length > 255) {
      // If record has more than 255 characters, return a fail.
      // tslint:disable-next-line:max-line-length
      return this.fail('Domain %s SPF record has more than 255 characters. It has %s characters', [domain, JSON.stringify(records[0]).length.toString()]);
    } else if (sizeOf(records[0]) > 512) {
      // If record has more than 512 bytes, return a fail.
      // tslint:disable-next-line:max-line-length
      return this.fail('Domain %s SPF record has more than 512 bytes. It has %s bytes', [domain, sizeOf(JSON.stringify(records[0]))]);
    // tslint:disable-next-line:max-line-length
    } else if (records[0].messages != null && records[0].messages.filter((message: Message) => message.type === 'error').length > 0) {
      // If record has a syntax error, return a fail.
      // tslint:disable-next-line:max-line-length
      return this.fail('Domain %s SPF record has a syntax error', [domain]);
    } else if (records[0].mechanisms[records[0].mechanisms.length - 1].prefix !== '~'
      || records[0].mechanisms[records[0].mechanisms.length - 1].type !== 'all') {
      // If record's last entry is not ~all, return a fail.
      // tslint:disable-next-line:max-line-length
      const lastEntry: Mechanism = records[0].mechanisms[records[0].mechanisms.length - 1];
      // tslint:disable-next-line:max-line-length
      return this.fail("Domain %s SPF record's last entry is not ~all. It has %s", [domain, lastEntry.prefix + lastEntry.type]);
    } else {
      // If record passes all criteria, return a pass.
      return this.pass('%s is valid', [domain]);
    }
  }

}

export { ValidateSpfRecord as Step };
