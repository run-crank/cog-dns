import { Message } from './../models/message';
import { Mechanism } from '../models/mechanism';
import { SpfRecord } from './../models/spf-record';
import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

/*tslint:disable:no-else-after-return*/
/*tslint:disable:max-line-length*/

export class ValidateSpfRecord extends BaseStep implements StepInterface {

  protected stepName: string = "Check the validity of a domain's SPF record";
  protected stepExpression: string = 'the SPF record for (?<domain>.+) should be valid';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [{
    field: 'domain',
    type: FieldDefinition.Type.STRING,
    description: 'Domain name',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const spfParse = require('spf-parse');
    const stepData: any = step.getData().toJavaScript();
    const domain: string = stepData.domain;
    const prefixes: string[] = ['~all', '-all'];
    let records: any[];
    const parsedRecords: SpfRecord[] = [];
    let lastEntry: any;
    let actualText: string;

    try {
      records = await this.client.findSpfRecordByDomain(domain);
      records.forEach((spf: any) => {
        parsedRecords.push(spfParse(spf.join('')));
      });
    } catch (e) {
      return this.error('There was a problem checking the domain: %s', [e.toString()]);
    }

    // Wrap to prevent error outcomes with no response.
    if (parsedRecords[0]) {
      lastEntry = parsedRecords[0].mechanisms[parsedRecords[0].mechanisms.length - 1];
    }

    if (records.length !== 1) {
      // If record has more than 1 record, return a fail.
      actualText = records.length ? `${records.length}:\n\n${records.map(r => r.join('')).join('\n')}` : records.length.toString();
      return this.fail('There should only be 1 SPF record for %s, but there were actually %s', [domain, actualText]);
    } else if (parsedRecords[0].mechanisms.filter((mechanism: Mechanism) => mechanism.type === 'include' || mechanism.type === 'a' || mechanism.type === 'mx' || mechanism.type === 'ptr' || mechanism.type === 'exists').length > 10) {
      // If record has more than 10 lookups, return a fail.
      const applicableMechanisms = parsedRecords[0].mechanisms.filter((mechanism: Mechanism) => mechanism.type === 'include' || mechanism.type === 'a' || mechanism.type === 'mx' || mechanism.type === 'ptr' || mechanism.type === 'exists');
      const mechanismLength: string = applicableMechanisms.length.toString();
      actualText = `${mechanismLength}:\n\n${applicableMechanisms.map(m => `${m.type}:${m.value}`).join('\n')}`;
      return this.fail('There should be no more than 10 SPF lookups for %s, but there were actually %s', [domain, actualText]);
    } else if (records[0].find((record: any) => record.toString().length > 255)) {
      // If record has more than 255 characters, return a fail.
      const invalidStringTxt = records.find((record: any) => record.toString().length > 255);
      return this.fail('SPF record for %s includes a string over 255 characters. Consider breaking this up into multiple strings: %s', [domain, invalidStringTxt]);
    } else if (records[0].join('').length > 512) {
      // If record has more than 512 bytes, return a fail.
      return this.fail("SPF records shouldn't exceed 512 bytes, but %s's record was %s bytes: %s", [domain, records[0].join('').length, records[0].join('')]);
    } else if (parsedRecords[0].messages != null && parsedRecords[0].messages.filter((message: Message) => message.type === 'error').length > 0) {
      // If record has a syntax error, return a fail.
      const errors = parsedRecords[0].messages.filter((message: Message) => message.type === 'error');
      return this.fail("Found syntax error(s) in %s's SPF record: %s", [domain, errors.map(e => e.message).join('\n')]);
    } else if (!prefixes.includes(lastEntry.prefix + lastEntry.type)) {
      // If record's last entry is not ~all, return a fail.
      return this.fail('The last entry in an SPF record should be -all or ~all, but it was actually %s', [lastEntry.prefix + lastEntry.type]);
    } else {
      // If record passes all criteria, return a pass.
      return this.pass('SPF record for %s is valid: %s', [domain, records[0].join('')]);
    }
  }

}

export { ValidateSpfRecord as Step };
