const axios = require('axios').default;
const tor_axios = require('tor-axios');
const SocksProxyAgent = require('socks-proxy-agent');

const tor = tor_axios.torSetup({
  ip: 'localhost',
  port: 9050,
  controlPort: 9051,
  controlPassword: 'prfssdJB&JO2018',
});

export const GET_ROUTE = {
  PING: "ping",
  FEES: "info/fee",
  ROOT: "info/root",
  STATECHAIN: "info/statechain",
  COINS_INFO: "info/coins",
  TRANSFER_BATCH: "info/transfer-batch",
  SWAP_GROUPINFO: "swap/groupinfo"
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
  //tor: any
  //agent: any
  //httpAgent: any
  //httpsAgent: any

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    //this.agent = new SocksProxyAgent('socks5h://localhost:9050');
    
        //const {httpAgent, httpsAgent} = new SocksAgent({
      //host: 'localhost',
      //port: 9050,
      //controlPort: 9051,
      //controlPassword: 'prfssdJB&JO2018'
    //})
    //this.httpAgent = httpAgent;
    //this.httpsAgent = httpsAgent;
    
    //tor_axios.torSetup({
//      protocol: 'socks5',
      //ip: '127.0.0.1',
      //port: 9050,
      //controlPort: 9051,
   
    //});
  }

  get = async (path: string, params: any) => {
    try {
      const url = this.endpoint + "/" + path + "/" + (Object.entries(params).length === 0 ? "" : params);
      const config = {
          method: 'get',
          url: url,
          headers: { 'Accept': 'application/json' }
      };

      //const inst = axios.create({
      //  httpAgent: this.httpAgent,
      //  httpsagent: this.httpsAgent,
      //  headers: { 'Accept': 'application/json' }
      //});

      //let res = await tor.get(url);
      //let res = await axios(config)
      let res = await tor.get(url, { 'Accept': 'application/json' })
      let return_data = res.data
      checkForServerError(return_data)

      return return_data

    } catch (err) {
      throw err;
    }
  }

  post = async (path: string, body: any) => {
    try {
      let url = this.endpoint + "/" + path;
      const config = {
          method: 'post',
          url: url,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          data: body
      };

      //const inst = axios.create({
//        httpAgent: this.httpAgent,
  //      httpsagent: this.httpsAgent,
    //    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      //});

      //let res = await axios(config)
      let res = await tor.post(url, body, {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      });
      let return_data = res.data
      checkForServerError(return_data)

      return return_data

    } catch (err) {
      throw err;
    }
  };
}
