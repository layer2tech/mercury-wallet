import { AsyncSemaphore } from "@esfx/async-semaphore";
//const axios = require('axios').default;
import axios, { AxiosRequestConfig } from 'axios'

export const TIMEOUT = 6000
// Maximum number of concurrent API calls
export const MAX_SEMAPHORE_COUNT = 10;
export const semaphore = new AsyncSemaphore(MAX_SEMAPHORE_COUNT);

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
  NEW_TOR_ID: "newid"
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
  SWAP_REGISTER_UTXO: "swap/register-utxo",
  SWAP_DEREGISTER_UTXO: "swap/deregister-utxo",
  SWAP_POLL_UTXO: "swap/poll/utxo",
  SWAP_POLL_SWAP: "swap/poll/swap",
  SWAP_INFO: "swap/info",
  SWAP_FIRST: "swap/first",
  SWAP_BLINDED_SPEND_SIGNATURE: "swap/blinded-spend-signature",
  SWAP_SECOND: "swap/second",
};
Object.freeze(POST_ROUTE);

// Check if returned value from server is an error. Throw if so.
const checkForServerError = (response: any) => {
  if (!response) {
    return
  }
  let return_val = response?.data
  if( response.status >= 400) {
    throw Error(`http status: ${response.status}, data: ${return_val}`)
  }
  if (typeof(return_val)=="string" && return_val.includes("Error")) {
    if(return_val.includes("Not available until")){
      throw Error("The server is currently unavailable due to a high request rate. Please try again.")
    }
    throw Error(return_val)
  }  
}

const handlePromiseRejection = (err: any, config: any) => {
  let msg_str = err?.message
  if (msg_str && msg_str.search(`/timeout of .*ms exceeded/`)) {
    throw new Error(`Mercury API request timed out: ${msg_str}`)
  }
  throw err
}

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

    async get(path: string, params: any, timeout_ms: number = TIMEOUT) {
      const url = this.endpoint + "/" + (path + (Object.entries(params).length === 0 ? "" : "/" + params)).replace(/^\/+/, '');
      const config: AxiosRequestConfig = {
        method: 'get',
        url: url,
        headers: { 'Accept': 'application/json' },
        timeout: timeout_ms
      };
      await semaphore.wait()
      return axios(config).catch((err: any) => {
        handlePromiseRejection(err, config)
      }).finally( () => {
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
      await semaphore.wait();
      return axios(config).catch((err: any) => {
        handlePromiseRejection(err, config)
      }).finally(() => {
        semaphore.release()
      }).then (
      (res: any) => {
        checkForServerError(res)
        return res?.data
      })
    }
  }
