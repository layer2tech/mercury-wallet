// History is a log of all Mercury protocol actions taken by the wallet.

import { Network } from "bitcoinjs-lib/types/networks";
import { ElectrumClientConfig } from "./electrum";

let cloneDeep = require('lodash.clonedeep');

const DEFAULT_STATE_ENTITY_ENPOINT = "https://fakeapi.mercurywallet.io";

export class Config {
  // Set at startup only
  network: Network;
  testing_mode: boolean;
  jest_testing_mode: boolean;
  required_confirmations: number;
  electrum_fee_estimation_blocks: number;

  // Editable while wallet running from Settings page
  state_entity_endpoint: string;
  swap_conductor_endpoint: string;
  electrum_config: ElectrumClientConfig;
  tor_proxy: string;

  min_anon_set: number;
  date_format: any;
  notifications: boolean;
  tutorials: boolean;

  constructor(network: Network, testing_mode: boolean) {
    this.network = network;
    this.testing_mode = testing_mode;
    this.jest_testing_mode = false;
    this.required_confirmations = 3;
    this.electrum_fee_estimation_blocks = 6;

    this.state_entity_endpoint = DEFAULT_STATE_ENTITY_ENPOINT;
    this.swap_conductor_endpoint = DEFAULT_STATE_ENTITY_ENPOINT;
    this.electrum_config = {
      host: 'wallet.mercurywallet.io',
      port: 50004,
      protocol: 'wss',
    }
    this.tor_proxy = "";

    this.min_anon_set = 5;
    this.notifications = true;
    this.tutorials = false;

    // update defaults with config in settings.json
    this.update(require("../settings.json"))
  }

  getConfig() {
    return cloneDeep(this)
  }

  // update by providing JSONObject with new values
  update(config_changes: object) {
    Object.entries(config_changes).forEach((item) => {
      switch(item[0]) {
        case "network":
          return;
        case "testing_mode":
          this.testing_mode = item[1];
          return;
        case "jest_testing_mode":
          this.jest_testing_mode = item[1];
          return;
        case "required_confirmations":
          this.required_confirmations = item[1];
          return;
        case "electrum_fee_estimation_blocks":
          this.electrum_fee_estimation_blocks = item[1];
          return;         
        case "state_entity_endpoint":
          this.state_entity_endpoint = item[1];
          return;
        case "swap_conductor_endpoint":
          this.swap_conductor_endpoint = item[1];
          return;
        case "electrum_config":
          this.electrum_config = item[1];
          return;
        case "tor_proxy":
          this.tor_proxy = item[1];
          return;
        case "min_anon_set":
          this.min_anon_set = item[1];
          return;
        case "notifications":
          this.notifications = item[1]
          return;
        case "tutorials":
          this.tutorials = item[1]
          return;
        default:
          throw Error("Config entry "+item[0]+" does not exist")
      }
    })
  }
}
