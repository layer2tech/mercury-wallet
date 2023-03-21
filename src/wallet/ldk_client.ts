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
  GENERATE_INVOICE: "/lightning/generate_invoice",
};
Object.freeze(LIGHTNING_POST_ROUTE);

export const LIGHTNING_URL = "http://localhost:3003";

export class LDKClient {
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

  async createChannel(body: any) {
    let res;
    try {
      res = await LDKClient.post("peer/create-channel", body);
      return res;
    } catch (err: any) {
      if (err.response && err.response.status === 409) {
        return err.response;
      }
      throw new Error("Error in channel creation", err);
    }
  }

  async openChannel(body: any) {
    try {
      let res = await LDKClient.post("peer/open-channel", body);
      return res;
    } catch (e: any) {
      throw new Error("Error in opening channel");
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
        return res;
      });
  }
}
