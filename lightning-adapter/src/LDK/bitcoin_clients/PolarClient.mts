import axios from "axios";

const TIMEOUT = 20000;

// CHANGE THESE TO MATCH POLAR
const HOST = "http://127.0.0.1";
const PORT = "18443";
const USER = "polaruser";
const PASS = "polarpass";

class PolarClient {
  endpoint;
  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async getBestBlockHash() {
    console.log("[PolarClient.mts]: getBestBlockHash...");
    let res;
    try {
      res = (await PolarClient.get("rest/chaininfo.json")).data;
    } catch (e) {
      console.log("[PolarClient.mts]: Error Getting Block Height");
    }
    if (res) {
      return res.bestblockhash;
    }
  }

  async getBlockHeight() {
    console.log("[PolarClient.mts]: getBlockHeight...");
    let res;
    try {
      res = (await PolarClient.get("rest/chaininfo.json")).data;
      return res.blocks;
    } catch (e) {
      console.log("[PolarClient.mts]: Error Getting Block Height");
    }
  }

  async getLatestBlockHeader(height: number) {
    let currentBlockHash;
    try {
      console.log(
        "[PolarClient.mts]: getLatestBlockHeader, block_height:",
        height
      );
      currentBlockHash = (
        await PolarClient.get(`rest/blockhashbyheight/${height}.json`)
      ).data.blockhash;
    } catch (e) {
      console.log("[PolarClient.mts]: Error Getting Current Block Hash");
    }

    // return currentBlockHash
    console.log("[PolarClient.mts]: Get Latest Block Header...");
    let res;
    try {
      res = (await PolarClient.get(`rest/headers/1/${currentBlockHash}.hex`))
        .data;
    } catch (e) {
      console.log("[PolarClient.mts]: Error in getting header: ", e);
    }

    if (res) {
      return res;
    }
  }

  async getTxIdData(txid: string) {
    let res = (await PolarClient.get(`rest/tx/${txid}.json`)).data;

    return {
      txid: res.txid,
      vout: res.vin[0].vout,
      sequence: res.vin[0].sequence,
    };
  }

  async getUtxoSpentData(txid: string, vout: number) {
    throw new Error("Not yet implemented");
  }

  static async get(endpoint: string, timeout_ms = TIMEOUT) {
    const url = HOST + ":" + PORT + "/" + endpoint;
    const config = {
      method: "get",
      url: url,
      headers: { Accept: "application/json" },
      timeout: timeout_ms,
    };

    return await axios(config);
  }

  static async post(endpoint: string, timeout_ms = TIMEOUT) {
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
      .post(
        "http://" + USER + ":" + PASS + "@" + HOST + ":" + PORT + "/",
        options
      )
      .then((response) => {
        console.log("[PolarClient.mts]: RESPONSE: ", response.data);
        return response.data;
      })
      .catch((error) => {
        console.log("[PolarClient.mts]: ERROR: ", error);
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
  UTXO_SPENT: "/electrs/tx/:txid/outspend/:vout",
};
Object.freeze(GET_ROUTE);

export const POST_ROUTE = {
  //broadcast transaction
  TX: "/electrs/tx",
};
Object.freeze(POST_ROUTE);

export default PolarClient;
