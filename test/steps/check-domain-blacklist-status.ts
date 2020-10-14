import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/check-domain-blacklist-status';

chai.use(sinonChai);

describe('CheckDomainBlacklistStatus', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  const clientWrapperStub: any = {};

  beforeEach(() => {
    clientWrapperStub.getDomainBlacklistStatus = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('CheckDomainBlacklistStatus');
    expect(stepDef.getName()).to.equal('Check the blacklist status of a domain');
    expect(stepDef.getExpression()).to.equal('(?<domain>.+) should not be blacklisted');
    expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
  });

  it('should return expected step fields', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
      return field.toObject();
    });

    // Domain field
    const domain: any = fields.filter(f => f.key === 'domain')[0];
    expect(domain.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    expect(domain.type).to.equal(FieldDefinition.Type.STRING);
  });

  it('should respond with pass if API client resolves where the domain is not blacklisted', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = 'The domain %s is not blacklisted';
    const expectedBlacklistRecord: any = {
      anyblacklist1: false,
      anyblacklist2: false,
      anyblacklist3: false,
    };

    clientWrapperStub.getDomainBlacklistStatus.resolves(expectedBlacklistRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.getDomainBlacklistStatus).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should respond with pass if API client resolves where the domain is blacklisted', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = 'The domain %s is blacklisted';
    const expectedBlacklistRecord: any = {
      anyblacklist1: false,
      anyblacklist2: true,
      anyblacklist3: false,
    };

    clientWrapperStub.getDomainBlacklistStatus.resolves(expectedBlacklistRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.getDomainBlacklistStatus).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should respond with fail if API client throws an error', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = "There was a problem checking the domain's blacklist record: %s";
    const expectedError: Error = new Error('Any Error');

    clientWrapperStub.getDomainBlacklistStatus.rejects(expectedError);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.getDomainBlacklistStatus).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });
});
