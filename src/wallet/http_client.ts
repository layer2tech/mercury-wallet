import {Mutex} from 'async-mutex';
const axios = require('axios').default;
export const mutex = new Mutex();

export const GET_ROUTE = {
  PING: "ping",
  FEES: "info/fee",
  ROOT: "info/root",
  STATECHAIN: "info/statechain",
  COINS_INFO: "info/coins",
  TRANSFER_BATCH: "info/transfer-batch",
  SWAP_GROUPINFO: "swap/groupinfo",
  TRANSFER_GET_MSG_ADDR: "transfer/get_msg_addr",
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
const checkForServerError = (return_val: any) => {
  if (typeof(return_val)=="string" && return_val.includes("Error")) {
    throw Error(return_val)
  }
}

export class HttpClient {
  endpoint: string
  is_tor: boolean

  constructor(endpoint: string, is_tor = false) {
    this.endpoint = endpoint;
    this.is_tor = is_tor;
  }

  async new_tor_id() {
    console.log('new_tor_id');
    if (this.is_tor) {
      console.log('is tor, getting new id');
      await this.get('newid', {});
    }
  };

  async get (path: string, params: any){
    //const release = await mutex.acquire();
    try {
      const url = this.endpoint + "/" + (path + (Object.entries(params).length === 0 ? "" : "/" + params)).replace(/^\/+/, '');
      const config = {
          method: 'get',
          url: url,
          headers: { 'Accept': 'application/json' }
      };
      let res = await axios(config)
      let return_data = res.data
      checkForServerError(return_data)

      //release();
      return return_data

    } catch (err : any) {
      //release();
      throw err;
    }
  }

  async post (path: string, body: any) {
    //const release = await mutex.acquire();
    try {
      let url = this.endpoint + "/" + path.replace(/^\/+/, '');
      const config = {
          method: 'post',
          url: url,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          data: body,
      };
      let res = await axios(config)
      let return_data = res.data
      checkForServerError(return_data)
      //release();
      return return_data

    } catch (err : any) {
      //release();
      throw err;
    }
  };
}
