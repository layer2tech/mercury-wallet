"use strict";
import { checkForServerError, handlePromiseRejection } from "./error";
import { semaphore, TIMEOUT } from "./http_client";
import axios, { AxiosRequestConfig } from "axios";
import { handleErrors } from "../error";
import { Channel, ChannelInfo } from "./channel";

export const LIGHTNING_GET_ROUTE = {
  PEER_LIST: "peer/peers",
  CHANNEL_LIST: "channel/loadChannels",
  NODE_ID: "channel/nodeId",
  DEAULT_PEER_LIST: "peer/default_peerlist",
};
Object.freeze(LIGHTNING_GET_ROUTE);

export const LIGHTNING_POST_ROUTE = {
  GENERATE_INVOICE: "/generateInvoice",
};
Object.freeze(LIGHTNING_POST_ROUTE);

export const LIGHTNING_URL = "http://localhost:3003";

export class LDKClient {
  async setTxData(body: any): Promise<any> {
    console.log("[ldk_client.ts]->setTxData");
    try {
      let res = await LDKClient.post("peer/setTxData", body);
      return res;
    } catch (e: any) {
      throw new Error("Error in setting txData" + e?.message);
    }
  }

  async getChannels(wallet_name: string): Promise<ChannelInfo[]> {
    let channels: ChannelInfo[] = [];
    try {
      channels = await LDKClient.get(
        LIGHTNING_GET_ROUTE.CHANNEL_LIST,
        wallet_name
      );
    } catch (e: any) {
      //throw new Error("GET - Channel List Error: ", e);
      console.error("GET - Channel List Error: ");
    }
    return channels;
  }

  async getPeers(): Promise<any> {
    let peerInfo: any;
    try {
      peerInfo = await LDKClient.get(LIGHTNING_GET_ROUTE.PEER_LIST, {});
    } catch (e: any) {
      //throw new Error("GET - Peers Error: ", e);
      console.error("GET - Channel List Error: ");
    }
    return peerInfo;
  }

  async getNodeId(): Promise<any> {
    let nodeId = 0;
    try {
      nodeId = await LDKClient.get(LIGHTNING_GET_ROUTE.NODE_ID, {});

      console.log("Node is found was:", nodeId);
    } catch (e: any) {
      console.log("Error:", e);
      //throw new Error("GET - NodeId Error", e);
      console.error("GET - NodeId Error: ");
    }
    return nodeId;
  }

  async savePeerAndChannelToDb(body: any): Promise<any> {
    console.log("[ldk_client.ts]->savePeerAndChannelToDb");
    try {
      let res = await LDKClient.post("peer/savePeerAndChannelToDb", body);
      return res;
    } catch (e: any) {
      if (e.response && e.response.status === 409) {
        return e.response;
      }
      throw new Error("Error in channel creation" + e?.message);
    }
  }

  async saveChannelPaymentInfoToDb(body: any): Promise<any> {
    try {
      let res = await LDKClient.post("peer/saveChannelPaymentInfoToDb", body);
      return res;
    } catch (e: any) {
      throw new Error("Error in opening channel " + e?.message);
    }
  }

  async connectToPeer(body: any): Promise<any> {
    try {
      let res = await LDKClient.post("peer/connectToPeer", body);
      return res;
    } catch (e: any) {
      throw new Error("Couldn't connect to peer " + e?.message);
    }
  }

  async createChannel(body: any): Promise<any> {
    try {
      let res = await LDKClient.post("channel/createChannel", body);
      return res;
    } catch (e: any) {
      throw new Error("Couldn't connect to channel" + e?.message);
    }
  }

  async sendPayment(body: any): Promise<any> {
    try {
      let res = await LDKClient.post("/sendPayment", body);
      return res;
    } catch (e: any) {
      throw new Error("Couldn't send payment to given invoice" + e?.message);
    }
  }

  static async get(path: string, params: any, timeout_ms: number = TIMEOUT) {
    const url =
      LIGHTNING_URL +
      "/" +
      (
        path + (Object.entries(params).length === 0 ? "" : "/" + params)
      ).replace(/^\/+/, "");
    const config: AxiosRequestConfig = {
      method: "get",
      url: url,
      headers: {
        Accept: "application/json",
      },
      timeout: timeout_ms,
    };

    return axios(config)
      .catch((err: any) => {
        handlePromiseRejection(err, "Mercury API request timed out");
      })
      .then((res: any) => {
        checkForServerError(res);
        return res?.data;
      });
  }

  static async post(path: string, body: any, timeout_ms: number = TIMEOUT) {
    let url = LIGHTNING_URL + "/" + path.replace(/^\/+/, "");
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

    return axios(config)
      .catch((err: any) => {
        handlePromiseRejection(err, "Mercury API request timed out");
      })
      .then((res: any) => {
        checkForServerError(res);
        return res?.data;
      });
  }
}
