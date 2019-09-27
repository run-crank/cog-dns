import { SpfRecord } from './../models/spf-record';
import * as grpc from 'grpc';
import { Field } from '../core/base-step';
import { FieldDefinition } from '../proto/cog_pb';
import { resolve } from 'path';

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

  constructor (client = require('dns')) {
    this.client = client;
  }

  public async findSpfRecordByDomain(domain: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      try {
        this.client.resolveTxt(domain, (err, results) => {
          if (err) {
            reject(err);
            return;
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
