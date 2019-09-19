import { Mechanism } from '../models/Mechanism';
import { SpfRecord } from './../models/spf-record';
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
    const stepData: any = step.getData().toJavaScript();
    const domain: string = stepData.domain;
    const expectedHost: string = stepData.host;
    let records: SpfRecord[];

    try {
      records = await this.client.findSpfRecordByDomain(domain);
    } catch (e) {
      return this.error('There was a problem checking the domain: %s', [e.toString()]);
    }

    if (records.length !== 1) {
      // If record has more than 1 record, return a fail.
      // tslint:disable-next-line:max-line-length
      return this.error('Domain %s does not have exactly one SPF record, it has %s SPF records', [domain, records.length.toString()]);
    // tslint:disable-next-line:max-line-length
    } else if (records[0].mechanisms.find((lookUp: Mechanism) => lookUp.prefix === '+' && lookUp.type === 'include' && lookUp.value === expectedHost)) {
      // If record's last entry does not have expected host name, return a fail.
      return this.pass('Domain %s includes host %s, as expected', [domain, expectedHost]);
    } else {
      // tslint:disable-next-line:max-line-length
      return this.fail('%s is invalid, does not include host %s,\n %s', [domain, expectedHost, JSON.stringify(records[0])]);
    }
  }

}

export { ValidateSpfRecordHost as Step };
