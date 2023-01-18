// const {Buffer} = require('buffer');
const axios = import("axios");

const TIMEOUT = 20000;

const TOR_ENDPOINT = "http://localhost:3001";

class TorClient {
  endpoint;
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  async getBlockHeight() {
    console.log("Get Block Height...");
    let res;
    try {
      res = (
        await TorClient.get(`${TOR_ENDPOINT}${GET_ROUTE.BLOCKS_TIP_HEIGHT}`)
      ).data;
    } catch(e){
      console.log('Error Getting Block Height')
    }
    if (res) {
      return res;
    }
  }

  async getLatestBlockHeader(height) {
    let currentBlockHash;
    try {
      console.log("HEIGHT: ", height);
      currentBlockHash = (
        await TorClient.get(
          `${TOR_ENDPOINT}${GET_ROUTE.BLOCKS_TIP_HASH}`
        )
      ).data;
    } catch (e) {
      console.log("Error Getting Current Block Hash");
    }

    // return currentBlockHash
    console.log("Get Latest Block Header...");
    let res;
    try {
      res = (
        await TorClient.get(
          `${TOR_ENDPOINT}/electrs/block/${currentBlockHash}/header`
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

  async getTxIdData(txid) {
    let res = (
      await TorClient.get(`${TOR_ENDPOINT}/tx/${txid}`)
    ).data;

    return [res.blockheight, res.hex];
  }

  static async get(endpoint, timeout_ms = TIMEOUT) {
    const axios = (await import("axios")).default;

    const url = endpoint;
    const config = {
      method: "get",
      url: url,
      headers: { Accept: "application/json" },
      timeout: timeout_ms,
    };

    return await axios(config)
      .catch((error) => {
        console.log("ERROR: ", error);
      });
  }

  static async post(endpoint, timeout_ms = TIMEOUT) {
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
      .post("http://polaruser:polarpass@127.0.0.1:3001/", options)
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

export default TorClient;
