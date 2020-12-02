import { BaseStep, Field, StepInterface, ExpectedRecord } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, RecordDefinition } from '../proto/cog_pb';

export class CheckCNameRecord extends BaseStep implements StepInterface {

  protected stepName: string = 'Check the CNAME record of a domain';
  protected stepExpression: string = 'The CNAME record of (?<domain>.+) should exist';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [{
    field: 'domain',
    type: FieldDefinition.Type.STRING,
    description: 'Domain name',
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'cname',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'domain',
      type: FieldDefinition.Type.STRING,
      description: 'Domain Name',
    },
    {
      field: 'canonicalName',
      type: FieldDefinition.Type.STRING,
      description: 'Canonical Name',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const domain: string = stepData.domain;
    const canonicalName: string = stepData.canonicalName;

    try {
      const result = await this.client.getCNameStatus(domain);
      const record = this.createRecord(result);
      // if (result[domain] !== canonicalName) {
      //   return this.fail("CName record for %s should have canonical name %s, but it doesn't. It was actually: %s", [domain, canonicalName, result[domain]], [record]);
      // }
      return this.pass('%s has a CName record with a canonical name %s', [domain, result[domain]], [record]);
    } catch (e) {
      return this.error("There was a problem checking the domain's cname record: %s", [e.toString()]);
    }
  }

  createRecord(record: Record<string, any>) {
    return this.keyValue('cname', 'Check CName Record', record);
  }

}

export { CheckCNameRecord as Step };
