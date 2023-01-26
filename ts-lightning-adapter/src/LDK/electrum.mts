// const {Buffer} = require('buffer');
const axios = import("axios");

const TIMEOUT = 20000;

class ElectrumClient {
  endpoint;
  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async getBlockHeight() {
    console.log("Get Block Height...");
    let res;
    try {
      res = (
        await ElectrumClient.get("http://127.0.0.1:18443/rest/chaininfo.json")
      ).data;
    } catch(e){
      console.log('Error Getting Block Height')
    }
    if (res) {
      return res.blocks;
    }
  }

  async getLatestBlockHeader(height: number) {
    let currentBlockHash;
    try {
      console.log("HEIGHT: ", height);
      currentBlockHash = (
        await ElectrumClient.get(
          `http://127.0.0.1:18443/rest/blockhashbyheight/${height}.json`
        )
      ).data.blockhash;
    } catch (e) {
      console.log("Error Getting Current Block Hash");
    }

    // return currentBlockHash
    console.log("Get Latest Block Header...");
    let res;
    try {
      res = (
        await ElectrumClient.get(
          `http://127.0.0.1:18443/rest/headers/1/${currentBlockHash}.hex`
        )
      ).data;
    } catch (e) {
      console.log("Error in getting header: ", e);
    }

    if (res) {
      // console.log('BLOCK JEADER::: ',res)
      // console.log(res);
      // const blockArray = new Uint8Array(Buffer.from(JSON.stringify(res.tx)))
      return res;
    }
  }

  async getTxIdData(txid: string) {
    let res = (
      await ElectrumClient.get(`http://127.0.0.1:18443/rest/tx/${txid}.json`)
    ).data;

    return [res.blockheight, res.hex];
  }

  static async get(endpoint: string, timeout_ms = TIMEOUT) {
    const axios = (await import("axios")).default;

    const url = endpoint;
    const config = {
      method: "get",
      url: url,
      headers: { Accept: "application/json" },
      timeout: timeout_ms,
    };

    return await axios(config);
  }

  static async post(endpoint: string, timeout_ms = TIMEOUT) {
    const axios = (await import("axios")).default;
    const options = {
      headers: {
        "Content-Type": "text/plain",
      },
      data: {
        jsonrpc: "1.0",
        id: "curltest",
        method: "getblockchaininfo",
      },
    };

    axios
      .post("http://polaruser:polarpass@127.0.0.1:18443/", options)
      .then((response) => {
        console.log("RESPONSE: ", response.data);
        return response.data;
      })
      .catch((error) => {
        console.log("ERROR: ", error);
      });
  }
}

export const GET_ROUTE = {
  PING: "/electrs/ping",
  //latestBlockHeader "/Electrs/block/:hash/header",
  BLOCK: "/electrs/block",
  BLOCKS_TIP_HASH: "/electrs/blocks/tip/hash",
  HEADER: "header",
  BLOCKS_TIP_HEIGHT: "/electrs/blocks/tip/height",
  //getTransaction /tx/:txid
  TX: "/electrs/tx",
  //getScriptHashListUnspent /scripthash/:hash/utxo
  SCRIPTHASH: "/electrs/scripthash",
  UTXO: "utxo",
  //getFeeEstimates
  FEE_ESTIMATES: "/electrs/fee-estimates",
};
Object.freeze(GET_ROUTE);

export const POST_ROUTE = {
  //broadcast transaction
  TX: "/electrs/tx",
};
Object.freeze(POST_ROUTE);

export default ElectrumClient;
