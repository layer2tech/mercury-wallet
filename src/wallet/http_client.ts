'use strict';
import { checkForServerError, handlePromiseRejection } from "./error";
//const axios = require('axios').default;
import axios, { AxiosRequestConfig } from 'axios'
import Semaphore from 'semaphore-async-await';

export const TIMEOUT = 10000
// Maximum number of concurrent API calls
export const MAX_SEMAPHORE_COUNT = 5;
export const semaphore = new Semaphore(MAX_SEMAPHORE_COUNT);

export const GET_ROUTE = {
  PING: "ping",
  SWAP_PING: "swap/ping",
  FEES: "info/fee",
  ROOT: "info/root",
  STATECHAIN: "info/statechain",
  STATECOIN: "info/statecoin",
  STATECHAIN_OWNER: "info/owner",
  COINS_INFO: "info/coins",
  TRANSFER_BATCH: "info/transfer-batch",
  SC_TRANSFER_FINALIZE_DATA: "info/sc-transfer-finalize-data",
  SWAP_GROUPINFO: "swap/groupinfo",
  TRANSFER_GET_MSG_ADDR: "transfer/get_msg_addr",
  TOR_CIRCUITS: "tor_circuit",
  NEW_TOR_ID: "newid",
  NEW_TOR_CIRCUIT: "newid"
};
Object.freeze(GET_ROUTE);

export const POST_ROUTE = {
  RECOVER: "info/recover",
  KEYGEN_FIRST: "ecdsa/keygen/first",
  KEYGEN_SECOND: "ecdsa/keygen/second",
  PREPARE_SIGN: "prepare-sign",
  SIGN_FIRST: "ecdsa/sign/first",
  SIGN_SECOND: "ecdsa/sign/second",
  SMT_PROOF: "info/proof",
  DEPOSIT_INIT: "deposit/init",
  DEPOSIT_CONFIRM: "deposit/confirm",
  WITHDRAW_INIT: "withdraw/init",
  WITHDRAW_CONFIRM: "withdraw/confirm",
  TRANSFER_SENDER: "transfer/sender",
  TRANSFER_PUBKEY: "transfer/pubkey",
  TRANSFER_RECEIVER: "transfer/receiver",
  TRANSFER_UPDATE_MSG: "transfer/update_msg",
  TRANSFER_GET_MSG: "transfer/get_msg",
  TRANSFER_COMPLETE_KU: "transfer/keyupdate_complete",
  SWAP_REGISTER_UTXO: "swap/register-utxo",
  SWAP_DEREGISTER_UTXO: "swap/deregister-utxo",
  SWAP_POLL_UTXO: "swap/poll/utxo",
  SWAP_POLL_SWAP: "swap/poll/swap",
  SWAP_INFO: "swap/info",
  SWAP_FIRST: "swap/first",
  SWAP_BLINDED_SPEND_SIGNATURE: "swap/blinded-spend-signature",
  SWAP_SECOND: "swap/second",
  TOR_ENDPOINTS: "tor_endpoints"
};
Object.freeze(POST_ROUTE);

export const TOR_URL = "http://localhost:3001";

export const I2P_URL = "http://localhost:3002";

export class HttpClient {
  endpoint: string
  is_tor: boolean

  constructor(endpoint: string, is_tor = false) {
    this.endpoint = endpoint;
    this.is_tor = is_tor;
  }

  async new_tor_id() {
    if (this.is_tor) {
      const timeout_ms = 20000
      await this.get('newid', {}, timeout_ms);
    }
  };

  async new_tor_circuit() {
    if (this.is_tor) {
      const timeout_ms = 20000
      await this.get('newcircuit', {}, timeout_ms);
    }
  };

  async get(path: string, params: any, timeout_ms: number = TIMEOUT) {
    const url = this.endpoint + "/" + (path + (Object.entries(params).length === 0 ? "" : "/" + params)).replace(/^\/+/, '');
    const config: AxiosRequestConfig = {
      method: 'get',
      url: url,
      headers: {
        'Accept': 'application/json'
      },
      timeout: timeout_ms
    };
    
    await semaphore.acquire()
    return axios(config).catch((err: any) => {
      handlePromiseRejection(err, "Mercury API request timed out")
    }).finally(() => {
      semaphore.release()
    }).then(
      (res: any) => {
        checkForServerError(res)
        return res?.data
      })


  }

  async post(path: string, body: any, timeout_ms: number = TIMEOUT) {
    let url = this.endpoint + "/" + path.replace(/^\/+/, '');
    const config: AxiosRequestConfig = {
      method: 'post',
      url: url,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: timeout_ms,
      data: body,
    };
    await semaphore.acquire();
    return axios(config).catch((err: any) => {
      handlePromiseRejection(err, "Mercury API request timed out")
    }).finally(() => {
      semaphore.release()
    }).then(
      (res: any) => {
        checkForServerError(res)
        return res?.data
      })
  }
}
