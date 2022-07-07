import { checkForServerError, handlePromiseRejection } from "./error";
import { Mutex } from "async-mutex";
import { semaphore, TIMEOUT } from "./http_client";
import axios, { AxiosRequestConfig } from "axios";
import { Network } from "bitcoinjs-lib";
let bitcoin = require("bitcoinjs-lib");

export const mutex = new Mutex();

class ElectrsLocalClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ElectrsLocalClientError";
  }
}

export const GET_ROUTE = {
  PING: "/electrs_local/ping",
  BLOCK: "/electrs_local/block",
  HEADER: "header",
  LATEST_BLOCK_HEADER: "/electrs_local/latest_block_header",
  //getTransaction /tx/:txid
  TX: "/electrs_local/tx",
  //getScriptHashListUnspent /scripthash/:hash/utxo
  SCRIPTHASH: "/electrs_local/scripthash",
  SCRIPTHASH_HISTORY: "/electrs_local/scripthash_history",
  UTXO: "utxo",
  //getFeeHistogram
  FEE_ESTIMATES: "/electrs_local/fee-estimates",
};
Object.freeze(GET_ROUTE);

export const POST_ROUTE = {
  //broadcast transaction
  TX: "/electrs_local/tx",
  CONFIG: "/electrs_local/config",
};
Object.freeze(POST_ROUTE);

export class ElectrsLocalClient {
  endpoint: string;
  //client: HttpClient | MockHttpClient
  scriptIntervals: Map<string, any>;
  scriptStatus: Map<string, any>;
  blockHeightLatest: any;

  constructor(endpoint: string) {
    //this.client = new HttpClient('http://localhost:3001', true);
    this.endpoint = endpoint;
    this.scriptIntervals = new Map();
    this.scriptStatus = new Map();
    this.blockHeightLatest = 0;
  }

  static async get(
    endpoint: string,
    path: string,
    params: any,
    timeout_ms: number = TIMEOUT
  ) {
    const url =
      endpoint +
      "/" +
      (
        path + (Object.entries(params).length === 0 ? "" : "/" + params)
      ).replace(/^\/+/, "");
    const config: AxiosRequestConfig = {
      method: "get",
      url: url,
      headers: { Accept: "application/json" },
      timeout: timeout_ms,
    };
    await semaphore.wait();
    return axios(config)
      .catch((err: any) => {
        //console.log(`${JSON.stringify(err)}`)
        handlePromiseRejection(err, "Electrum API request timed out");
      })
      .finally(() => {
        semaphore.release();
      })
      .then((res: any) => {
        checkForServerError(res);
        return res?.data;
      });
  }

  static async post(
    endpoint: string,
    path: string,
    body: any,
    timeout_ms: number = TIMEOUT
  ) {
    let url = endpoint + "/" + path.replace(/^\/+/, "");
    const config: AxiosRequestConfig = {
      method: "post",
      url: url,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: timeout_ms,
      data: body,
    };
    await semaphore.wait();
    return axios(config)
      .catch((err: any) => {
        handlePromiseRejection(err, "Electrum API request timed out");
      })
      .finally(() => {
        semaphore.release();
      })
      .then((res: any) => {
        checkForServerError(res);
        return res?.data;
      });
  }

  async isClosed(): Promise<boolean> {
    let ping = await this.ping();
    let result = ping == false;
    return result;
  }

  // convert BTC address scipt to electrum script has
  static scriptToScriptHash(script: string) {
    let script_hash = bitcoin.crypto.sha256(script).toString("hex"); // hash
    return script_hash
      .match(/[a-fA-F0-9]{2}/g)
      .reverse()
      .join(""); // reverse
  }

  async connect(
    config = { protocol: "tcp", host: "127.0.0.1", port: "50001" }
  ) {
    ElectrsLocalClient.post(this.endpoint, POST_ROUTE.CONFIG, { data: config });
  }

  async ping(): Promise<boolean> {
    try {
      await ElectrsLocalClient.get(
        this.endpoint,
        GET_ROUTE.LATEST_BLOCK_HEADER,
        {}
      );
      return true;
    } catch (err) {
      return false;
    }
  }

  // Get header of the latest mined block.
  async latestBlockHeader(): Promise<any> {
    let header = await ElectrsLocalClient.get(
      this.endpoint,
      GET_ROUTE.LATEST_BLOCK_HEADER,
      {}
    );
    return header;
  }

  async getTransaction(txHash: string): Promise<any> {
    let result = await ElectrsLocalClient.get(
      this.endpoint,
      `${GET_ROUTE.TX}/${txHash}`,
      {}
    );
    return result;
  }

  async getAddressListUnspent(addr: string, network: Network) {
    let out_script = bitcoin.address.toOutputScript(addr, network);
    return this.getScriptHashListUnspent(out_script);
  }

  async getScriptHashListUnspent(script: string): Promise<any> {
    let scriptHash = ElectrsLocalClient.scriptToScriptHash(script);
    //console.log(`scriptHash: ${scriptHash}`)
    let result = await ElectrsLocalClient.get(
      this.endpoint,
      `/electrs_local/get_scripthash_list_unspent/${scriptHash}`,
      {}
    );
    //let result = await ElectrsLocalClient.get(this.endpoint,GET_ROUTE.LATEST_BLOCK_HEADER, {})
    return result;
  }

  async getScriptHashStatus(
    scriptHash: string,
    callBack: any,
    endpoint: string
  ) {
    let history = null;
    try {
      history = await ElectrsLocalClient.get(
        endpoint,
        `${GET_ROUTE.SCRIPTHASH_HISTORY}/${scriptHash}`,
        {}
      );
    } catch (err) {}
    if (history) {
      if (callBack) {
        callBack();
      }
    }
  }

  async getLatestBlock(callBack: any, endpoint: string): Promise<any> {
    let header = await ElectrsLocalClient.get(
      endpoint,
      "/electrs_local/latest_block_header",
      {}
    );
    if (this.blockHeightLatest != header.height) {
      this.blockHeightLatest = header.height;
      callBack([header]);
    }
    return header;
  }

  async addressSubscribe(addr: string, network: Network, callBack: any) {
    let out_script = bitcoin.address.toOutputScript(addr, network);
    return this.scriptHashSubscribe(out_script, callBack);
  }

  async addressUnsubscribe(addr: string, network: Network) {
    let out_script = bitcoin.address.toOutputScript(addr, network);
    return this.scriptHashUnsubscribe(out_script);
  }

  async scriptHashSubscribe(script: string, callBack: any): Promise<any> {
    let scriptHash = ElectrsLocalClient.scriptToScriptHash(script);
    if (this.scriptIntervals.has(scriptHash)) {
      throw new ElectrsLocalClientError(
        `already subscribed to script: [${scriptHash}]`
      );
    }
    let timer = setInterval(
      this.getScriptHashStatus,
      10000,
      scriptHash,
      callBack,
      this.endpoint
    );
    this.scriptIntervals.set(scriptHash, timer);
    return timer;
  }

  async scriptHashUnsubscribe(script: string) {
    let scriptHash = ElectrsLocalClient.scriptToScriptHash(script);
    clearInterval(this.scriptIntervals.get(scriptHash));
  }

  async blockHeightSubscribe(callBack: any): Promise<any> {
    return setInterval(this.getLatestBlock, 10000, callBack, this.endpoint);
  }

  async unsubscribeAll() {
    return;
  }

  async broadcastTransaction(rawTX: string): Promise<string> {
    let result = ElectrsLocalClient.post(this.endpoint, GET_ROUTE.TX, {
      data: rawTX,
    });
    return result;
  }

  async getFeeEstimation(num_blocks: number, net_config: string): Promise<any> {
    let result = ElectrsLocalClient.get(
      this.endpoint,
      GET_ROUTE.FEE_ESTIMATES,
      {}
    ).then((histo) => [`${num_blocks}`]);
    return result;
  }

  async importAddresses(addresses: [string]): Promise<string> {
    return "";
  }
}
