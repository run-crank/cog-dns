import { SpfRecord } from './../models/spf-record';
import { Mechanism } from '../models/mechanism';
/*tslint:disable:no-else-after-return*/

import { BaseStep, Field, StepInterface } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition } from '../proto/cog_pb';

export class ValidateSpfRecordHost extends BaseStep implements StepInterface {

  protected stepName: string = "Check that a domain's SPF record includes a specific host";
  protected stepExpression: string = 'the spf record for (?<domain>.+) should include (?<host>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [{
    field: 'domain',
    type: FieldDefinition.Type.STRING,
    description: 'Domain name',
  }, {
    field: 'host',
    type: FieldDefinition.Type.STRING,
    description: 'Host name',
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const spfParse = require('spf-parse');
    const stepData: any = step.getData().toJavaScript();
    const domain: string = stepData.domain;
    const expectedHost: string = stepData.host;
    let records: any;
    const parsedRecords: SpfRecord[] = [];

    try {
      records = await this.client.findSpfRecordByDomain(domain);
      records.forEach((spf: any) => {
        parsedRecords.push(spfParse(spf.join('')));
      });
    } catch (e) {
      return this.error('There was a problem checking the domain: %s', [e.toString()]);
    }

    if (records.length !== 1) {
      // If record has more than 1 record, return a fail.
      // tslint:disable-next-line:max-line-length
      return this.error("Can't check that %s's SPF includes %s because it's invalid: there should only be 1 SPF record, but there were actually %s", [domain, expectedHost, parsedRecords.length.toString()]);
    // tslint:disable-next-line:max-line-length
    } else if (parsedRecords[0].mechanisms.find((mechanism: Mechanism) => mechanism.prefix === '+' && mechanism.type === 'include' && mechanism.value === expectedHost)) {
      // If record's last entry does not have expected host name, return a fail.
      return this.pass('SPF record for %s includes %s, as expected', [domain, expectedHost]);
    } else {
      // tslint:disable-next-line:max-line-length
      const actualHost = parsedRecords[0].mechanisms.find((mechanism: Mechanism) => mechanism.prefix === '+' && mechanism.type === 'include').value;
      // tslint:disable-next-line:max-line-length
      return this.fail("SPF record for %s should include %s, but it doesn't. It was actually: %s", [domain, expectedHost, actualHost]);
    }
  }

}

export { ValidateSpfRecordHost as Step };
