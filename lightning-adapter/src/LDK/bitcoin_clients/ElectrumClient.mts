import axios from "axios";
import { BitcoinDaemonClientInterface } from "./BitcoinD.mjs";
import dotenv from "dotenv";
dotenv.config();

const TIMEOUT = 20000;

// CHANGE THESE TO THE ESPLORA HOST
const HOST = "http://" + process.env["HOSTNAME"];
const PORT = process.env["NODE_PORT"];
const USER = "";
const PASS = "";

// Custom Logger
import { ChalkColor, Logger } from "../utils/Logger.js";
const DEBUG = new Logger(ChalkColor.Yellow, "ElectrumClient.ts");

class ElectrumClient implements BitcoinDaemonClientInterface {
  async getMerkleProofPosition(txid: string): Promise<any> {
    DEBUG.log(
      "getMerkleProofPosition... txid->",
      "getMerkleProofPosition",
      txid
    );
    try {
      let res = (await ElectrumClient.get(`tx/${txid}/merkle-proof`)).data;
      return res;
    } catch (e) {
      DEBUG.err("[ElectrumClient.mts]: Error getTxOut", e);
    }
  }

  // POST / tx;
  async setTx(txid: string): Promise<any> {
    DEBUG.log("setTx...", "setTx");
    try {
      let res = ElectrumClient.post("tx", txid);
      return res;
    } catch (e) {
      DEBUG.err("[ElectrumClient.ts]: Error setTx", e);
    }
  }
  /* 
    Example output:
    {"spent":false}
  */
  async getTxOut(txid: string, vout: number): Promise<any> {
    DEBUG.log("getTxOut...", "getTxOut");
    try {
      let res = (await ElectrumClient.get(`tx/${txid}/outspend/${vout}`)).data;
      return res;
    } catch (e) {
      DEBUG.err("[ElectrumClient.mts]: Error getTxOut", e);
    }
  }

  /*
    Example output:
    020000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff0402360100ffffffff02807c814a000000001600143d27b06f0539ca6a16e4d521ec2ee7b9ab720fcd0000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf90120000000000000000000000000000000000000000000000000000000000000000000000000
  */
  async getRawTransaction(txid: string): Promise<any> {
    DEBUG.log("getRawTransaction...", "getRawTransaction", txid);
    try {
      let res = (await ElectrumClient.get(`tx/${txid}/hex`)).data;
      return res;
    } catch (e) {
      DEBUG.err("[ElectrumClient.mts]: Error Getting raw transaction", e);
    }
  }

  /* 
    Example output:
    00000030e856389b81d90c101f736098a4e023741d5b7e87d6cd0d709a2acbbe5c45f965aa24be79c071ea43c4c59d211ac764507daaa405b397cc475b1308984b1b265b94cf5364ffff7f2000000000
  */
  async getHeaderByHash(hash: String) {
    DEBUG.log("getHeaderByHash...", "getHeaderByHash");
    let res;
    try {
      res = (await ElectrumClient.get(`block/${hash}/header`)).data;
      DEBUG.log("returning res... ->", "getHeaderByHash", res);
      return res;
    } catch (e) {
      DEBUG.err("[ElectrumClient.mts]: Error getHeaderByHash", e);
    }
  }

  /*
    Example output:
    {"in_best_chain":true,"height":320,"next_best":null}
  */
  async getBlockStatus(hash: String) {
    DEBUG.log("getBlockStatus...", "getBlockStatus");
    let res;
    try {
      res = (await ElectrumClient.get(`block/${hash}/status`)).data;
      DEBUG.log("returning block status ->", "getBlockStatus", res);
      return res;
    } catch (e) {
      DEBUG.err("[ElectrumClient.mts]: Error getBlockStatus", e);
    }
  }

  async getBestBlockHash() {
    DEBUG.log("getBestBlockHash...", "getBestBlockHash");
    let res;
    try {
      res = (await ElectrumClient.get("blocks/tip/hash")).data;
      DEBUG.log("returning block hash ->", "getBestBlockHash", res);
      return res;
    } catch (e) {
      DEBUG.err("[ElectrumClient.mts]: Error Getting Block Height");
    }
  }

  async getBestBlockHeight() {
    DEBUG.log("getBestBlockHeight...", "getBestBlockHeight");
    let res;
    try {
      res = (await ElectrumClient.get("blocks/tip/height")).data;
      DEBUG.log("returning blockheight ->", "getBestBlockHeight", res);
      return res;
    } catch (e) {
      DEBUG.err("[ElectrumClient.mts]: Error Getting Block Height");
    }
  }

  async getHashByHeight(height: number | string) {
    DEBUG.log("height entered ->", "getHashByHeight", height);
    if (typeof height === "string") {
      return height;
    }

    // First get the hash of the block height
    try {
      let block_hash = (await ElectrumClient.get(`block-height/${height}`))
        .data;
      DEBUG.log("returning hash ->", "getHashByHeight", block_hash);
      return block_hash;
    } catch (e) {
      DEBUG.err("[ElectrumClient.mts]: Error Getting Current Block Hash");
    }
  }

  /*
    Example output:
    { "id":"6308b34593df109d39b2c9dfd12ee181a57ce0b8d277c09ef423db6f644e37a3",
    "height":320,"version":805306368,"timestamp":1683214228,"tx_count":1,"size":250,"weight":892,
    "merkle_root":"5b261b4b9808135b47cc97b305a4aa7d5064c71a219dc5c443ea71c079be24aa",
    "previousblockhash":"65f9455cbecb2a9a700dcdd6877e5b1d7423e0a49860731f100cd9819b3856e8",
    "mediantime":1683214227,"nonce":0,"bits":545259519,"difficulty":0 }
  */
  async getBlockHeader(height: number | string) {
    let currentBlockHash = await this.getHashByHeight(height);
    DEBUG.log("Get Latest Block Header", "getBlockHeader", height);

    try {
      let block_header = (await ElectrumClient.get(`block/${currentBlockHash}`))
        .data;
      DEBUG.log("returning block header ->", "getBlockHeader", block_header);
      return block_header;
    } catch (e) {
      DEBUG.err("[ElectrumClient.mts]: Error in getting header: ", e);
    }
  }

  /*
    Example output:
    {"id":"6308b34593df109d39b2c9dfd12ee181a57ce0b8d277c09ef423db6f644e37a3","height":320,"version":805306368,"timestamp":1683214228,"tx_count":1,"size":250,"weight":892,"merkle_root":"5b261b4b9808135b47cc97b305a4aa7d5064c71a219dc5c443ea71c079be24aa","previousblockhash":"65f9455cbecb2a9a700dcdd6877e5b1d7423e0a49860731f100cd9819b3856e8","mediantime":1683214227,"nonce":0,"bits":545259519,"difficulty":0}
  */
  async getTxIdData(txid: string) {
    DEBUG.log("txid->", "getTxIdData", txid);
    try {
      const res = (await ElectrumClient.get(`tx/${txid}`)).data;

      return {
        txid: res?.txid ?? "",
        vout: res?.vout ?? -1,
        sequence: res?.vin[0]?.sequence ?? -1,
        height: res?.status?.block_height ?? -1,
        confirmed: res?.status?.confirmed ?? false,
        hash: res?.status?.block_hash ?? -1,
      };
    } catch (e) {
      DEBUG.err("[ElectrumClient.mts]: Error in getTxIdData", e);
      return null;
    }
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

  static async post(endpoint: string, body: string, timeout_ms = TIMEOUT) {
    console.log("[ElectrumClient.ts/post]: body is equal to:", body);
    const url = HOST + ":" + PORT + "/" + endpoint;
    return await axios.post(url, body);
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

export default ElectrumClient;
