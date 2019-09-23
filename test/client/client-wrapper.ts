import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { ClientWrapper } from '../../src/client/client-wrapper';
import { expect } from 'chai';

chai.use(sinonChai);

describe('ClientWrapper', () => {
  const expect = chai.expect;
  let dnsStub: any;
  let spfParseStub: any;
  // const clientWrapperUnderTest: ClientWrapper;

  beforeEach(() => {
    dnsStub = sinon.stub();
    dnsStub.resolveTxt = sinon.stub();
    spfParseStub = sinon.stub();
  });
});
