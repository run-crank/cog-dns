import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/check-cname-record';

chai.use(sinonChai);

describe('CheckCNameRecord', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  const clientWrapperStub: any = {};

  beforeEach(() => {
    clientWrapperStub.getCNameStatus = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
    protoStep = new ProtoStep();
  });

  it('should return expected step metadata', () => {
    const stepDef: StepDefinition = stepUnderTest.getDefinition();
    expect(stepDef.getStepId()).to.equal('CheckCNameRecord');
    expect(stepDef.getName()).to.equal('Check the CNAME record of a domain');
    expect(stepDef.getExpression()).to.equal('The CNAME record of (?<domain>.+) should exist');
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

    // // Canonical Name field
    // const canonicalName: any = fields.filter(f => f.key === 'canonicalName')[0];
    // expect(canonicalName.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
    // expect(canonicalName.type).to.equal(FieldDefinition.Type.STRING);
  });

  it('should respond with pass if API client resolves expected data', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = '%s has a CNAME record with a canonical name %s';
    const expectedCNameRecord: any = {
      'sampleDomain.com': 'cname1',
      domain2: 'cname2',
    };

    clientWrapperStub.getCNameStatus.resolves(expectedCNameRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
      // canonicalName: 'cname1',
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.getCNameStatus).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  // it('should respond with fail if API client resolves with unexpected canonicalName', async () => {
  //   // Stub a response that matches expectations.
  //   const domainInput: string = 'sampleDomain.com';
  //   const expectedResponseMessage: string = "CName record for %s should have canonical name %s, but it doesn't. It was actually: %s";
  //   const expectedCNameRecord: any = {
  //     [domainInput]: 'cname1',
  //     domain2: 'cname2',
  //   };

  //   clientWrapperStub.getCNameStatus.resolves(expectedCNameRecord);

  //   // Set step data corresponding to expectations
  //   const expectations: any = {
  //     domain: domainInput,
  //     canonicalName: 'notcname1',
  //   };
  //   protoStep.setData(Struct.fromJavaScript(expectations));

  //   const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
  //   expect(clientWrapperStub.getCNameStatus).to.have.been.calledWith(domainInput);
  //   expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
  //   expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  // });

  it('should respond with fail if API client throws an error', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = "There was a problem checking the domain's CNAME record: %s";
    const expectedError: Error = new Error('Any Error');

    clientWrapperStub.getCNameStatus.rejects(expectedError);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
      // canonicalName: 'cname1',
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.getCNameStatus).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
  });
});
