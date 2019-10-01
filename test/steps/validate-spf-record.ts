import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse } from '../../src/proto/cog_pb';
import { Step } from '../../src/steps/validate-spf-record';

chai.use(sinonChai);

describe('ValidateSpfRecordStep', () => {
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
    expect(stepDef.getStepId()).to.equal('ValidateSpfRecord');
    expect(stepDef.getName()).to.equal("Check the validity of a domain's SPF record");
    expect(stepDef.getExpression()).to.equal('the spf record for (?<domain>.+) should be valid');
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
  });

  it('should respond with pass if API client resolves expected data', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = 'SPF record for %s is valid: %s';
    const expectedSpfRecord: any = [
      [
        'v=spf1 include:_spf.google.com ~all',
      ],
    ];

    clientWrapperStub.findSpfRecordByDomain.resolves(expectedSpfRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.findSpfRecordByDomain).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should respond with fail if API client returns with multiple Spf records', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedSpfRecord: any =  [
      [
        'v=spf1 include:_spf.google.com ~all',
      ],
      [
        'v=spf1 include:_spf.google.com ~all',
      ],
    ];

    clientWrapperStub.findSpfRecordByDomain.resolves(expectedSpfRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.findSpfRecordByDomain).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal('There should only be 1 SPF record for %s, but there were actually %s');
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should respond with fail if API client returns with a single Spf record has more than 10 mechanisms of specific types', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = 'There should be no more than 10 SPF lookups for %s, but there were actually %s';
    const expectedSpfRecord: any = [
      [
        'v=spf1 include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
      ],
    ];

    clientWrapperStub.findSpfRecordByDomain.resolves(expectedSpfRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.findSpfRecordByDomain).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should respond with fail if API client returns with a single Spf record has more than 255 characters', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = 'SPF record for %s includes a string over 255 characters. Consider breaking this up into multiple strings: %s';
    const expectedSpfRecord: any = [
      [
        'v=spf1 ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
        'v=spf1  ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
        'v=spf1  ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
        'v=spf1  ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
        'v=spf1  ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
        'v=spf1  ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
        'v=spf1  ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
        'v=spf1  ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
        'v=spf1  ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
      ],
    ];

    clientWrapperStub.findSpfRecordByDomain.resolves(expectedSpfRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.findSpfRecordByDomain).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should respond with fail if API client returns with a single Spf record has more than 512 bytes', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = "SPF records shouldn't exceed 512 bytes, but %s's record was %s bytes: %s";
    const expectedSpfRecord: any = [
      [
        'v=spf1 include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
        'v=spf1 include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
        'v=spf1 include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
        'v=spf1 include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
        'v=spf1 include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
        'v=spf1 include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
        'v=spf1 include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all include:_spf.google.com ~all',
      ],
    ];

    clientWrapperStub.findSpfRecordByDomain.resolves(expectedSpfRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.findSpfRecordByDomain).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  // tslint:disable-next-line:max-line-length
  it('should respond with fail if API client returns with a single Spf record has syntax error', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = "Found syntax error(s) in %s's SPF record: %s";
    // record with typo (include => iclude)
    const expectedSpfRecord: any = [
      [
        'v=spf1 a mx iclude:_spf.elasticemail.com ~all',
      ],
    ];
    clientWrapperStub.findSpfRecordByDomain.resolves(expectedSpfRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.findSpfRecordByDomain).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  it('should respond with fail if API client returns with a single Spf record last record not being ~all or -all', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = 'The last entry in an SPF record should be -all or ~all, but it was actually %s';
    const expectedSpfRecord: any = [
      [
        'v=spf1 a mx include:_spf.elasticemail.com +all',
      ],
    ];

    clientWrapperStub.findSpfRecordByDomain.resolves(expectedSpfRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.findSpfRecordByDomain).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    // expect(response.getMessageArgsList()).to.equal([]);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
  });

  // tslint:disable-next-line:max-line-length
  it('should respond with pass if API client returns with a single Spf record last record is -all', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = 'SPF record for %s is valid: %s';
    const expectedSpfRecord: any = [
      [
        'v=spf1 a mx include:_spf.elasticemail.com -all',
      ],
    ];

    clientWrapperStub.findSpfRecordByDomain.resolves(expectedSpfRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.findSpfRecordByDomain).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    // expect(response.getMessageArgsList()).to.equal([]);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  // tslint:disable-next-line:max-line-length
  it('should respond with pass if API client returns with a single Spf record last record is ~all', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';
    const expectedResponseMessage: string = 'SPF record for %s is valid: %s';
    const expectedSpfRecord: any = [
      [
        'v=spf1 a mx include:_spf.elasticemail.com -all',
      ],
    ];

    clientWrapperStub.findSpfRecordByDomain.resolves(expectedSpfRecord);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.findSpfRecordByDomain).to.have.been.calledWith(domainInput);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
    // expect(response.getMessageArgsList()).to.equal([]);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
  });

  it('should respond with error if API client throws an exception', async () => {
    // Stub a response that matches expectations.
    const domainInput: string = 'sampleDomain.com';

    const expectedResponseMessage: string = 'There was a problem checking the domain: %s';
    const expectedError: Error = new Error('Any Error');
    clientWrapperStub.findSpfRecordByDomain.rejects(expectedError);

    // Set step data corresponding to expectations
    const expectations: any = {
      domain: domainInput,
    };
    protoStep.setData(Struct.fromJavaScript(expectations));

    const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
    expect(clientWrapperStub.findSpfRecordByDomain).to.have.been.calledWith(domainInput);
    expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
    expect(response.getMessageFormat()).to.equal(expectedResponseMessage);
  });
});
