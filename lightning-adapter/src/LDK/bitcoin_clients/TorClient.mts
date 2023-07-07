import axios from "axios";
import { RawAxiosRequestConfig } from "axios";
import { BitcoinDaemonClientInterface } from "./BitcoinD.mjs";

const TIMEOUT = 20000;
const HOST = "http://localhost";
const PORT = 3001;

export const TOR_ENDPOINT = "http://localhost:3001";

// Custom Logger
import { ChalkColor, Logger } from "../utils/Logger.js";
const DEBUG = new Logger(ChalkColor.Yellow, "TorClient.ts");

class TorClient implements BitcoinDaemonClientInterface {
  async getMerkleProofPosition(txid: string): Promise<any> {
    DEBUG.log(
      "getMerkleProofPosition... txid->",
      "getMerkleProofPosition",
      txid
    );
    try {
      let res = (await TorClient.get(`electrs/tx/${txid}/merkle-proof`)).data;
      return res;
    } catch (e) {
      DEBUG.err("[ElectrumClient.mts]: Error getTxOut", e);
    }
  }

  async setTx(txid: string): Promise<any> {
    DEBUG.log("setTx...", "setTx");
    try {
      let res = TorClient.post("electrs/tx", txid);
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
      let res = (await TorClient.get(`electrs/tx/${txid}/outspend/${vout}`))
        .data;
      return res;
    } catch (e) {
      DEBUG.err("[ElectrumClient.mts]: Error getTxOut", e);
    }
  }
  async getRawTransaction(txid: string): Promise<any> {
    DEBUG.log("getRawTransaction...", "getRawTransaction", txid);
    try {
      let res = (await TorClient.get(`electrs/tx/${txid}/hex`)).data;
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
      res = (await TorClient.get(`electrs/block/${hash}/header`)).data;
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
      res = (await TorClient.get(`electrs/block/${hash}/status`)).data;
      DEBUG.log("returning block status ->", "getBlockStatus", res);
      return res;
    } catch (e) {
      DEBUG.err("[ElectrumClient.mts]: Error getBlockStatus", e);
    }
  }

  async getBestBlockHash() {
    console.log("[TorClient.mts]: getBestBlockHash...");
    let res;
    try {
      res = await TorClient.get(`${GET_ROUTE.BLOCKS_TIP_HASH}`);

      res = res && res.data;
    } catch (e) {
      console.log("[TorClient.mts]: Error Getting Block Height");
    }
    if (res) {
      return res;
    }
  }

  async getBestBlockHeight() {
    console.log("[TorClient.mts]: getBlockHeight...");
    let res;
    try {
      res = await TorClient.get(`${GET_ROUTE.BLOCKS_TIP_HEIGHT}`);

      res = res && res.data;
    } catch (e) {
      console.log("[TorClient.mts]: Error Getting Block Height");
    }
    if (res) {
      return res;
    }
  }

  async getBlockHeader(height: number | string) {
    let currentBlockHash;
    try {
      console.log(
        "[TorClient.mts/getBlockHeader]: Get latest block header..............."
      );
      console.log("[TorClient.mts/getBlockHeader]: block_height: ", height);
      console.log(
        `[TorClient.mts/getBlockHeader]: ${GET_ROUTE.BLOCKS_TIP_HASH}`
      );
      let res = await TorClient.get(`${GET_ROUTE.BLOCKS_TIP_HASH}`);

      currentBlockHash = res && res.data;
    } catch (e) {
      console.log(
        "[TorClient.mts/getBlockHeader]: Error Getting Current Block Hash"
      );
    }

    console.log("[TorClient.mts/getBlockHeader]: Get Latest Block Header...");
    let res;
    try {
      res = await TorClient.get(`/electrs/block/${currentBlockHash}/header`);

      res = res && res.data;
    } catch (e) {
      console.log(
        "[TorClient.mts/getBlockHeader]: Error in getting header: ",
        e
      );
    }

    if (res) {
      return res;
    }
  }

  async getTxIdData(txid: string) {
    let res = (await TorClient.get(`${GET_ROUTE.TX}/${txid}`)).data;

    console.log(JSON.stringify(res));

    return {
      txid: res?.txid ?? "",
      vout: res?.vout ?? -1,
      sequence: res?.vin[0]?.sequence ?? -1,
      height: res?.status?.block_height ?? -1,
      confirmed: res?.status?.confirmed ?? false,
      hash: res?.status?.block_hash ?? -1,
    };
  }

  async getUtxoSpentData(txid: string, vout: number) {
    try {
      const res = (
        await TorClient.get(
          `${GET_ROUTE.UTXO_SPENT}`
            .replace(":txid", txid)
            .replace(":vout", String(vout))
        )
      ).data;
      if (res) {
        return res;
      }
      throw new Error("Error fetching UTXO spent data");
    } catch (e: any) {
      throw new Error(e);
    }
  }

  static async get(endpoint: string, timeout_ms = TIMEOUT) {
    const url = HOST + ":" + PORT + "/" + endpoint;
    console.log("[TorClient.mts/get]: URL IS:", url);
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
  PING: "electrs/ping",
  //latestBlockHeader "/Electrs/block/:hash/header",
  BLOCK: "electrs/block",
  BLOCKS_TIP_HASH: "electrs/blocks/tip/hash",
  HEADER: "header",
  BLOCKS_TIP_HEIGHT: "electrs/blocks/tip/height",
  //getTransaction /tx/:txid
  TX: "electrs/tx",
  //getScriptHashListUnspent /scripthash/:hash/utxo
  SCRIPTHASH: "electrs/scripthash",
  UTXO: "utxo",
  //getFeeEstimates
  FEE_ESTIMATES: "electrs/fee-estimates",
  UTXO_SPENT: "electrs/tx/:txid/outspend/:vout",
};
Object.freeze(GET_ROUTE);

export const POST_ROUTE = {
  //broadcast transaction
  TX: "/electrs/tx",
};
Object.freeze(POST_ROUTE);

export default TorClient;
