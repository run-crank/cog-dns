import { blacklists } from './../../src/models/constants/blacklists.contant';
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
  let dkimStub: any;
  let dnsblStub: any;
  let clientWrapperUnderTest: ClientWrapper;

  beforeEach(() => {
    dnsStub = sinon.stub();
    dnsStub.resolveTxt = sinon.stub();
    dnsStub.lookup = sinon.stub();
    dnsStub.resolveCname = sinon.stub();
    dkimStub = sinon.stub();
    dkimStub.getKey = sinon.stub();
    dnsblStub = sinon.stub();
    dnsblStub.batch = sinon.stub();

  });

  it('getCNameStatus', async () => {
    const sampleDomain = 'anyDomain';
    const sampleCName = 'anyCName';
    const expectedCNameRecord: any = {
      [sampleDomain]: sampleCName,
    };
    let actualResult;

    // Set up test instance.
    dnsStub.resolveCname.callsArgWith(1, null, [sampleCName]);
    clientWrapperUnderTest = new ClientWrapper(dnsStub, dkimStub);

    // Call the method and make assertions.
    actualResult = await clientWrapperUnderTest.getCNameStatus(sampleDomain);
    expect(dnsStub.resolveCname).to.have.been.calledWith(sampleDomain);
    expect(actualResult).to.eql(expectedCNameRecord);
  });

  it('getCNameStatus:apiError', async () => {
    const sampleDomain = 'anyDomain';
    const anError = new Error('An API Error');

    // Set up test instance.
    dnsStub.resolveCname.callsArgWith(1, anError, null);
    clientWrapperUnderTest = new ClientWrapper(dnsStub);

    // Call the method and make assertions.
    expect(clientWrapperUnderTest.getCNameStatus(sampleDomain))
    .to.be.rejectedWith(anError);
  });

  it('getCNameStatus:apiError:enodata', async () => {
    const sampleDomain = 'anyDomain';
    const anError = new Error('An API Error');

    // Set up test instance.
    anError['code'] = 'ENODATA';
    dnsStub.resolveCname.callsArgWith(1, anError, null);
    clientWrapperUnderTest = new ClientWrapper(dnsStub);

    // Call the method and make assertions.
    expect(clientWrapperUnderTest.getCNameStatus(sampleDomain))
    .to.be.rejectedWith(anError);
  });

  it('getDomainBlacklistStatus', async () => {
    const sampleDomain = 'anyDomain';
    const sampleFamily = 'anyFamily';
    const expectedBlacklistRecord: any = {
      bl1: false,
      bl2: false,
      bl3: false,
    };
    let actualResult;

    // Set up test instance.
    dnsStub.lookup.callsArgWith(1, null, 'anyAddress', sampleFamily);
    dnsblStub.batch.returns([
      { blacklist: 'bl1', listed: false },
      { blacklist: 'bl2', listed: false },
      { blacklist: 'bl3', listed: false },
    ]);
    clientWrapperUnderTest = new ClientWrapper(dnsStub, dkimStub, dnsblStub);

    // Call the method and make assertions.
    actualResult = await clientWrapperUnderTest.getDomainBlacklistStatus(sampleDomain);
    expect(dnsStub.lookup).to.have.been.calledWith(sampleDomain);
    expect(dnsblStub.batch).to.have.been.calledWith(['anyAddress'], blacklists);
    expect(actualResult).to.eql(expectedBlacklistRecord);
  });

  it('getDomainBlacklistStatus:apiError', async () => {
    const sampleDomain = 'anyDomain';
    const sampleFamily = 'anyFamily';
    const anError = new Error('An API Error');

    // Set up test instance.
    dnsStub.lookup.callsArgWith(1, null, 'anyAddress', sampleFamily);
    dnsblStub.batch.rejects(new Error('Error'));
    clientWrapperUnderTest = new ClientWrapper(dnsStub, dkimStub, dnsblStub);

    // Call the method and make assertions.
    expect(clientWrapperUnderTest.getDomainBlacklistStatus(sampleDomain))
    .to.be.rejectedWith(anError);
  });

  it('getIpAddressByDomain', async () => {
    const sampleDomain = 'anyDomain';
    const sampleFamily = 'anyFamily';
    const expectedIpAddressRecord: any = {
      address: 'anyAddress',
      family: `IPv${sampleFamily}`,
    };
    let actualResult;

    // Set up test instance.
    dnsStub.lookup.callsArgWith(1, null, expectedIpAddressRecord['address'], sampleFamily);
    clientWrapperUnderTest = new ClientWrapper(dnsStub, dkimStub);

    // Call the method and make assertions.
    actualResult = await clientWrapperUnderTest.getIpAddressByDomain(sampleDomain);
    expect(dnsStub.lookup).to.have.been.calledWith(sampleDomain);
    expect(actualResult).to.eql(expectedIpAddressRecord);
  });

  it('findDkimRecord', async () => {
    const sampleDomain = 'anyDomain';
    const sampleSelector = 'anySelector';
    const expectedDkimRecord: any = {
      version: 'sampleVersion',
      type: 'sampleType',
      flags: null,
      granularity: null,
      hash: null,
      notes: null,
      service: null,
      key: 'sampleKey',
    };
    let actualResult;

    // Set up test instance.
    dkimStub.getKey.callsArgWith(2, null, expectedDkimRecord);
    clientWrapperUnderTest = new ClientWrapper(dnsStub, dkimStub);

    // Call the method and make assertions.
    actualResult = await clientWrapperUnderTest.findDkimRecord(sampleDomain, sampleSelector);
    expect(dkimStub.getKey).to.have.been.calledWith(sampleDomain, sampleSelector);
    expect(actualResult).to.equal(expectedDkimRecord);
  });

  it('findDkimRecord:apiError:enodata', async () => {
    const sampleDomain = 'anyDomain';
    const sampleSelector = 'anySelector';
    const anError = new Error('An API Error');

    // Set up test instance.
    anError['code'] = 'ENODATA';
    dkimStub.getKey.callsArgWith(1, anError);
    clientWrapperUnderTest = new ClientWrapper(dnsStub);

    // Call the method and make assertions.
    expect(clientWrapperUnderTest.findDkimRecord(sampleDomain, sampleSelector))
    .to.be.rejectedWith(anError);
  });

  it('findDkimRecord:apiError', async () => {
    const sampleDomain = 'anyDomain';
    const sampleSelector = 'anySelector';
    const anError = new Error('An API Error');

    // Set up test instance.
    dkimStub.getKey.callsArgWith(1, anError);
    clientWrapperUnderTest = new ClientWrapper(dnsStub);

    // Call the method and make assertions.
    expect(clientWrapperUnderTest.findDkimRecord(sampleDomain, sampleSelector))
    .to.be.rejectedWith(anError);
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
