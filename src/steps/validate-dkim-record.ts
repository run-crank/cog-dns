import { BaseStep, Field, StepInterface, ExpectedRecord } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, RecordDefinition } from '../proto/cog_pb';

export class ValidateDkimRecord extends BaseStep implements StepInterface {

  protected stepName: string = "Check the validity of a domain's and selector's DKIM";
  protected stepExpression: string = 'the dkim record for (?<domain>.+) with (?<selector>.+) as selector should be valid';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [{
    field: 'domain',
    type: FieldDefinition.Type.STRING,
    description: 'Domain name',
  },
  {
    field: 'selector',
    type: FieldDefinition.Type.STRING,
    description: 'Selector',
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'dkim',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'version',
      type: FieldDefinition.Type.STRING,
      description: 'DKIM record version',
    },
    {
      field: 'type',
      type: FieldDefinition.Type.STRING,
      description: 'DKIM record key type',
    },
    {
      field: 'key',
      type: FieldDefinition.Type.STRING,
      description: 'DKIM record public key',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const domain: string = stepData.domain;
    const selector: string = stepData.selector;

    try {
      const dkim = await this.client.findDkimRecord(domain, selector);
      const record = this.createRecord(Object.assign({}, dkim));
      return this.pass('DKIM record for %s with selector %s is valid, as expected', [domain, selector], [record]);
    } catch (e) {
      return this.error('There was a problem checking the domain: %s', [e.toString()]);
    }
  }

  createRecord(record: Record<string, any>) {
    return this.keyValue('dkim', 'Check DKIM Record', record);
  }

}

export { ValidateDkimRecord as Step };
