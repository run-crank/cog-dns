import { BaseStep, Field, StepInterface, ExpectedRecord } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, RecordDefinition } from '../proto/cog_pb';

export class CheckIpAddress extends BaseStep implements StepInterface {

  protected stepName: string = 'Check the IP address of a domain';
  protected stepExpression: string = 'An IP address should exist for (?<domain>.+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [{
    field: 'domain',
    type: FieldDefinition.Type.STRING,
    description: 'Domain name',
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'ip',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'address',
      type: FieldDefinition.Type.STRING,
      description: 'Domain IP address',
    },
    {
      field: 'family',
      type: FieldDefinition.Type.STRING,
      description: 'Domain IP family',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const domain: string = stepData.domain;

    try {
      const ip = await this.client.getIpAddressByDomain(domain);
      console.log(ip);
      const record = this.createRecord(ip);
      return this.pass('The IP address %s for %s exists, as expected', [ip.address, domain], [record]);
    } catch (e) {
      return this.error('There was a problem checking the domain: %s', [e.toString()]);
    }
  }

  createRecord(record: Record<string, any>) {
    return this.keyValue('dkim', 'Check IP address', record);
  }

}

export { CheckIpAddress as Step };
