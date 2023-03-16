import { RawAxiosRequestConfig } from "axios";

// const {Buffer} = require('buffer');
const axios = import("axios");

const TIMEOUT = 20000;

const TOR_ENDPOINT = "http://localhost:3001";

class TorClient {
  endpoint;
  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async getBlockHeight() {
    console.log("Get Block Height...");
    let res;
    try {
      res = await TorClient.get(
        `${TOR_ENDPOINT}${GET_ROUTE.BLOCKS_TIP_HEIGHT}`
      );

      res = res && res.data;
    } catch (e) {
      console.log("Error Getting Block Height");
    }
    if (res) {
      return res;
    }
  }

  async getLatestBlockHeader(height: number) {
    let currentBlockHash;
    try {
      console.log("Get latest block header...............");
      console.log("HEIGHT: ", height);
      console.log(`${TOR_ENDPOINT}${GET_ROUTE.BLOCKS_TIP_HASH}`);
      let res = await TorClient.get(
        `${TOR_ENDPOINT}${GET_ROUTE.BLOCKS_TIP_HASH}`
      );

      currentBlockHash = res && res.data;
    } catch (e) {
      console.log("Error Getting Current Block Hash");
    }

    // return currentBlockHash
    console.log("Get Latest Block Header...");
    let res;
    try {
      res = await TorClient.get(
        `${TOR_ENDPOINT}/electrs/block/${currentBlockHash}/header`
      );

      res = res && res.data;
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
    let res;
    try {
      res = await TorClient.get(`${TOR_ENDPOINT}/tx/${txid}`);
      if (res && (res.data as { blockheight: number; hex: string })) {
        const result = res.data;
        return [result.blockheight, result.hex];
      }
    } catch (e: any) {
      throw new Error(e);
    }
  }

  static async get(endpoint: string, timeout_ms = TIMEOUT) {
    const axios = (await import("axios")).default;

    const url = endpoint;
    const config: RawAxiosRequestConfig = {
      method: "get",
      url: url,
      headers: { Accept: "application/json" },
      timeout: timeout_ms,
    };

    return await axios(config).catch((error) => {
      console.log("ERROR: ", error);
    });
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
      .post(endpoint, options)
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
