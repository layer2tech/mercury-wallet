// History is a log of all Mercury protocol actions taken by the wallet.

import { Network } from "bitcoinjs-lib/types/networks";
import { ElectrumClientConfig } from "./electrum";
const NETWORK_CONFIG = require('../network.json');
const bitcoin = require('bitcoinjs-lib')

// Node friendly importing required for Jest tests.
declare const window: any;

// Logger import.
let log: any;
try {
  log = window.require('electron-log');
} catch (e: any) {
  log = require('electron-log');
}



let cloneDeep = require('lodash.clonedeep');
let current_state_entity_endpoint = NETWORK_CONFIG.mainnet_state_entity_endpoint;
let current_block_explorer_endpoint = NETWORK_CONFIG.mainnet_block_explorer_endpoint;
let current_electrum_config: ElectrumClientConfig = NETWORK_CONFIG.mainnet_electrum_config;

const argsHasTestnet = () => {
  let found  = false;
  let remote: any
  try {
    remote = window.require('electron').remote
  } catch (e:any) {
    remote = require('electron').remote
  }
  if (remote) {
    remote.process.argv.forEach((arg: string) =>  {
      if(arg.includes('testnet')){
          found = true;
      }     
    });
  }
  return found;
}

// check values of arguments
if(argsHasTestnet()){
  current_state_entity_endpoint =  NETWORK_CONFIG.testnet_state_entity_endpoint;
  current_block_explorer_endpoint  = NETWORK_CONFIG.testnet_block_explorer_endpoint;
  current_electrum_config = NETWORK_CONFIG.testnet_electrum_config;
}

export class Config {
  // Set at startup only
  network: Network;
  testing_mode: boolean;
  jest_testing_mode: boolean;
  required_confirmations: number;
  electrum_fee_estimation_blocks: number;

  // Editable while wallet running from Settings page
  state_entity_endpoint: string;
  swap_conductor_endpoint: string ;
  electrum_config: ElectrumClientConfig;
  block_explorer_endpoint:string;

  tor_proxy: {
    ip: string,
    port: number,
    controlPassword: string,
    controlPort: number,
  };

  min_anon_set: number;
  date_format: any;
  notifications: boolean;
  singleSwapMode: boolean;
  tutorials: boolean;
  swaplimit: number;

  constructor(network: Network, testing_mode: boolean) {
    this.network = network;
    this.testing_mode = testing_mode;
    this.jest_testing_mode = false;
    this.required_confirmations = 3;
    this.electrum_fee_estimation_blocks = 6;

    this.state_entity_endpoint = current_state_entity_endpoint;
    this.swap_conductor_endpoint = current_state_entity_endpoint;
    this.electrum_config = current_electrum_config;
    this.block_explorer_endpoint = current_block_explorer_endpoint;

    this.tor_proxy = {
      ip: 'localhost',
      port: 9060,
      controlPassword: '',
      controlPort: 9061
    };

    this.min_anon_set = 5;
    this.notifications = true;
    this.singleSwapMode = false;
    this.tutorials = false;
    this.swaplimit = 1440;
 
    
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
        case "state_entity_endpoint":
          this.state_entity_endpoint = item[1];
          break;
        case "swap_conductor_endpoint":
          this.swap_conductor_endpoint = item[1];
          break;
        case "electrum_config":
          this.electrum_config = item[1];
          break;
        case "block_explorer_endpoint":
          this.block_explorer_endpoint = item[1];
          break;
        case "tor_proxy":
          Object.entries(item[1]).forEach((tp_item) => {
              switch(tp_item[0]){
                case "ip":
                    this.tor_proxy.ip = tp_item[1] as string;
                    break;
                case "port":
                    this.tor_proxy.port = tp_item[1] as number ;
                    break;
                case "controlPassword":
                    this.tor_proxy.controlPassword = tp_item[1] as string;
                    break;
                case "controlPort":
                    this.tor_proxy.controlPort = tp_item[1] as number;
                    break;
                default: 
                  throw Error("Config tor_proxy entry "+tp_item[0]+" does not exist")
            }
          });
          break;
        case "min_anon_set":
          this.min_anon_set = item[1];
          break;
        case "notifications":
          this.notifications = item[1]
          break;
        case "singleSwapMode":
          this.singleSwapMode = item[1]
          break;
        case "tutorials":
          this.tutorials = item[1]
          break;
        case "swaplimit":
          this.swaplimit = item[1]
          break;          
        default:
          log.warn("Config entry "+item[0]+" does not exist")
      }
    })
  }
}
