import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import * as justForIdeTypeHinting from 'chai-as-promised';
import 'mocha';

import { ClientWrapper } from '../../src/client/client-wrapper';

chai.use(sinonChai);
chai.use(require('chai-as-promised'));

describe('ClientWrapper', () => {
  const expect = chai.expect;
  let dnsStub: any;
  let clientWrapperUnderTest: ClientWrapper;

  beforeEach(() => {
    dnsStub = sinon.stub();
    dnsStub.resolveTxt = sinon.stub();
  });

  it('findSpfRecordByDomain', async () => {
    const sampleDomain = 'anyDomain';
    const expectedSpfRecord: any = [
      [
        'v=spf1 include:_spf.google.com ~all',
      ],
    ];
    let actualResult;

    // Set up test instance.
    dnsStub.resolveTxt.callsArgWith(1, null, expectedSpfRecord);
    clientWrapperUnderTest = new ClientWrapper(dnsStub);

    // Call the method and make assertions.
    actualResult = await clientWrapperUnderTest.findSpfRecordByDomain(sampleDomain);
    expect(dnsStub.resolveTxt).to.have.been.calledWith(sampleDomain);
    expect(actualResult[0]).to.equal(expectedSpfRecord[0]);
  });

  it('findSpfRecordByDomain:apiError', async () => {
    const sampleDomain = 'anyDomain';
    const anError = new Error('An API Error');

    // Set up test instance.
    dnsStub.resolveTxt.callsArgWith(1, anError);
    clientWrapperUnderTest = new ClientWrapper(dnsStub);

    // Call the method and make assertions.
    expect(clientWrapperUnderTest.findSpfRecordByDomain(sampleDomain))
    .to.be.rejectedWith(anError);
  });

  it('findSpfRecordByDomain:apiError:enodata', async () => {
    const sampleDomain = 'anyDomain';
    const anError = new Error('An API Error');

    // Set up test instance.
    anError['code'] = 'ENODATA';
    dnsStub.resolveTxt.callsArgWith(1, anError);
    clientWrapperUnderTest = new ClientWrapper(dnsStub);

    // Call the method and make assertions.
    const actualResult = await clientWrapperUnderTest.findSpfRecordByDomain(sampleDomain);
    expect(actualResult).to.deep.equal([]);
  });

  it('findSpfRecordByDomain:apiError:enotfound', async () => {
    const sampleDomain = 'anyDomain';
    const anError = new Error('An API Error');

    // Set up test instance.
    anError['code'] = 'ENOTFOUND';
    dnsStub.resolveTxt.callsArgWith(1, anError);
    clientWrapperUnderTest = new ClientWrapper(dnsStub);

    // Call the method and make assertions.
    return expect(clientWrapperUnderTest.findSpfRecordByDomain(sampleDomain))
      .to.be.rejected;
  });

  it('findSpfRecordByDomain:apiThrows', async () => {
    const sampleDomain = 'anyDomain';
    const anError = new Error('An API Error');

    // Set up test instance.
    dnsStub.resolveTxt.throws(anError);
    clientWrapperUnderTest = new ClientWrapper(dnsStub);

    // Call the method and make assertions.
    expect(clientWrapperUnderTest.findSpfRecordByDomain(sampleDomain))
    .to.be.rejectedWith(anError);
  });
});
