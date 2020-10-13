import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/check-ip-address';

chai.use(sinonChai);

describe('CheckIpAddress', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  const clientWrapperStub: any = {};

  beforeEach(() => {
    clientWrapperStub.getIpAddressByDomain = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('CheckIpAddress');
    expect(stepDef.getName()).to.equal('Check the IP address of a domain');
    expect(stepDef.getExpression()).to.equal('An IP address should exist for (?<domain>.+)');
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

  it('should respond with pass if API client resolves expected data', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = 'The IP address %s for %s exists, as expected';
    const expectedDkimRecord: any = {
      address: 'sampleAddress',
      family: 'sampleFamily',
    };

    clientWrapperStub.getIpAddressByDomain.resolves(expectedDkimRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.getIpAddressByDomain).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should respond with fail if API client throws an error', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = 'There was a problem checking the domain: %s';
    const expectedError: Error = new Error('Any Error');

    clientWrapperStub.getIpAddressByDomain.rejects(expectedError);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.getIpAddressByDomain).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });
});
