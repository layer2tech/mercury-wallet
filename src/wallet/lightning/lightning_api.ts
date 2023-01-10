"use strict";
import {
  ElectrumClient,
  ElectrsClient,
  EPSClient,
  MockElectrumClient,
  HttpClient,
  MockHttpClient,
  GET_ROUTE,
  POST_ROUTE,
} from "..";

const Promise = require("bluebird");
let types = require("../types");
let typeforce = require("typeforce");
let show_alerts = true;
const version = require("../../../package.json").version;
const semverLt = require("semver/functions/lt");

export const getPeerInfo = async (http_client: HttpClient | MockHttpClient) => {
  let peer_info = await http_client.get(GET_ROUTE.COINS_INFO, {});
  typeforce(types.CoinsInfo, peer_info);
  return peer_info;
};
