"use strict";
import { checkForServerError, handlePromiseRejection } from "./error";
import { semaphore, TIMEOUT } from "./http_client";
import axios, { AxiosRequestConfig } from "axios";
import { handleErrors } from "../error";
import { Channel, ChannelInfo } from "./channel";

export const LIGHTNING_GET_ROUTE = {
  PEER_LIST: "/lightning/peers",
  CHANNEL_LIST: "/channel/loadChannels",
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
      throw new Error("GET - Channel List Error: ", e);
    }
    return channels;
  }

  async createChannel(body: any) {
    try {
      let res = await LDKClient.post("/create-channel", body);
      return res;
    } catch (e: any) {
      throw new Error("Error in channel creation");
    }
  }

  async openChannel(body: any) {
    try {
      let res = await LDKClient.post("/open-channel", body);
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
        return res?.data;
      });
  }
}
