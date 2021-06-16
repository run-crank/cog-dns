import { BaseStep, Field, StepInterface, ExpectedRecord } from '../core/base-step';
import { Step, RunStepResponse, FieldDefinition, StepDefinition, RecordDefinition } from '../proto/cog_pb';

export class CheckDomainBlacklistStatus extends BaseStep implements StepInterface {

  protected stepName: string = 'Check the blacklist status of a domain';
  protected stepExpression: string = '(?<domain>.+) should not be blacklisted';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected expectedFields: Field[] = [{
    field: 'domain',
    type: FieldDefinition.Type.STRING,
    description: 'Domain name',
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'blacklist',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'blacklist',
      type: FieldDefinition.Type.STRING,
      description: 'Blacklist Name',
    },
    {
      field: 'listed',
      type: FieldDefinition.Type.BOOLEAN,
      description: 'Is the domain listed in the blacklist',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    const stepData: any = step.getData().toJavaScript();
    const domain: string = stepData.domain;

    try {
      const result = await this.client.getDomainBlacklistStatus(domain);
      const isBlacklisted = Object.keys(result).some(zone => result[zone] === true);
      if (isBlacklisted) {
        //// Create a record of only where the domain is blacklisted
        const blKeys = Object.keys(result).filter(zone => result[zone] === true);
        const blZones = {};
        blKeys.forEach((key) => {
          blZones[key] = true;
        });
        const record = this.createRecord(blZones);
        return this.fail('The domain %s is blacklisted', [domain], [record]);
      } else {
        const record = this.createRecord(result);
        return this.pass('The domain %s is not blacklisted', [domain], [record]);
      }
    } catch (e) {
      if (e.code === 'ENOTFOUND') {
        return this.error("There the domain %s does not have a DNS record.", [domain]);
      } else {
        return this.error("There was a problem checking the domain's blacklist record: %s", [e.toString()]);
      }
    }
  }

  createRecord(record: Record<string, any>) {
    return this.keyValue('dkim', 'Check IP address', record);
  }

}

export { CheckDomainBlacklistStatus as Step };
