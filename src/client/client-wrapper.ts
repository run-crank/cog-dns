import { SpfRecord } from './../models/spf-record';
import * as grpc from 'grpc';
import { Field } from '../core/base-step';
import { FieldDefinition } from '../proto/cog_pb';
import { resolve } from 'path';
import * as dkim from 'dkim';
import * as dnsbl from 'dnsbl';
import { blacklists } from '../models/constants/blacklists.contant';

/**
 * This is a wrapper class around the API client for your Cog. An instance of
 * this class is passed to the constructor of each of your steps, and can be
 * accessed on each step as this.client.
 */
export class ClientWrapper {

  /**
   * This is an array of field definitions, each corresponding to a field that
   * your API client requires for authentication. Depending on the underlying
   * system, this could include bearer tokens, basic auth details, endpoints,
   * etc.
   *
   * If your Cog does not require authentication, set this to an empty array.
   */
  public static expectedAuthFields: Field[] = [];

  /**
   * Private instance of the wrapped API client. You will almost certainly want
   * to swap this out for an API client specific to your Cog's needs.
   */
  private client: any;
  private dkimClient: any;
  private dnsblClient: any;

  // /**
  //  * Constructs an instance of the ClientWwrapper, authenticating the wrapped
  //  * client in the process.
  //  *
  //  * @param auth - An instance of GRPC Metadata for a given RunStep or RunSteps
  //  *   call. Will be populated with authentication metadata according to the
  //  *   expectedAuthFields array defined above.
  //  *
  //  * @param clientConstructor - An optional parameter Used only as a means to
  //  *   simplify automated testing. Should default to the class/constructor of
  //  *   the underlying/wrapped API client.
  //  */

  constructor (client = null, dkimClient = null, dnsblClient = null) {
    this.client = client || require('dns');
    this.dkimClient = dkimClient || dkim;
    this.dnsblClient = dnsblClient || dnsbl;
  }

  public async getDomainBlacklistStatus(domain: string): Promise<any> {
    return new Promise((resolve, reject) => {
      //// Get the Ip address of the domain
      this.client.lookup(domain, async (err, address, family) => {
        if (err) {
          return reject(err);
        }
        const result = {};
        try {
          //// Use the Ip address to check if its blacklisted
          const blresult = await this.dnsblClient.batch([address], blacklists);
          blresult.forEach((bl) => {
            result[bl.blacklist] = bl.listed;
          });
          return resolve(result);
        } catch (e) {
          return reject(e);
        }
      });
    });
  }

  public async getIpAddressByDomain(domain: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.client.lookup(domain, (err, address, family) => {
        if (err) {
          return reject(err);
        }
        return resolve({
          'address': address,
          'family': `IPv${family}`,
        });
      });
    });
  }

  public async findDkimRecord(domain: string, selector: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.dkimClient.getKey(domain, selector, (err, key) => {
        if (err) {
          if (err['errno'] === 'ENOTFOUND') {
            return reject(new Error(`Dkim record for domain ${domain} with selector ${selector} does not exist.`));
          }
          return reject(err);
        }
        key.key = Buffer.from(key.key).toString('base64');
        return resolve(key);
      });
    });
  }

  public async findSpfRecordByDomain(domain: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      try {
        this.client.resolveTxt(domain, (err, results) => {
          if (err) {
            // Friendlier errors for known situations.
            if (err['code'] === 'ENOTFOUND') {
              return reject(new Error(`Domain ${domain} does not exist.`));
            }
            if (err['code'] === 'ENODATA') {
              return resolve([]);
            }

            return reject(err);
          }

          const result: any = [];

          results.forEach((record) => {
            if (record.find((data: any) => data.includes('spf'))) {
              result.push(record);
            }
          });

          resolve(result);
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}
