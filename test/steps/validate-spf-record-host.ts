import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/validate-spf-record-host';

chai.use(sinonChai);

describe('ValidateSpfRecordHostStep', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  const clientWrapperStub: any = {};

  beforeEach(() => {
    clientWrapperStub.findSpfRecordByDomain = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('ValidateSpfRecordHost');
    expect(stepDef.getName()).to.equal("Check that a domain's SPF record includes a specific host");
    expect(stepDef.getExpression()).to.equal('the spf record for (?<domain>.+) should include (?<host>.+)');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // Domain field
    const email: any = fields.filter(f => f.key === 'domain')[0];
    expect(email.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(email.type).to.equal(FieldDefinition.Type.STRING);

    // Host field
    const campaignId: any = fields.filter(f => f.key === 'host')[0];
    expect(campaignId.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(campaignId.type).to.equal(FieldDefinition.Type.STRING);
  });

  it('should respond with pass if API client resolves expected data', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedHost: string = 'sampleHost.com';
    const expectedResponseMessage: string = 'SPF record for %s includes %s, as expected';
    const spfRecord: any = [
      [
        `v=spf1 include:${expectedHost} ~all`,
      ],
    ];

    clientWrapperStub.findSpfRecordByDomain.resolves(spfRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
      host: expectedHost,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.findSpfRecordByDomain).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should respond with an error if API client responds with multiple Spf Records', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedHost: string = 'sampleHost.com';
    const spfRecord: any = [
      [
        `v=spf1 a mx include:${expectedHost} ~all`,
      ],
      [
        `v=spf1 a mx include:${expectedHost} ~all`,
      ],
      [
        `v=spf1 a mx include:${expectedHost} ~all`,
      ],
    ];

    const expectedResponseMessage: string = "Can't check that %s's SPF includes %s because it's invalid: there should only be 1 SPF record, but there were actually %s";
    clientWrapperStub.findSpfRecordByDomain.resolves(spfRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
      host: expectedHost,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.findSpfRecordByDomain).to.have.been.calledWith(domainInput);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
  });

  // tslint:disable-next-line:max-line-length
  it('should respond with an fail if API client responds with Spf record with unexpected host', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedHost: string = 'sampleHost.com';
    const spfRecord: any = [
      [
        'v=spf1 include:unexpectedHost.com ~all',
      ],
    ];

    const expectedResponseMessage: string = "SPF record for %s should include %s, but it doesn't. It was actually: %s";
    clientWrapperStub.findSpfRecordByDomain.resolves(spfRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
      host: expectedHost,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.findSpfRecordByDomain).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should respond with error if API client throws an exception', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const hostInput: string = 'sampleHost.com';

    const expectedResponseMessage: string = 'There was a problem checking the domain: %s';
    const expectedError: Error = new Error('Any Error');
    clientWrapperStub.findSpfRecordByDomain.rejects(expectedError);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
      host: hostInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.findSpfRecordByDomain).to.have.been.calledWith(domainInput);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
  });
});
