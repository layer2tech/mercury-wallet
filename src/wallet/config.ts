// History is a log of all Mercury protocol actions taken by the wallet.

"use strict";
import { Network } from "bitcoinjs-lib/types/networks";
import WrappedLogger from "../wrapped_logger";
import { ElectrumClientConfig } from "./electrum";

const NETWORK_CONFIG = require("../network.json");
const bitcoin = require("bitcoinjs-lib");
import { callGetNetwork, getNetworkType } from "../features/WalletDataSlice";

// Node friendly importing required for Jest tests.
declare const window: any;

// Logger import.
export let log = new WrappedLogger();

let cloneDeep = require("lodash.clonedeep");
export const TestingWithJest = () => {
  return process.env.JEST_WORKER_ID !== undefined;
};

export const defaultWalletConfig = async () => {
  let networkType = getNetworkType();
  networkType = networkType === undefined ? "tor" : networkType.toLowerCase();
  let loadedWalletNetwork = callGetNetwork();

  if (loadedWalletNetwork === bitcoin.networks.testnet) {
    console.log("use testnet network settings");
    return {
      network: bitcoin.networks.testnet,
      notifications: false,
      singleSwapMode: false,
      tutorials: false,
      state_entity_endpoint:
        NETWORK_CONFIG[networkType].testnet_state_entity_endpoint,
      swap_conductor_endpoint:
        NETWORK_CONFIG[networkType].testnet_swap_conductor_endpoint,
      block_explorer_endpoint:
        NETWORK_CONFIG[networkType].testnet_block_explorer_endpoint,
      electrum_config: process.env.TESTNET_ELECTRUM_CONFIG
        ? process.env.TESTNET_ELECTRUM_CONFIG
        : NETWORK_CONFIG[networkType].testnet_electrum_config,
      tor_proxy: NETWORK_CONFIG[networkType].proxy,
      min_anon_set: "",
    };
  } else if (loadedWalletNetwork === bitcoin.networks.regtest) {
    console.log("use regtest network settings");
    return {
      network: bitcoin.networks.regtest,
      notifications: false,
      singleSwapMode: false,
      tutorials: false,
      state_entity_endpoint:
        NETWORK_CONFIG[networkType].regtest_state_entity_endpoint,
      swap_conductor_endpoint:
        NETWORK_CONFIG[networkType].regtest_swap_conductor_endpoint,
      block_explorer_endpoint:
        NETWORK_CONFIG[networkType].regtest_block_explorer_endpoint,
      electrum_config: process.env.REGTEST_ELECTRUM_CONFIG
        ? process.env.REGTEST_ELECTRUM_CONFIG
        : NETWORK_CONFIG[networkType].regtest_electrum_config,
      tor_proxy: NETWORK_CONFIG[networkType].proxy,
      min_anon_set: "",
    };
  } else if (loadedWalletNetwork === bitcoin.networks.bitcoin) {
    console.log("use mainnet network settings");
    return {
      network: bitcoin.networks.bitcoin,
      notifications: false,
      singleSwapMode: false,
      tutorials: false,
      state_entity_endpoint:
        NETWORK_CONFIG[networkType].mainnet_state_entity_endpoint,
      swap_conductor_endpoint:
        NETWORK_CONFIG[networkType].mainnet_swap_conductor_endpoint,
      block_explorer_endpoint:
        NETWORK_CONFIG[networkType].mainnet_block_explorer_endpoint,
      electrum_config: process.env.MAINNET_ELECTRUM_CONFIG
        ? process.env.MAINNET_ELECTRUM_CONFIG
        : NETWORK_CONFIG[networkType].mainnet_electrum_config,
      tor_proxy: NETWORK_CONFIG[networkType].proxy,
      min_anon_set: "",
    };
  } else {
    console.log("no network was loaded, is wallet loaded?");
  }
};

export class Config {
  // Set at startup only
  network: Network;
  testing_mode: boolean;
  jest_testing_mode: boolean;
  required_confirmations: number;
  electrum_fee_estimation_blocks: number;
  swap_amounts: Array<number>;

  // Editable while wallet running from Settings page
  state_entity_endpoint: string;
  swap_conductor_endpoint: string;
  electrum_config: ElectrumClientConfig;
  block_explorer_endpoint: string;

  tor_proxy: {
    ip: string;
    port: number;
    controlPassword: string;
    controlPort: number;
  };

  min_anon_set: number;
  date_format: any;
  notifications: boolean;
  singleSwapMode: boolean;
  tutorials: boolean;
  swaplimit: number;

  constructor(network: Network, networkType: String, testing_mode: boolean) {
    this.network = network;
    this.testing_mode = testing_mode;
    this.jest_testing_mode = false;
    this.required_confirmations = 3;
    this.electrum_fee_estimation_blocks = 6;
    this.swap_amounts = [
      100000, 500000, 1000000, 5000000, 10000000, 50000000, 100000000,
    ];

    const networkTypeLcase = networkType.toLowerCase();

    //Mainnet or testnet urls
    if (this.network === bitcoin.networks.bitcoin) {
      this.state_entity_endpoint =
        NETWORK_CONFIG[networkTypeLcase].mainnet_state_entity_endpoint;
      this.swap_conductor_endpoint =
        NETWORK_CONFIG[networkTypeLcase].mainnet_swap_conductor_endpoint;
      this.electrum_config =
        NETWORK_CONFIG[networkTypeLcase].mainnet_electrum_config;
      this.block_explorer_endpoint =
        NETWORK_CONFIG[networkTypeLcase].mainnet_block_explorer_endpoint;
    } else if (this.network === bitcoin.networks.regtest) {
      this.state_entity_endpoint =
        NETWORK_CONFIG[networkTypeLcase].regtest_state_entity_endpoint;
      this.swap_conductor_endpoint =
        NETWORK_CONFIG[networkTypeLcase].regtest_swap_conductor_endpoint;
      this.electrum_config =
        NETWORK_CONFIG[networkTypeLcase].regtest_electrum_config;
      this.block_explorer_endpoint =
        NETWORK_CONFIG[networkTypeLcase].regtest_block_explorer_endpoint;
    } else if (this.network === bitcoin.networks.testnet) {
      this.state_entity_endpoint =
        NETWORK_CONFIG[networkTypeLcase].testnet_state_entity_endpoint;
      this.swap_conductor_endpoint =
        NETWORK_CONFIG[networkTypeLcase].testnet_swap_conductor_endpoint;
      this.electrum_config =
        NETWORK_CONFIG[networkTypeLcase].testnet_electrum_config;
      this.block_explorer_endpoint =
        NETWORK_CONFIG[networkTypeLcase].testnet_block_explorer_endpoint;
    } else {
      this.state_entity_endpoint =
        NETWORK_CONFIG[networkTypeLcase].mainnet_state_entity_endpoint;
      this.swap_conductor_endpoint =
        NETWORK_CONFIG[networkTypeLcase].mainnet_swap_conductor_endpoint;
      this.electrum_config =
        NETWORK_CONFIG[networkTypeLcase].mainnet_electrum_config;
      this.block_explorer_endpoint =
        NETWORK_CONFIG[networkTypeLcase].mainnet_block_explorer_endpoint;
    }

    this.tor_proxy = NETWORK_CONFIG[networkTypeLcase].proxy;

    this.min_anon_set = 5;
    this.notifications = true;
    this.singleSwapMode = false;
    this.tutorials = false;
    this.swaplimit = 1440;

    this.update(require("../settings.json"));
    if (TestingWithJest()) {
      this.update(defaultWalletConfig());
    }
  }

  getConfig() {
    return cloneDeep(this);
  }

  // update by providing JSONObject with new values
  update(config_changes: object): boolean {
    let connectionChanged = false;
    Object.entries(config_changes).forEach((item) => {
      switch (item[0]) {
        case "date_format":
          this.date_format = item[1];
          break;
        case "network":
          this.network = item[1];
          break;
        case "testing_mode":
          this.testing_mode = item[1];
          break;
        case "jest_testing_mode":
          this.jest_testing_mode = item[1];
          break;
        case "required_confirmations":
          this.required_confirmations = item[1];
          break;
        case "electrum_fee_estimation_blocks":
          this.electrum_fee_estimation_blocks = item[1];
          break;
        case "swap_amounts":
          this.swap_amounts = item[1];
          break;
        case "state_entity_endpoint":
          connectionChanged = checkDiff(
            connectionChanged,
            this.state_entity_endpoint,
            item[1]
          );
          this.state_entity_endpoint = item[1];
          break;
        case "swap_conductor_endpoint":
          connectionChanged = checkDiff(
            connectionChanged,
            this.swap_conductor_endpoint,
            item[1]
          );
          this.swap_conductor_endpoint = item[1];
          break;
        case "electrum_config":
          Object.entries(item[1]).forEach((ec_item: [string, any]) => {
            switch (ec_item[0]) {
              case "protocol":
                connectionChanged = checkDiff(
                  connectionChanged,
                  this.electrum_config.protocol,
                  ec_item[1]
                );
                this.electrum_config.protocol = ec_item[1];
                break;
              case "host":
                connectionChanged = checkDiff(
                  connectionChanged,
                  this.electrum_config.host,
                  ec_item[1]
                );
                this.electrum_config.host = ec_item[1];
                break;
              case "port":
                connectionChanged = checkDiff(
                  connectionChanged,
                  this.electrum_config.port,
                  ec_item[1]
                );
                this.electrum_config.port = ec_item[1];
                break;
              case "type":
                connectionChanged = checkDiff(
                  connectionChanged,
                  this.electrum_config.type,
                  ec_item[1]
                );
                this.electrum_config.type = ec_item[1];
                break;
            }
          });
          break;
        case "block_explorer_endpoint":
          connectionChanged = checkDiff(
            connectionChanged,
            this.block_explorer_endpoint,
            item[1]
          );
          this.block_explorer_endpoint = item[1];
          break;
        case "tor_proxy":
          Object.entries(item[1]).forEach((tp_item) => {
            switch (tp_item[0]) {
              case "ip":
                connectionChanged = checkDiff(
                  connectionChanged,
                  this.tor_proxy.ip,
                  tp_item[1]
                );
                this.tor_proxy.ip = tp_item[1] as string;
                break;
              case "port":
                connectionChanged = checkDiff(
                  connectionChanged,
                  this.tor_proxy.port,
                  tp_item[1]
                );
                this.tor_proxy.port = tp_item[1] as number;
                break;
              case "controlPassword":
                connectionChanged = checkDiff(
                  connectionChanged,
                  this.tor_proxy.controlPassword,
                  tp_item[1]
                );
                this.tor_proxy.controlPassword = tp_item[1] as string;
                break;
              case "controlPort":
                connectionChanged = checkDiff(
                  connectionChanged,
                  this.tor_proxy.controlPort,
                  tp_item[1]
                );
                this.tor_proxy.controlPort = tp_item[1] as number;
                break;
              default:
                throw Error(
                  "Config tor_proxy entry " + tp_item[0] + " does not exist"
                );
            }
          });
          break;
        case "min_anon_set":
          this.min_anon_set = item[1];
          break;
        case "notifications":
          this.notifications = item[1];
          break;
        case "singleSwapMode":
          this.singleSwapMode = item[1];
          break;
        case "tutorials":
          this.tutorials = item[1];
          break;
        case "swaplimit":
          this.swaplimit = item[1];
          break;
        default:
          log.warn("Config entry " + item[0] + " does not exist");
      }
    });
    return connectionChanged;
  }
}

const checkDiff = (sticky_bool: boolean, var1: any, var2: any) => {
  if (sticky_bool !== true) {
    if (var1 != var2) {
      sticky_bool = true;
    }
  }
  return sticky_bool;
};
