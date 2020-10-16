import { BaseStep, Field, StepInterface, ExpectedRecord } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, RecordDefinition } from '../proto/cog_pb';

export class CheckCNameRecord extends BaseStep implements StepInterface {

  protected stepName: string = 'Check the CName record of a domain';
  protected stepExpression: string = 'The cname record of (?<domain>.+) should be valid';
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

    try {
      const result = await this.client.getCNameStatus(domain);
      const record = this.createRecord(result);
      return this.pass('%s has a CName record with a canonical name %s', [], [record]);
    } catch (e) {
      return this.error("There was a roblem checking the domain's cname record: %s", [e.toString()]);
    }
  }

  createRecord(record: Record<string, any>) {
    return this.keyValue('cname', 'Check CName Record', record);
  }

}

export { CheckCNameRecord as Step };
